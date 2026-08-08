module.exports = function registerEvent(ctx) {
    with (ctx) {
client.on('warn', info => console.warn('⚠️ Discord warn:', info));
client.on('error', error => console.error('❌ Discord client error:', error));
client.on('shardError', error => console.error('❌ Discord shard error:', error));
client.on('shardReady', id => console.log(`✅ Discord shard ${id} ready`));
client.on('shardDisconnect', (event, id) => console.warn(`⚠️ Discord shard ${id} disconnected:`, event?.code, event?.reason));
client.on('shardReconnecting', id => console.log(`🔄 Discord shard ${id} reconnecting...`));
client.on('invalidated', () => console.error('❌ Discord session invalidated.'));
    }
};