const registerReady = require('./events/ready');
const registerMessageCreate = require('./events/messageCreate');
const registerInteractionCreate = require('./events/interactionCreate');
const registerClientDiagnostics = require('./events/clientDiagnostics');

module.exports = function registerEvents(ctx) {
    [
        registerReady,
        registerMessageCreate,
        registerInteractionCreate,
        registerClientDiagnostics
    ].forEach(register => register(ctx));
};