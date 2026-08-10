const assert = require('node:assert/strict');
const test = require('node:test');

const registerShared = require('../src/shared');
const registerDailyTasks = require('../src/features/dailyTasks');
const { MemoryCollection, createBaseCtx } = require('./helpers');

function registerDailyTasksCtx(overrides = {}) {
    const ctx = createBaseCtx({
        dailyTasksPool: new MemoryCollection(),
        dailyTaskSettings: new MemoryCollection(),
        dailyTaskSubmissions: new MemoryCollection(),
        pendingDailyTaskUploads: new Map(),
        updateLotteryPanels: async () => {},
        updateDailyTasksPanel: async () => {},
        logAction: async () => {},
        client: {
            channels: {
                fetch: async () => ({ send: async () => ({ id: 'message-id' }) })
            },
            users: {
                fetch: async () => ({ send: async () => {} })
            }
        },
        DAILY_TASKS_REVIEW_CHANNEL_ID: 'daily-review',
        RANK_9_ROLE_ID: 'rank9',
        RANK_10_ROLE_ID: 'rank10',
        ObjectId: value => value,
        ...overrides
    });
    registerShared(ctx);
    registerDailyTasks(ctx);
    return ctx;
}

test('daily task difficulty helpers keep rewards and button ids stable', () => {
    const ctx = registerDailyTasksCtx();

    assert.equal(ctx.getDifficultyReward('easy'), 1);
    assert.equal(ctx.getDifficultyReward('medium'), 2);
    assert.equal(ctx.getDifficultyReward('hard'), 3);
    assert.equal(ctx.getDifficultyReward('unknown'), 1);
    assert.equal(ctx.getDailyTaskButtonId('hard'), 'daily_task_submit:hard');
    assert.match(ctx.getDifficultyLabel('medium'), /medium|Середнє/);
});

test('getOrCreateDailySettings creates fallback tasks when pool is empty', async () => {
    const ctx = registerDailyTasksCtx();

    const settings = await ctx.getOrCreateDailySettings(true);

    assert.equal(settings.name, 'daily_tasks');
    assert.equal(settings.currentDate, ctx.getKyivDate());
    assert.deepEqual(Object.keys(settings.activeTasks), ['easy', 'medium', 'hard']);
    assert.equal(settings.activeTasks.easy.rewardTickets, 1);
    assert.equal(settings.activeTasks.medium.rewardTickets, 2);
    assert.equal(settings.activeTasks.hard.rewardTickets, 3);
    assert.equal(settings.activeTasks.hard.key, 'fallback_hard');
});

test('getDailyTaskStats counts approved and pending submissions by difficulty', async () => {
    const ctx = registerDailyTasksCtx({
        dailyTaskSubmissions: new MemoryCollection([
            { date: '2026-08-08', status: 'approved', difficulty: 'easy' },
            { date: '2026-08-08', status: 'approved', difficulty: 'hard' },
            { date: '2026-08-08', status: 'pending', difficulty: 'medium' },
            { date: '2026-08-07', status: 'approved', difficulty: 'easy' },
            { date: '2026-08-08', status: 'rejected', difficulty: 'easy' }
        ])
    });

    const stats = await ctx.getDailyTaskStats('2026-08-08');

    assert.equal(stats.approvedTotal, 2);
    assert.equal(stats.pendingTotal, 1);
    assert.deepEqual(stats.approvedByDifficulty, {
        easy: 1,
        medium: 0,
        hard: 1
    });
});
