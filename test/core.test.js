const assert = require('node:assert/strict');
const test = require('node:test');

const registerShared = require('../src/shared');
const registerCore = require('../src/features/core');
const { createBaseCtx, createMember } = require('./helpers');

function registerCoreCtx(overrides = {}) {
    const ctx = createBaseCtx({
        COOLDOWN_MS: 10000,
        isBotLocked: async () => false,
        client: { channels: { fetch: async () => null } },
        ...overrides
    });
    registerShared(ctx);
    registerCore(ctx);
    return ctx;
}

function createCommandInteraction({ commandName, channelId = 'bank-channel', member = createMember(['family']), userId = 'u1' }) {
    const calls = [];

    return {
        commandName,
        channelId,
        member,
        user: { id: userId },
        isChatInputCommand: () => true,
        reply: async payload => calls.push(payload),
        __replies: calls
    };
}

test('checkGlobalSecurity allows non-chat interactions through', async () => {
    const ctx = registerCoreCtx();

    assert.equal(await ctx.checkGlobalSecurity({ isChatInputCommand: () => false }), true);
});

test('checkGlobalSecurity blocks bank commands outside the bank channel', async () => {
    const ctx = registerCoreCtx();
    const interaction = createCommandInteraction({
        commandName: 'balance',
        channelId: 'general'
    });

    assert.equal(await ctx.checkGlobalSecurity(interaction), false);
    assert.equal(interaction.__replies[0].flags, ctx.MessageFlags.Ephemeral);
});

test('checkGlobalSecurity blocks locked bot commands except unlock_bot', async () => {
    const ctx = registerCoreCtx({ isBotLocked: async () => true });
    const blocked = createCommandInteraction({ commandName: 'balance' });
    const unlock = createCommandInteraction({ commandName: 'unlock_bot', member: createMember(['rank10']), userId: 'u2' });

    assert.equal(await ctx.checkGlobalSecurity(blocked), false);
    assert.equal(await ctx.checkGlobalSecurity(unlock), true);
});

test('checkGlobalSecurity applies per-user command cooldowns', async () => {
    const ctx = registerCoreCtx();
    const first = createCommandInteraction({ commandName: 'quest_status', channelId: 'quest-channel' });
    const second = createCommandInteraction({ commandName: 'quest_status', channelId: 'quest-channel' });

    assert.equal(await ctx.checkGlobalSecurity(first), true);
    assert.equal(await ctx.checkGlobalSecurity(second), false);
    assert.equal(second.__replies[0].flags, ctx.MessageFlags.Ephemeral);
});
