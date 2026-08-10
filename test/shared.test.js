const assert = require('node:assert/strict');
const test = require('node:test');

const registerShared = require('../src/shared');
const { createBaseCtx, createMember } = require('./helpers');

test('shared helpers format money, quest keys and role access', () => {
    const ctx = createBaseCtx();
    registerShared(ctx);

    assert.equal(ctx.formatMoney(1234567), '$1,234,567');
    assert.equal(ctx.formatMoney('2500'), '$2,500');
    assert.equal(ctx.makeQuestKey('  Big Quest: №42!!!  '), 'big_quest_42');

    assert.equal(ctx.hasReviewAccess(createMember(['rank9'])), true);
    assert.equal(ctx.hasReviewAccess(createMember(['family'])), false);
    assert.equal(ctx.hasFamilyAccess(createMember(['family'])), true);
    assert.equal(ctx.hasLeaderAccess(createMember(['rank10'])), true);
});

test('shared command classifiers protect restricted command groups', () => {
    const ctx = createBaseCtx();
    registerShared(ctx);

    assert.equal(ctx.isBankCommand('total_plus'), true);
    assert.equal(ctx.isBankCommand('quests'), false);
    assert.equal(ctx.isQuestCommand('quest_repair'), true);
    assert.equal(ctx.isQuestCommand('quest_delete'), true);
    assert.equal(ctx.isStaffCommand('quest_add'), true);
    assert.equal(ctx.isStaffCommand('quest_delete'), true);
    assert.equal(ctx.isFamilyCommand('quest_status'), true);
    assert.equal(ctx.isFamilyCommand('lock_bot'), false);
});

test('bank category select exposes all configured category values', () => {
    const ctx = createBaseCtx();
    registerShared(ctx);

    const [select] = ctx.createBankCategorySelect('plus').components;
    assert.equal(select.data.customId, 'bank_category:plus');
    assert.deepEqual(
        select.data.options.map(option => option.value),
        Object.keys(ctx.BANK_PLUS_CATEGORIES)
    );

    assert.equal(ctx.getBankCategoryLabel('minus', 'unknown'), ctx.BANK_MINUS_CATEGORIES.other);
});
