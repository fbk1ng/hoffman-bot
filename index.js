const discord = require('discord.js');
const {
    Client,
    GatewayIntentBits,
    SlashCommandBuilder,
    Routes,
    REST,
    EmbedBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
    InteractionType,
    Events,
    MessageFlags,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder,
    Partials
} = discord;
const { MongoClient, ObjectId } = require('mongodb');
const http = require('http');

const registerConfig = require('./src/config');
const registerShared = require('./src/shared');
const registerDatabase = require('./src/db');
const registerFinance = require('./src/features/finance');
const registerPersonnel = require('./src/features/personnel');
const registerCareer = require('./src/features/career');
const registerCore = require('./src/features/core');
const registerApplications = require('./src/features/applications');
const registerQuests = require('./src/features/quests');
const registerBirthdays = require('./src/features/birthdays');
const registerLottery = require('./src/features/lottery');
const registerDailyTasks = require('./src/features/dailyTasks');
const registerCommands = require('./src/commands');
const registerEvents = require('./src/events');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.MessageContent
    ],
    partials: [Partials.Channel]
});

const ctx = {
    ...discord,
    Client,
    GatewayIntentBits,
    SlashCommandBuilder,
    Routes,
    REST,
    EmbedBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
    InteractionType,
    Events,
    MessageFlags,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder,
    Partials,
    MongoClient,
    ObjectId,
    http,
    client,

    balances: undefined,
    dailyStats: undefined,
    botSettings: undefined,
    questDefinitions: undefined,
    questStates: undefined,
    birthdays: undefined,
    lotteryTickets: undefined,
    lotterySettings: undefined,
    lotteryHistory: undefined,
    dailyTasksPool: undefined,
    dailyTaskSubmissions: undefined,
    dailyTaskSettings: undefined,
    bankOperations: undefined,
    personnelActions: undefined,
    careerApplications: undefined,

    commandCooldowns: new Map(),
    pendingWithdrawals: new Map(),
    pendingDailyTaskUploads: new Map(),
    questProcessingLocks: new Set()
};

[
    registerConfig,
    registerShared,
    registerDatabase,
    registerFinance,
    registerPersonnel,
    registerCareer,
    registerCore,
    registerApplications,
    registerQuests,
    registerBirthdays,
    registerLottery,
    registerDailyTasks,
    registerCommands,
    registerEvents
].forEach(register => register(ctx));

const { TOKEN, MONGODB_URI } = ctx;

process.on('unhandledRejection', error => {
    console.error('❌ Unhandled Promise Rejection:', error);
});

process.on('uncaughtException', error => {
    console.error('❌ Uncaught Exception:', error);
});

const cleanToken = TOKEN?.trim();

console.log('🔍 TOKEN:', cleanToken ? 'є' : 'НЕМАЄ');
console.log('🔍 MONGODB_URI:', MONGODB_URI ? 'є' : 'НЕМАЄ');

if (!cleanToken) {
    console.error('❌ TOKEN не знайдено в Environment Variables.');
} else {
    console.log('🔍 Запускаю Discord login...');

    const loginTimeout = setTimeout(() => {
        console.error('⏳ Discord login не завершився за 60 секунд. Це означає, що процес завис на підключенні до Discord Gateway.');
    }, 60000);

client.login(cleanToken)
    .then(() => {
        clearTimeout(loginTimeout);
        console.log('✅ Discord login успішно завершено.');
    })
    .catch(error => {
        clearTimeout(loginTimeout);
        console.error('❌ Помилка Discord login:', error);
    });
}

http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Bot is running');
}).listen(process.env.PORT || 3000, () => {
    console.log('Web server запущений для хостингу');
});