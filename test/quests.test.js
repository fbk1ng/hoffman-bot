const assert = require('node:assert/strict');
const test = require('node:test');

const registerShared = require('../src/shared');
const registerQuests = require('../src/features/quests');
const { MemoryCollection, createBaseCtx, createMember } = require('./helpers');

function registerQuestsCtx(overrides = {}) {
    const calls = {
        balanceChanges: [],
        dailyStats: [],
        bankOperations: [],
        lotteryAwards: [],
        logActions: [],
        messageEdits: []
    };

    const ctx = createBaseCtx({
        questDefinitions: new MemoryCollection([
            { key: 'delivery', name: 'Delivery Run', reward: 1000, cooldownHours: 2 }
        ]),
        questStates: new MemoryCollection([
            {
                key: 'delivery',
                status: 'running',
                activeUserId: 'starter',
                activeUserName: 'Starter',
                messageId: 'quest-message',
                participants: [
                    { id: 'starter', mention: '<@starter>', name: 'Starter' },
                    { id: 'helper', mention: '<@helper>', name: 'Helper' }
                ],
                startedAt: 12345
            }
        ]),
        getBalance: async () => 5000,
        changeBalance: async amount => {
            calls.balanceChanges.push(amount);
            return 5000 + amount;
        },
        addDailyStat: async (type, amount) => calls.dailyStats.push({ type, amount }),
        recordBankOperation: async operation => calls.bankOperations.push(operation),
        addLotteryTicketsForQuest: async (participants, questName) => calls.lotteryAwards.push({ participants, questName }),
        updateFinanceCrmPanel: async () => {},
        logAction: async (...args) => calls.logActions.push(args),
        client: { channels: { fetch: async () => null } },
        __calls: calls,
        ...overrides
    });

    registerShared(ctx);
    registerQuests(ctx);
    return ctx;
}

function createQuestInteraction({ customId = 'quest_finish:delivery:starter', userId = 'starter', messageId = 'quest-message' } = {}) {
    const calls = {
        replies: [],
        followUps: [],
        edits: [],
        deferred: 0
    };

    return {
        id: `interaction-${Math.random()}`,
        customId,
        user: { id: userId, username: userId },
        member: createMember([]),
        message: {
            id: messageId,
            edit: async payload => calls.edits.push(payload)
        },
        deferUpdate: async () => {
            calls.deferred++;
        },
        reply: async payload => calls.replies.push(payload),
        followUp: async payload => calls.followUps.push(payload),
        __calls: calls
    };
}

function createQuestDeleteInteraction({ quest = 'delivery', userId = 'reviewer' } = {}) {
    const calls = {
        replies: [],
        edits: [],
        deferred: 0
    };

    return {
        options: {
            getString: name => name === 'quest' ? quest : null
        },
        user: { id: userId, username: userId },
        member: createMember(['rank9']),
        deferReply: async () => {
            calls.deferred++;
        },
        reply: async payload => calls.replies.push(payload),
        editReply: async payload => calls.edits.push(payload),
        __calls: calls
    };
}

test('completeOrCancelQuest completes a running quest once and stores cooldown state', async () => {
    const ctx = registerQuestsCtx();
    const interaction = createQuestInteraction();

    await ctx.completeOrCancelQuest(interaction, true);

    const state = await ctx.questStates.findOne({ key: 'delivery' });
    assert.equal(state.status, 'cooldown');
    assert.equal(state.completed, true);
    assert.equal(state.processedBy, 'starter');
    assert.equal(ctx.__calls.balanceChanges.length, 1);
    assert.deepEqual(ctx.__calls.balanceChanges, [1000]);
    assert.deepEqual(ctx.__calls.dailyStats, [{ type: 'plus', amount: 1000 }]);
    assert.equal(ctx.__calls.bankOperations[0].operationKey, 'quest:delivery:12345');
    assert.equal(ctx.__calls.lotteryAwards[0].participants.length, 2);
    assert.equal(interaction.__calls.deferred, 1);
    assert.equal(interaction.__calls.edits.length, 1);
});

test('completeOrCancelQuest ignores duplicate clicks after cooldown without double reward', async () => {
    const ctx = registerQuestsCtx();

    await ctx.completeOrCancelQuest(createQuestInteraction({ userId: 'starter' }), true);
    await ctx.completeOrCancelQuest(createQuestInteraction({ userId: 'starter' }), true);

    assert.deepEqual(ctx.__calls.balanceChanges, [1000]);
    assert.equal(ctx.__calls.bankOperations.length, 1);
    assert.equal(ctx.__calls.lotteryAwards.length, 1);
});

test('completeOrCancelQuest denies users who are neither starter nor reviewer', async () => {
    const ctx = registerQuestsCtx();
    const interaction = createQuestInteraction({ userId: 'other' });

    await ctx.completeOrCancelQuest(interaction, true);

    assert.equal(ctx.__calls.balanceChanges.length, 0);
    assert.equal(interaction.__calls.replies.length, 1);
    assert.equal(interaction.__calls.replies[0].flags, ctx.MessageFlags.Ephemeral);
    assert.match(interaction.__calls.replies[0].content, /\S/);
});

test('deleteQuest removes an available quest definition and state', async () => {
    const ctx = registerQuestsCtx({
        questStates: new MemoryCollection([
            { key: 'delivery', status: 'available', cooldownUntil: null }
        ])
    });
    const interaction = createQuestDeleteInteraction();

    await ctx.deleteQuest(interaction);

    assert.equal(await ctx.questDefinitions.findOne({ key: 'delivery' }), null);
    assert.equal(await ctx.questStates.findOne({ key: 'delivery' }), null);
    assert.equal(ctx.__calls.logActions.length, 1);
    assert.equal(interaction.__calls.deferred, 1);
    assert.match(interaction.__calls.edits[0].content, /видалено/);
});

test('deleteQuest refuses to remove a running quest', async () => {
    const ctx = registerQuestsCtx();
    const interaction = createQuestDeleteInteraction();

    await ctx.deleteQuest(interaction);

    assert.ok(await ctx.questDefinitions.findOne({ key: 'delivery' }));
    assert.equal((await ctx.questStates.findOne({ key: 'delivery' })).status, 'running');
    assert.match(interaction.__calls.edits[0].content, /running/);
});
