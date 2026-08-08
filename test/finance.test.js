const assert = require('node:assert/strict');
const test = require('node:test');

const registerShared = require('../src/shared');
const registerFinance = require('../src/features/finance');
const { MemoryCollection, createBaseCtx } = require('./helpers');

function registerFinanceCtx(overrides = {}) {
    const ctx = createBaseCtx({
        getBalance: async () => 775000,
        ...overrides
    });
    registerShared(ctx);
    registerFinance(ctx);
    return ctx;
}

test('getKyivWeekRange returns the Monday-Sunday Kyiv week for a fixed timestamp', () => {
    const ctx = registerFinanceCtx();
    const range = ctx.getKyivWeekRange(Date.UTC(2026, 7, 8, 12));

    assert.equal(range.startText, '03.08.2026');
    assert.equal(range.endText, '09.08.2026');
    assert.equal(range.end - range.start, 7 * 24 * 60 * 60 * 1000);
});

test('getFinanceWeeklyStats aggregates in-range bank operations by type and category', async () => {
    const fixedNow = Date.UTC(2026, 7, 8, 12);
    const previousDateNow = Date.now;

    try {
        Date.now = () => fixedNow;

        const ctx = registerFinanceCtx();
        const range = ctx.getKyivWeekRange(fixedNow);
        ctx.bankOperations = new MemoryCollection([
            { type: 'plus', amount: 1000, category: 'quest', createdAt: range.start + 100 },
            { type: 'plus', amount: 2500, category: 'donation', createdAt: range.start + 200 },
            { type: 'minus', amount: 700, category: 'salary', createdAt: range.start + 300 },
            { type: 'minus', amount: '300', category: '', createdAt: range.start + 400 },
            { type: 'plus', amount: 999999, category: 'other', createdAt: range.start - 1 },
            { type: 'minus', amount: 999999, category: 'other', createdAt: range.end }
        ]);

        const stats = await ctx.getFinanceWeeklyStats();

        assert.equal(stats.plus, 3500);
        assert.equal(stats.minus, 1000);
        assert.equal(stats.net, 2500);
        assert.equal(stats.plusCount, 2);
        assert.equal(stats.minusCount, 2);
        assert.deepEqual(stats.plusByCategory, { donation: 2500, quest: 1000 });
        assert.deepEqual(stats.minusByCategory, { other: 300, salary: 700 });
        assert.equal(stats.lastOperations.length, 4);
        assert.deepEqual(stats.lastOperations.map(row => row.createdAt), [
            range.start + 400,
            range.start + 300,
            range.start + 200,
            range.start + 100
        ]);
    } finally {
        Date.now = previousDateNow;
    }
});

test('finance report embeds include computed totals and category rows', async () => {
    const ctx = registerFinanceCtx({
        bankOperations: new MemoryCollection([])
    });

    const embed = await ctx.createFinanceWeeklyReportEmbed('Auditor');

    assert.equal(embed.data.color, ctx.HOFFMAN_RED);
    assert.match(embed.data.description, /Auditor/);
    assert.match(embed.data.description, /\$775,000/);
    assert.match(embed.data.description, /\$0/);
    assert.match(embed.data.description, new RegExp(Object.values(ctx.BANK_PLUS_CATEGORIES)[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
});
