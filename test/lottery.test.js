const assert = require('node:assert/strict');
const test = require('node:test');

const registerShared = require('../src/shared');
const registerLottery = require('../src/features/lottery');
const { MemoryCollection, createBaseCtx } = require('./helpers');

function registerLotteryCtx(overrides = {}) {
    const ctx = createBaseCtx({
        lotteryTickets: new MemoryCollection(),
        lotterySettings: new MemoryCollection(),
        lotteryHistory: new MemoryCollection(),
        logAction: async () => {},
        updateLotteryPanels: async () => {},
        getBalance: async () => 10000000,
        changeBalance: async amount => 10000000 + amount,
        addDailyStat: async () => {},
        recordBankOperation: async () => {},
        updateFinanceCrmPanel: async () => {},
        client: {
            channels: {
                fetch: async () => ({ send: async () => ({ id: 'message-id' }) })
            }
        },
        LOTTERY_CHANNEL_ID: 'lottery-channel',
        LOTTERY_CRM_CHANNEL_ID: 'lottery-crm',
        LOTTERY_RESULTS_CHANNEL_ID: 'lottery-results',
        ...overrides
    });
    registerShared(ctx);
    registerLottery(ctx);
    return ctx;
}

test('lottery date helpers derive Kyiv day parts and weekday without missing references', () => {
    const previousDate = Date;
    const fixed = new previousDate(Date.UTC(2026, 7, 9, 19, 0));

    class FixedDate extends previousDate {
        constructor(...args) {
            super(...(args.length ? args : [fixed.getTime()]));
        }

        static now() {
            return fixed.getTime();
        }
    }

    try {
        global.Date = FixedDate;
        const ctx = registerLotteryCtx();

        assert.deepEqual(ctx.getKyivDayMonthYear(), {
            day: '09',
            month: '08',
            year: '2026'
        });
        assert.equal(ctx.getKyivWeekdayNumber(), 0);
    } finally {
        global.Date = previousDate;
    }
});

test('quest participants are deduplicated and skip bot users', () => {
    const ctx = registerLotteryCtx();
    const interaction = {
        user: { id: 'u1', username: 'Starter' },
        member: { displayName: 'Starter Name' },
        options: {
            getUser: name => ({
                member1: { id: 'u2', username: 'Second', bot: false },
                member2: { id: 'u1', username: 'Starter duplicate', bot: false },
                member3: { id: 'bot', username: 'Bot', bot: true }
            })[name] || null,
            getMember: name => ({
                member1: { displayName: 'Second Name' }
            })[name] || null
        }
    };

    assert.deepEqual(ctx.getQuestParticipantsFromInteraction(interaction), [
        { id: 'u1', mention: '<@u1>', name: 'Starter Name' },
        { id: 'u2', mention: '<@u2>', name: 'Second Name' }
    ]);
});

test('lottery tickets increment weekly and total counters with history', async () => {
    const ctx = registerLotteryCtx();

    await ctx.addLotteryTicket('u1', 'User One', 'quest', 2);
    await ctx.addLotteryTicket('u1', 'User One', 'daily', 3);

    const row = await ctx.lotteryTickets.findOne({ userId: 'u1' });
    assert.equal(row.weeklyTickets, 5);
    assert.equal(row.totalTickets, 5);
    assert.deepEqual(row.history.map(item => item.source), ['quest', 'daily']);
});

test('quest lottery ticket multiplier is active only for the configured week', () => {
    const ctx = registerLotteryCtx();

    assert.equal(ctx.getQuestLotteryTicketMultiplier('2026-08-09'), 1);
    assert.equal(ctx.getQuestLotteryTicketMultiplier('2026-08-10'), 3);
    assert.equal(ctx.getQuestLotteryTicketMultiplier('2026-08-16'), 3);
    assert.equal(ctx.getQuestLotteryTicketMultiplier('2026-08-17'), 1);
});

test('quest lottery awards use the current multiplier per participant', async () => {
    const ctx = registerLotteryCtx();
    const previousDate = Date;
    const fixed = new previousDate(Date.UTC(2026, 7, 10, 12, 0));

    class FixedDate extends previousDate {
        constructor(...args) {
            super(...(args.length ? args : [fixed.getTime()]));
        }

        static now() {
            return fixed.getTime();
        }
    }

    try {
        global.Date = FixedDate;

        const result = await ctx.addLotteryTicketsForQuest([
            { id: 'u1', mention: '<@u1>', name: 'User One' },
            { id: 'u2', mention: '<@u2>', name: 'User Two' }
        ], 'Мисливський сезон');

        const first = await ctx.lotteryTickets.findOne({ userId: 'u1' });
        const second = await ctx.lotteryTickets.findOne({ userId: 'u2' });

        assert.deepEqual(result, { ticketsPerParticipant: 3, totalTickets: 6 });
        assert.equal(first.weeklyTickets, 3);
        assert.equal(second.weeklyTickets, 3);
        assert.equal(first.history[0].count, 3);
    } finally {
        global.Date = previousDate;
    }
});

test('lottery panel uses the configured weekly draw image', async () => {
    const ctx = registerLotteryCtx();

    const embed = await ctx.createLotteryPanelEmbed();

    assert.equal(
        embed.data.image,
        'https://cdn.discordapp.com/attachments/1510979053090242711/1536215391565520927/ChatGPT_Image_10_._2026_._06_31_10.png'
    );
});

test('pickWeightedWinner respects ticket weighting pool', () => {
    const ctx = registerLotteryCtx();
    const previousRandom = Math.random;

    try {
        Math.random = () => 0.99;
        const winner = ctx.pickWeightedWinner([
            { userId: 'one', weeklyTickets: 1 },
            { userId: 'two', weeklyTickets: 3 }
        ]);

        assert.equal(winner.userId, 'two');
    } finally {
        Math.random = previousRandom;
    }
});
