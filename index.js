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
} = require('discord.js');

const { MongoClient, ObjectId } = require('mongodb');
const http = require('http');

const TOKEN = process.env.TOKEN;
const MONGODB_URI = process.env.MONGODB_URI;
const REPORT_CHANNEL_ID = process.env.REPORT_CHANNEL_ID;
const QUEST_CHANNEL_ID = process.env.QUEST_CHANNEL_ID;
const BANK_CHANNEL_ID = process.env.BANK_CHANNEL_ID;
const LOG_CHANNEL_ID = process.env.LOG_CHANNEL_ID;

const BIRTHDAY_CHANNEL_ID = '1495990457904140428';
const BIRTHDAY_NEWS_CHANNEL_ID = '1495989840930672721';

const LOTTERY_CHANNEL_ID = '1513486880488816640';
const LOTTERY_RESULTS_CHANNEL_ID = '1515961352684830770';
const LOTTERY_CRM_CHANNEL_ID = '1513487657190166538';

const DAILY_TASKS_CHANNEL_ID = '1515963037306060881';
const DAILY_TASKS_REVIEW_CHANNEL_ID = '1515963471550746664';

const FINANCE_CRM_CHANNEL_ID = '1518883718561792093';
const FINANCE_REPORT_CHANNEL_ID = '1516042141665722421';

const PERSONNEL_CRM_CHANNEL_ID = '1518910316463919184';
const PERSONNEL_REPORT_CHANNEL_ID = '1516042141665722421';

const CAREER_PUBLIC_CHANNEL_ID = '1521157102142492813';
const CAREER_REVIEW_CHANNEL_ID = '1501498789188341851';
const CAREER_CRM_CHANNEL_ID = '1521158107294597140';
const CAREER_PANEL_IMAGE_URL = 'https://media.discordapp.net/attachments/1510979053090242711/1521154302788243607/ChatGPT_Image_29_._2026_._17_03_34.png?ex=6a43ccd7&is=6a427b57&hm=e3c41f9c3c817747ce0009e71d82e44ab71ba7824a50e8285028e55a2614488a&=&format=webp&quality=lossless&width=967&height=544';

const CLIENT_ID = '1501160094006771812';
const GUILD_ID = '1495987963887227031';

const APPLICATION_PUBLIC_CHANNEL_ID = '1495989924938383490';
const APPLICATION_REVIEW_CHANNEL_ID = '1501498789188341851';

const GUEST_ROLE_ID = '1496709652866666586';
const ACCEPTED_ROLE_ID = '1496709001356771429';
const RANK_9_ROLE_ID = '1495997440333971507';
const RANK_10_ROLE_ID = '1495997048669863966';

const REVIEW_ROLE_IDS = [RANK_9_ROLE_ID, RANK_10_ROLE_ID];
const FAMILY_ROLE_IDS = [ACCEPTED_ROLE_ID, RANK_9_ROLE_ID, RANK_10_ROLE_ID];

const COOLDOWN_MS = 10 * 1000;

// Hoffman visual style and Daily Tasks pool version.
// Increase DAILY_TASKS_POOL_VERSION whenever DEFAULT_DAILY_TASKS is changed.
const HOFFMAN_RED = 0x8B0000;
const HOFFMAN_GRAY = 0x4A4D52;
const DAILY_TASKS_POOL_VERSION = 2;

const DEFAULT_QUESTS = [
    { key: 'tovarnyi_vybukh', name: 'Товарний вибух', reward: 1000000, cooldownHours: 24 },
    { key: 'dopomoha_hromadianam', name: 'Допомога громадянам', reward: 1000000, cooldownHours: 24 },
    { key: 'myslyvskyi_sezon', name: 'Мисливський сезон', reward: 500000, cooldownHours: 24 }
];

const DEFAULT_DAILY_TASKS = [
    // Easy tasks — +1 ticket
    { key: 'easy_advertise_family', difficulty: 'easy', rewardTickets: 1, text: 'Зробити рекламу сімʼї будь-яким чином (оголошення у грі або на Discord-сервері Quant)' },
    { key: 'easy_invite_person', difficulty: 'easy', rewardTickets: 1, text: 'Виконати два рейси у компанії сімʼї (Hoffman LTD)' },
    { key: 'easy_help_member', difficulty: 'easy', rewardTickets: 1, text: 'Допомогти учаснику сімʼї виконати квест або БП' },
    { key: 'easy_repair_vehicle', difficulty: 'easy', rewardTickets: 1, text: 'Відремонтувати всі вузли на одному автомобілі' },
    { key: 'easy_chip_to_safe', difficulty: 'easy', rewardTickets: 1, text: 'Покласти одну із частин мікросхеми/мікросхему до сейфу сім`ї' },
    { key: 'easy_help_newbie_join', difficulty: 'easy', rewardTickets: 1, text: 'Допомогти новачку та запропонувати приєднатись до сімʼї' },
    { key: 'easy_family_screenshot', difficulty: 'easy', rewardTickets: 1, text: 'Зробити гарний скріншот із сімʼєю або членом сімʼї у грі' },
    { key: 'easy_join_activity', difficulty: 'easy', rewardTickets: 1, text: 'Взяти участь у будь-якій активності сімʼї' },
    { key: 'easy_complete_family_quest', difficulty: 'easy', rewardTickets: 1, text: 'Взяти участь у сімейному квесті' },
    { key: 'easy_evening_online', difficulty: 'easy', rewardTickets: 1, text: 'Виконати один рейс у компанії сімʼї (Hoffman LTD)' },
    { key: 'easy_house_photo', difficulty: 'easy', rewardTickets: 1, text: 'Зробити гарне фото на фоні сімейного будинку або подвірʼя і виставити його в галерею' },
    { key: 'easy_hug_member', difficulty: 'easy', rewardTickets: 1, text: 'Зробити вклад в сімʼю від 15.000$' },
    { key: 'easy_family_contribution_10k', difficulty: 'easy', rewardTickets: 1, text: 'Зробити вклад в сімʼю від 10.000$' },

    // Medium tasks — +2 tickets
    { key: 'medium_two_quests_day', difficulty: 'medium', rewardTickets: 2, text: 'Взяти участь у двох квестах за день' },
    { key: 'medium_help_recruitment', difficulty: 'medium', rewardTickets: 2, text: 'Допомогти провести набір у сімʼю' },
    { key: 'medium_active_recruit', difficulty: 'medium', rewardTickets: 2, text: 'Виконати пʼять рейсів у компанії сімʼї (Hoffman LTD)' },
    { key: 'medium_small_activity', difficulty: 'medium', rewardTickets: 2, text: 'Виконати сім рейсів у компанії сімʼї (Hoffman LTD)' },
    { key: 'medium_transport_logistics', difficulty: 'medium', rewardTickets: 2, text: 'Зробити дві реклами сімʼї будь-яким чином (оголошення у грі або на Discord-сервері Quant)' },
    { key: 'medium_two_hours_online', difficulty: 'medium', rewardTickets: 2, text: 'Провести мінімум 2 години онлайн із сімʼєю' },
    { key: 'medium_team_hard_quest', difficulty: 'medium', rewardTickets: 2, text: 'Допомогти виконати складний квест разом із сімʼєю' },
    { key: 'medium_ad_series', difficulty: 'medium', rewardTickets: 2, text: 'Зробити вклад в сімʼю від 40.000$' },
    { key: 'medium_family_contribution_20k', difficulty: 'medium', rewardTickets: 2, text: 'Зробити вклад в сімʼю від 20.000$' },
    { key: 'medium_group_trip', difficulty: 'medium', rewardTickets: 2, text: 'Організувати спільний виїзд або захід' },
    { key: 'medium_leadership_task', difficulty: 'medium', rewardTickets: 2, text: 'Виконати РП завдання від керівництва (писати 9-10 рангу)' },

    // Hard tasks — +3 tickets
    { key: 'hard_full_recruitment', difficulty: 'hard', rewardTickets: 3, text: 'Провести повноцінний набір у сімʼю через оголошення в новини: “Сім`я Hoffman шукає далеких родичів. Очікуємо біля будинку №347.”' },
    { key: 'hard_family_contribution_50k', difficulty: 'hard', rewardTickets: 3, text: 'Зробити вклад в сімʼю від 70.000$' },
    { key: 'hard_convoy_trip', difficulty: 'hard', rewardTickets: 3, text: 'Виконати 10 рейсів у компанії сімʼї (Hoffman LTD)' },
    { key: 'hard_multiple_quests', difficulty: 'hard', rewardTickets: 3, text: 'Виконати 15 рейсів у компанії сімʼї (Hoffman LTD)' },
    { key: 'hard_full_staff_activity', difficulty: 'hard', rewardTickets: 3, text: 'Провести вечірку на території будинку "На території будинку №347 проходить запальна вечірка. Запрошуємо всіх охочих!"' },
    { key: 'hard_important_help', difficulty: 'hard', rewardTickets: 3, text: 'Ти виграв щасливий білет! Просто натисни "Виконати" завдання і отримуй 3 квитки! Вітаю!' },
    { key: 'hard_big_rp_team', difficulty: 'hard', rewardTickets: 3, text: 'Заправити всі транспортні засоби сімʼї' },
    { key: 'hard_newbie_adaptation', difficulty: 'hard', rewardTickets: 3, text: 'Замовити до будинку 10 одиниць їжі одного виду (піца, бургери тощо)' },
    { key: 'hard_leadership_order', difficulty: 'hard', rewardTickets: 3, text: 'Зробити вклад в сімʼю від 100.000$' },
    { key: 'hard_evening_activity', difficulty: 'hard', rewardTickets: 3, text: 'Зробити дві реклами сімʼї будь-яким чином (оголошення у грі або на Discord-сервері Quant)' },
    { key: 'hard_complex_rp', difficulty: 'hard', rewardTickets: 3, text: 'Виконати 20 рейсів у компанії сімʼї (Hoffman LTD)' }
];

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.MessageContent
    ],
    partials: [Partials.Channel]
});

let balances;
let dailyStats;
let botSettings;
let questDefinitions;
let questStates;
let birthdays;
let lotteryTickets;
let lotterySettings;
let lotteryHistory;
let dailyTasksPool;
let dailyTaskSubmissions;
let dailyTaskSettings;
let bankOperations;
let personnelActions;
let careerApplications;

const commandCooldowns = new Map();
const pendingWithdrawals = new Map();
const pendingDailyTaskUploads = new Map();

// Extra local protection against repeated quest button clicks.
// MongoDB atomic claiming below remains the main protection.
const questProcessingLocks = new Set();

function formatMoney(amount) {
    return `$${Number(amount).toLocaleString('en-US')}`;
}

const BANK_PLUS_CATEGORIES = {
    family_income: '💼 Заробіток сімʼї',
    donation: '🤝 Добровільний внесок',
    quest: '🧩 Квест',
    daily_task: '📅 Daily Task',
    compensation: '🎁 Повернення / компенсація',
    other: '📦 Інше'
};

const BANK_MINUS_CATEGORIES = {
    salary: '💵 Зарплата',
    lottery: '🎰 Лотерея',
    supply: '📦 Забезпечення',
    transport: '🚗 Транспорт / ремонт',
    bonus: '🎁 Премія',
    other: '📦 Інше'
};

function getBankCategoryLabel(type, value) {
    const categories = type === 'plus' ? BANK_PLUS_CATEGORIES : BANK_MINUS_CATEGORIES;
    return categories[value] || '📦 Інше';
}

function createBankCategorySelect(type) {
    const isPlus = type === 'plus';
    const categories = isPlus ? BANK_PLUS_CATEGORIES : BANK_MINUS_CATEGORIES;

    return new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId(`bank_category:${type}`)
            .setPlaceholder(isPlus ? 'Оберіть категорію поповнення' : 'Оберіть категорію зняття')
            .addOptions(
                Object.entries(categories).map(([value, label]) => ({
                    label: label.replace(/^[^\s]+\s/, ''),
                    value,
                    emoji: label.split(' ')[0]
                }))
            )
    );
}

function getKyivDate() {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Europe/Kyiv',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).format(new Date());
}

function getKyivDateTime(timestamp) {
    return new Intl.DateTimeFormat('uk-UA', {
        timeZone: 'Europe/Kyiv',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    }).format(new Date(timestamp));
}

function getKyivTime() {
    const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Europe/Kyiv',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    }).formatToParts(new Date());

    return {
        hour: Number(parts.find(p => p.type === 'hour').value),
        minute: Number(parts.find(p => p.type === 'minute').value)
    };
}

function formatDuration(ms) {
    if (ms <= 0) return '00:00:00';

    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function makeQuestKey(name) {
    return name
        .toLowerCase()
        .trim()
        .replace(/[^\p{L}\p{N}]+/gu, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 40);
}

function hasRole(member, roleId) {
    return member?.roles?.cache?.has(roleId);
}

function hasReviewAccess(member) {
    return REVIEW_ROLE_IDS.some(roleId => hasRole(member, roleId));
}

function hasFamilyAccess(member) {
    return FAMILY_ROLE_IDS.some(roleId => hasRole(member, roleId));
}

function hasLeaderAccess(member) {
    return hasRole(member, RANK_10_ROLE_ID);
}

function isBankCommand(commandName) {
    return ['total_plus', 'total_minus', 'balance', 'report'].includes(commandName);
}

function isQuestCommand(commandName) {
    return ['quests', 'quest_status', 'quest_add'].includes(commandName);
}

function isStaffCommand(commandName) {
    return ['total_plus', 'total_minus', 'report', 'quest_add'].includes(commandName);
}

function isFamilyCommand(commandName) {
    return ['balance', 'quests', 'quest_status'].includes(commandName);
}

async function connectDB() {
    if (!MONGODB_URI) throw new Error('MONGODB_URI не доданий у Environment Variables');

    const mongo = new MongoClient(MONGODB_URI);
    await mongo.connect();

    const db = mongo.db('hoffman_bot');

    balances = db.collection('balances');
    dailyStats = db.collection('daily_stats');
    botSettings = db.collection('bot_settings');
    questDefinitions = db.collection('quest_definitions');
    questStates = db.collection('quest_states');
    birthdays = db.collection('birthdays');
    lotteryTickets = db.collection('lottery_tickets');
    lotterySettings = db.collection('lottery_settings');
    lotteryHistory = db.collection('lottery_history');
    dailyTasksPool = db.collection('daily_tasks_pool');
    dailyTaskSubmissions = db.collection('daily_task_submissions');
    dailyTaskSettings = db.collection('daily_task_settings');
    bankOperations = db.collection('bank_operations');
    personnelActions = db.collection('personnel_actions');
    careerApplications = db.collection('career_applications');

    await birthdays.createIndex({ nameLower: 1 }, { unique: true });
    await lotteryTickets.createIndex({ userId: 1 }, { unique: true });
    await dailyTasksPool.createIndex({ key: 1 }, { unique: true });
    await dailyTaskSubmissions.createIndex({ date: 1, userId: 1, difficulty: 1 });
    await bankOperations.createIndex({ createdAt: -1 });
    await bankOperations.createIndex({ type: 1, category: 1, createdAt: -1 });
    await personnelActions.createIndex({ createdAt: -1 });
    await personnelActions.createIndex({ type: 1, createdAt: -1 });
    await careerApplications.createIndex({ createdAt: -1 });
    await careerApplications.createIndex({ type: 1, status: 1, createdAt: -1 });

    await lotterySettings.updateOne(
        { name: 'weekly_lottery' },
        {
            $setOnInsert: {
                name: 'weekly_lottery',
                enabled: true,
                minPrize: 500000,
                maxPrize: 1000000,
                prizeStep: 100000,
                prizeType: 'money',
                manualPrizeName: null,
                manualPrizeDescription: null,
                lastAutoDrawDate: null,
                lotteryPanelMessageId: null,
                lotteryCrmMessageId: null
            }
        },
        { upsert: true }
    );

    await balances.updateOne(
        { name: 'safe' },
        { $setOnInsert: { name: 'safe', balance: 0 } },
        { upsert: true }
    );

    await botSettings.updateOne(
        { name: 'bot_lock' },
        { $setOnInsert: { name: 'bot_lock', locked: false } },
        { upsert: true }
    );

    await botSettings.updateOne(
        { name: 'career_settings' },
        {
            $setOnInsert: {
                name: 'career_settings',
                promotionOpen: true,
                deputyOpen: true,
                publicPanelMessageId: null,
                crmPanelMessageId: null
            }
        },
        { upsert: true }
    );

    // Synchronize task texts, difficulty and rewards from code with MongoDB.
    // The enabled flag of existing tasks is preserved, so manual disabling is not overwritten.
    for (const task of DEFAULT_DAILY_TASKS) {
        await dailyTasksPool.updateOne(
            { key: task.key },
            {
                $set: {
                    difficulty: task.difficulty,
                    rewardTickets: task.rewardTickets,
                    text: task.text,
                    updatedAt: Date.now()
                },
                $setOnInsert: {
                    key: task.key,
                    enabled: true,
                    createdAt: Date.now()
                }
            },
            { upsert: true }
        );
    }

    await dailyTaskSettings.updateOne(
        { name: 'daily_tasks' },
        {
            $setOnInsert: {
                name: 'daily_tasks',
                panelMessageId: null,
                currentDate: null,
                activeTasks: null,
                poolVersion: 0
            }
        },
        { upsert: true }
    );

    const currentDailyTaskSettings = await dailyTaskSettings.findOne({ name: 'daily_tasks' });

    // Regenerate the active set only once when the pool version changes.
    // Regular bot restarts will not reshuffle the same day's tasks.
    if ((currentDailyTaskSettings?.poolVersion || 0) !== DAILY_TASKS_POOL_VERSION) {
        await dailyTaskSettings.updateOne(
            { name: 'daily_tasks' },
            {
                $set: {
                    currentDate: null,
                    activeTasks: null,
                    poolVersion: DAILY_TASKS_POOL_VERSION,
                    poolUpdatedAt: Date.now()
                }
            }
        );

        console.log(`Daily Tasks pool synchronized to version ${DAILY_TASKS_POOL_VERSION}.`);
    }

    for (const quest of DEFAULT_QUESTS) {
        await questDefinitions.updateOne(
            { key: quest.key },
            { $setOnInsert: quest },
            { upsert: true }
        );

        await questStates.updateOne(
            { key: quest.key },
            {
                $setOnInsert: {
                    key: quest.key,
                    status: 'available',
                    cooldownUntil: null,
                    activeUserId: null,
                    activeUserName: null,
                    messageId: null,
                    reminder2hSent: false,
                    availableSent: false
                }
            },
            { upsert: true }
        );
    }

    console.log('MongoDB підключено.');
}

async function isBotLocked() {
    const lock = await botSettings.findOne({ name: 'bot_lock' });
    return Boolean(lock?.locked);
}

async function setBotLock(locked, userName) {
    await botSettings.updateOne(
        { name: 'bot_lock' },
        {
            $set: {
                name: 'bot_lock',
                locked,
                changedBy: userName,
                changedAt: Date.now()
            }
        },
        { upsert: true }
    );
}

async function getBalance() {
    const data = await balances.findOne({ name: 'safe' });
    return data?.balance || 0;
}

async function changeBalance(amount) {
    const result = await balances.findOneAndUpdate(
        { name: 'safe' },
        { $inc: { balance: amount } },
        { upsert: true, returnDocument: 'after' }
    );

    return result.balance;
}

async function addDailyStat(type, amount) {
    const date = getKyivDate();

    await dailyStats.updateOne(
        { date },
        {
            $inc: {
                plus: type === 'plus' ? amount : 0,
                minus: type === 'minus' ? amount : 0
            },
            $setOnInsert: {
                date,
                reportSent: false
            }
        },
        { upsert: true }
    );
}

async function recordBankOperation({ type, amount, category = 'other', note = '—', userId = null, userName = 'System', displayName = 'System', role = 'System', balanceAfter = null, source = 'manual', operationKey = null }) {
    if (!bankOperations) return;

    const categoryLabel = getBankCategoryLabel(type, category);

    await bankOperations.insertOne({
        type,
        amount: Number(amount) || 0,
        category,
        categoryLabel,
        note: note || '—',
        userId,
        userName,
        displayName,
        role,
        balanceAfter,
        source,
        operationKey,
        date: getKyivDate(),
        createdAt: Date.now()
    });
}

function getKyivWeekRange(timestamp = Date.now()) {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Europe/Kyiv',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).formatToParts(new Date(timestamp));

    const year = Number(parts.find(p => p.type === 'year').value);
    const month = Number(parts.find(p => p.type === 'month').value);
    const day = Number(parts.find(p => p.type === 'day').value);

    const currentDay = new Date(Date.UTC(year, month - 1, day));
    const weekday = currentDay.getUTCDay();
    const mondayOffset = weekday === 0 ? -6 : 1 - weekday;

    const startDate = new Date(Date.UTC(year, month - 1, day + mondayOffset));
    const endDate = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);

    return {
        start: startDate.getTime(),
        end: endDate.getTime(),
        startText: new Intl.DateTimeFormat('uk-UA', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(startDate),
        endText: new Intl.DateTimeFormat('uk-UA', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(endDate.getTime() - 24 * 60 * 60 * 1000))
    };
}

function formatSignedMoney(amount) {
    const value = Number(amount) || 0;
    return `${value >= 0 ? '+' : '-'}${formatMoney(Math.abs(value))}`;
}

async function getFinanceWeeklyStats() {
    const range = getKyivWeekRange();
    const operations = bankOperations
        ? await bankOperations.find({ createdAt: { $gte: range.start, $lt: range.end } }).sort({ createdAt: -1 }).toArray()
        : [];

    const plusByCategory = {};
    const minusByCategory = {};
    let plus = 0;
    let minus = 0;
    let plusCount = 0;
    let minusCount = 0;

    for (const operation of operations) {
        const amount = Number(operation.amount) || 0;

        if (operation.type === 'plus') {
            plus += amount;
            plusCount++;
            plusByCategory[operation.category || 'other'] = (plusByCategory[operation.category || 'other'] || 0) + amount;
        }

        if (operation.type === 'minus') {
            minus += amount;
            minusCount++;
            minusByCategory[operation.category || 'other'] = (minusByCategory[operation.category || 'other'] || 0) + amount;
        }
    }

    return {
        ...range,
        operations,
        lastOperations: operations.slice(0, 15),
        plus,
        minus,
        net: plus - minus,
        plusCount,
        minusCount,
        plusByCategory,
        minusByCategory
    };
}

function formatCategoryStats(categories, values) {
    return Object.entries(categories)
        .map(([key, label]) => `${label} — \`${formatMoney(values[key] || 0)}\``)
        .join('\n');
}

async function createFinanceCrmEmbed() {
    const balance = await getBalance();
    const stats = await getFinanceWeeklyStats();

    return new EmbedBuilder()
        .setColor(HOFFMAN_RED)
        .setTitle('HOFFMAN FINANCE CRM')
        .setDescription(
            `**Фінансовий центр Hoffman Family**\n` +
            `Короткий контроль балансу, доходів і витрат сімʼї.\n\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `**ПОТОЧНИЙ СТАН**\n\n` +
            `📅 Період: **${stats.startText} – ${stats.endText}**\n` +
            `💰 Баланс сейфу: \`${formatMoney(balance)}\`\n` +
            `📊 Результат тижня: \`${formatSignedMoney(stats.net)}\`\n\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `**РУХ КОШТІВ**\n\n` +
            `📈 Поповнено: \`${formatMoney(stats.plus)}\` — **${stats.plusCount} операцій**\n` +
            `📉 Витрачено: \`-${formatMoney(stats.minus)}\` — **${stats.minusCount} операцій**\n\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `**ПОПОВНЕННЯ ЗА КАТЕГОРІЯМИ**\n${formatCategoryStats(BANK_PLUS_CATEGORIES, stats.plusByCategory)}\n\n` +
            `**ВИТРАТИ ЗА КАТЕГОРІЯМИ**\n${formatCategoryStats(BANK_MINUS_CATEGORIES, stats.minusByCategory)}`
        )
        .setFooter({ text: 'Hoffman Family • Finance CRM' })
        .setTimestamp();
}

function createFinanceCrmButtons() {
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('finance_crm_refresh')
            .setLabel('Оновити')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('🔄'),

        new ButtonBuilder()
            .setCustomId('finance_crm_preview_report')
            .setLabel('Звіт за тиждень')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('📄'),

        new ButtonBuilder()
            .setCustomId('finance_crm_send_report')
            .setLabel('Відправити звіт')
            .setStyle(ButtonStyle.Success)
            .setEmoji('📤'),

        new ButtonBuilder()
            .setCustomId('finance_crm_recent_operations')
            .setLabel('Останні операції')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('📋')
    );

    return [row];
}

async function ensureFinanceCrmPanel() {
    const channel = await client.channels.fetch(FINANCE_CRM_CHANNEL_ID).catch(() => null);

    if (!channel) {
        console.log('Finance CRM канал не знайдено.');
        return;
    }

    const settings = await botSettings.findOne({ name: 'finance_crm_panel' });
    const embed = await createFinanceCrmEmbed();
    const buttons = createFinanceCrmButtons();

    if (settings?.messageId) {
        const oldMessage = await channel.messages.fetch(settings.messageId).catch(() => null);

        if (oldMessage) {
            await oldMessage.edit({ embeds: [embed], components: buttons });
            console.log('Finance CRM панель оновлено.');
            return;
        }
    }

    const message = await channel.send({ embeds: [embed], components: buttons });

    await botSettings.updateOne(
        { name: 'finance_crm_panel' },
        { $set: { name: 'finance_crm_panel', messageId: message.id } },
        { upsert: true }
    );

    console.log('Finance CRM панель створено.');
}

async function updateFinanceCrmPanel() {
    await ensureFinanceCrmPanel();
}

async function createFinanceWeeklyReportEmbed(sentBy = null) {
    const balance = await getBalance();
    const stats = await getFinanceWeeklyStats();

    return new EmbedBuilder()
        .setColor(HOFFMAN_RED)
        .setTitle('💰 Доповідь фінансового керівника')
        .setDescription(
            `👤 **Відповідальний напрямок:** фінанси Hoffman Family\n` +
            `${sentBy ? `🛡 **Доповідь сформував:** ${sentBy}\n` : ''}` +
            `📅 **Період:** ${stats.startText} – ${stats.endText}\n\n` +
            `━━━━━━━━━━━━━━━━━━━━\n\n` +
            `📈 **Поповнено до банку:** \`${formatMoney(stats.plus)}\`\n` +
            `📉 **Витрачено з банку:** \`-${formatMoney(stats.minus)}\`\n` +
            `📊 **Чистий результат:** \`${formatSignedMoney(stats.net)}\`\n` +
            `💰 **Поточний баланс сейфу:** \`${formatMoney(balance)}\`\n\n` +
            `📌 **Кількість операцій:**\n` +
            `📈 Поповнень: **${stats.plusCount}**\n` +
            `📉 Зняттів: **${stats.minusCount}**\n\n` +
            `━━━━━━━━━━━━━━━━━━━━\n\n` +
            `📂 **Основні поповнення:**\n${formatCategoryStats(BANK_PLUS_CATEGORIES, stats.plusByCategory)}\n\n` +
            `📂 **Основні витрати:**\n${formatCategoryStats(BANK_MINUS_CATEGORIES, stats.minusByCategory)}\n\n` +
            `━━━━━━━━━━━━━━━━━━━━\n\n` +
            `📝 **Висновок:**\n` +
            `Фінансовий стан сімʼї знаходиться під контролем. Банківські операції протягом тижня проводились за категоріями, що дозволяє контролювати поповнення, витрати та поточний баланс сімейного сейфу.`
        )
        .setFooter({ text: 'Hoffman Family • Weekly Finance Report' })
        .setTimestamp();
}

async function sendFinanceWeeklyReport(interaction) {
    const channel = await client.channels.fetch(FINANCE_REPORT_CHANNEL_ID).catch(() => null);

    if (!channel) {
        return await interaction.reply({
            content: '❌ Канал для доповідей не знайдено.',
            flags: MessageFlags.Ephemeral
        });
    }

    const embed = await createFinanceWeeklyReportEmbed(interaction.member?.displayName || interaction.user.username);

    await channel.send({ embeds: [embed] });

    await logAction(
        '📤 Фінансову доповідь відправлено',
        `Канал: <#${FINANCE_REPORT_CHANNEL_ID}>\nВідправив: **${interaction.member?.displayName || interaction.user.username}**`,
        0xd4af37
    );

    await updateFinanceCrmPanel();

    return await interaction.reply({
        content: `✅ Фінансову доповідь відправлено в <#${FINANCE_REPORT_CHANNEL_ID}>.`,
        flags: MessageFlags.Ephemeral
    });
}

async function showFinanceRecentOperations(interaction) {
    const stats = await getFinanceWeeklyStats();

    if (!stats.lastOperations.length) {
        return await interaction.reply({
            content: 'ℹ️ За поточний тиждень фінансових операцій ще немає.',
            flags: MessageFlags.Ephemeral
        });
    }

    const text = stats.lastOperations
        .map(operation => {
            const sign = operation.type === 'plus' ? '📈 +' : '📉 -';
            return `${sign}${formatMoney(operation.amount)}\n${operation.categoryLabel || getBankCategoryLabel(operation.type, operation.category)}\n👤 ${operation.displayName || operation.userName || 'System'}\n📝 ${operation.note || '—'}\n🕒 ${getKyivDateTime(operation.createdAt)}`;
        })
        .join('\n\n━━━━━━━━━━━━━━━\n\n');

    return await interaction.reply({
        embeds: [new EmbedBuilder()
            .setColor(HOFFMAN_RED)
            .setTitle('📋 Останні фінансові операції')
            .setDescription(text)
            .setFooter({ text: 'Hoffman Finance CRM • Recent Operations' })
            .setTimestamp()],
        flags: MessageFlags.Ephemeral
    });
}



const PERSONNEL_ACTION_LABELS = {
    application_submitted: '📨 Подано заявку',
    application_approved: '✅ Заявку схвалено',
    application_rejected: '❌ Заявку відхилено',
    promotion: '⬆️ Підвищення',
    demotion: '⬇️ Пониження',
    removal: '🚪 Виключення'
};

function getPersonnelActionLabel(type) {
    return PERSONNEL_ACTION_LABELS[type] || '📋 Кадрова дія';
}

async function recordPersonnelAction({ type, targetId = null, targetName = 'Невідомо', oldRank = '—', newRank = '—', reason = '—', performedBy = 'System', performedById = null, source = 'manual' }) {
    if (!personnelActions) return;

    await personnelActions.insertOne({
        type,
        actionLabel: getPersonnelActionLabel(type),
        targetId,
        targetName: targetName || 'Невідомо',
        oldRank: oldRank || '—',
        newRank: newRank || '—',
        reason: reason || '—',
        performedBy,
        performedById,
        source,
        date: getKyivDate(),
        createdAt: Date.now()
    });
}

async function getPersonnelWeeklyStats() {
    const range = getKyivWeekRange();
    const actions = personnelActions
        ? await personnelActions.find({ createdAt: { $gte: range.start, $lt: range.end } }).sort({ createdAt: -1 }).toArray()
        : [];

    const count = type => actions.filter(item => item.type === type).length;
    const submitted = count('application_submitted');
    const approved = count('application_approved');
    const rejected = count('application_rejected');
    const reviewed = approved + rejected;
    const approvalRate = reviewed ? Math.round((approved / reviewed) * 100) : 0;

    return {
        ...range,
        actions,
        lastActions: actions.slice(0, 15),
        submitted,
        approved,
        rejected,
        reviewed,
        approvalRate,
        promotions: count('promotion'),
        demotions: count('demotion'),
        removals: count('removal')
    };
}

async function createPersonnelCrmEmbed() {
    const stats = await getPersonnelWeeklyStats();

    return new EmbedBuilder()
        .setColor(HOFFMAN_RED)
        .setTitle('HOFFMAN PERSONNEL CRM')
        .setDescription(
            `**Кадровий центр Hoffman Family**\n` +
            `Контроль заявок, підвищень і змін у складі сімʼї.\n\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `**ЗАЯВКИ ЗА ТИЖДЕНЬ**\n\n` +
            `📅 Період: **${stats.startText} – ${stats.endText}**\n` +
            `📨 Подано: **${stats.submitted}**\n` +
            `✅ Схвалено: **${stats.approved}**\n` +
            `❌ Відхилено: **${stats.rejected}**\n` +
            `📊 Відсоток схвалення: **${stats.approvalRate}%**\n\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `**КАДРОВІ ЗМІНИ**\n\n` +
            `⬆️ Підвищення: **${stats.promotions}**\n` +
            `⬇️ Пониження: **${stats.demotions}**\n` +
            `🚪 Виключення / вибуття: **${stats.removals}**\n\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `⚙️ Всього зафіксовано кадрових дій: **${stats.actions.length}**`
        )
        .setFooter({ text: 'Hoffman Family • Personnel CRM' })
        .setTimestamp();
}

function createPersonnelCrmButtons() {
    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('personnel_crm_refresh')
            .setLabel('Оновити')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('🔄'),

        new ButtonBuilder()
            .setCustomId('personnel_crm_preview_report')
            .setLabel('Звіт за тиждень')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('📄'),

        new ButtonBuilder()
            .setCustomId('personnel_crm_send_report')
            .setLabel('Відправити звіт')
            .setStyle(ButtonStyle.Success)
            .setEmoji('📤'),

        new ButtonBuilder()
            .setCustomId('personnel_crm_recent_actions')
            .setLabel('Останні дії')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('📋')
    );

    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('personnel_crm_add_promotion')
            .setLabel('Підвищення')
            .setStyle(ButtonStyle.Success)
            .setEmoji('⬆️'),

        new ButtonBuilder()
            .setCustomId('personnel_crm_add_demotion')
            .setLabel('Пониження')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('⬇️'),

        new ButtonBuilder()
            .setCustomId('personnel_crm_add_removal')
            .setLabel('Виключення')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('🚪')
    );

    return [row1, row2];
}

async function ensurePersonnelCrmPanel() {
    const channel = await client.channels.fetch(PERSONNEL_CRM_CHANNEL_ID).catch(() => null);

    if (!channel) {
        console.log('Personnel CRM канал не знайдено.');
        return;
    }

    const settings = await botSettings.findOne({ name: 'personnel_crm_panel' });
    const embed = await createPersonnelCrmEmbed();
    const buttons = createPersonnelCrmButtons();

    if (settings?.messageId) {
        const oldMessage = await channel.messages.fetch(settings.messageId).catch(() => null);

        if (oldMessage) {
            await oldMessage.edit({ embeds: [embed], components: buttons });
            console.log('Personnel CRM панель оновлено.');
            return;
        }
    }

    const message = await channel.send({ embeds: [embed], components: buttons });

    await botSettings.updateOne(
        { name: 'personnel_crm_panel' },
        { $set: { name: 'personnel_crm_panel', messageId: message.id } },
        { upsert: true }
    );

    console.log('Personnel CRM панель створено.');
}

async function updatePersonnelCrmPanel() {
    await ensurePersonnelCrmPanel();
}

async function createPersonnelWeeklyReportEmbed(sentBy = null) {
    const stats = await getPersonnelWeeklyStats();

    return new EmbedBuilder()
        .setColor(HOFFMAN_RED)
        .setTitle('🧑‍💼 Доповідь заступника з персоналу')
        .setDescription(
            `👤 **Відповідальний напрямок:** кадровий аудит Hoffman Family\n` +
            `${sentBy ? `🛡 **Доповідь сформував:** ${sentBy}\n` : ''}` +
            `📅 **Період:** ${stats.startText} – ${stats.endText}\n\n` +
            `━━━━━━━━━━━━━━━━━━━━\n\n` +
            `📨 **Подано заявок:** **${stats.submitted}**\n` +
            `✅ **Схвалено заявок:** **${stats.approved}**\n` +
            `❌ **Відхилено заявок:** **${stats.rejected}**\n` +
            `📊 **Відсоток схвалення:** **${stats.approvalRate}%**\n\n` +
            `━━━━━━━━━━━━━━━━━━━━\n\n` +
            `⬆️ **Підвищення:** **${stats.promotions}**\n` +
            `⬇️ **Пониження:** **${stats.demotions}**\n` +
            `🚪 **Виключення / вибуття:** **${stats.removals}**\n` +
            `📋 **Всього кадрових дій:** **${stats.actions.length}**\n\n` +
            `━━━━━━━━━━━━━━━━━━━━\n\n` +
            `📝 **Висновок:**\n` +
            `Кадрова робота протягом тижня проводилась у штатному режимі. Заявки розглядались керівництвом, кадрові зміни фіксувались для контролю складу сімʼї.`
        )
        .setFooter({ text: 'Hoffman Family • Weekly Personnel Report' })
        .setTimestamp();
}

async function sendPersonnelWeeklyReport(interaction) {
    const channel = await client.channels.fetch(PERSONNEL_REPORT_CHANNEL_ID).catch(() => null);

    if (!channel) {
        return await interaction.reply({
            content: '❌ Канал для доповідей не знайдено.',
            flags: MessageFlags.Ephemeral
        });
    }

    const embed = await createPersonnelWeeklyReportEmbed(interaction.member?.displayName || interaction.user.username);

    await channel.send({ embeds: [embed] });

    await logAction(
        '📤 Кадрову доповідь відправлено',
        `Канал: <#${PERSONNEL_REPORT_CHANNEL_ID}>\nВідправив: **${interaction.member?.displayName || interaction.user.username}**`,
        0x8B0000
    );

    await updatePersonnelCrmPanel();

    return await interaction.reply({
        content: `✅ Кадрову доповідь відправлено в <#${PERSONNEL_REPORT_CHANNEL_ID}>.`,
        flags: MessageFlags.Ephemeral
    });
}

async function showPersonnelRecentActions(interaction) {
    const stats = await getPersonnelWeeklyStats();

    if (!stats.lastActions.length) {
        return await interaction.reply({
            content: 'ℹ️ За поточний тиждень кадрових дій ще немає.',
            flags: MessageFlags.Ephemeral
        });
    }

    const text = stats.lastActions
        .map(action => {
            return `${action.actionLabel || getPersonnelActionLabel(action.type)}\n👤 ${action.targetId ? `<@${action.targetId}>` : action.targetName}\n📌 ${action.oldRank || '—'} → ${action.newRank || '—'}\n📝 ${action.reason || '—'}\n🛡 ${action.performedBy || 'System'}\n🕒 ${getKyivDateTime(action.createdAt)}`;
        })
        .join('\n\n━━━━━━━━━━━━━━━\n\n');

    return await interaction.reply({
        embeds: [new EmbedBuilder()
            .setColor(HOFFMAN_RED)
            .setTitle('📋 Останні кадрові дії')
            .setDescription(text)
            .setFooter({ text: 'Hoffman Personnel CRM • Recent Actions' })
            .setTimestamp()],
        flags: MessageFlags.Ephemeral
    });
}

async function openPersonnelActionModal(interaction, actionType) {
    if (!hasReviewAccess(interaction.member)) {
        return await interaction.reply({
            content: '❌ Доступ до Personnel CRM мають тільки 9/10 ранг.',
            flags: MessageFlags.Ephemeral
        });
    }

    const titles = {
        promotion: 'Зареєструвати підвищення',
        demotion: 'Зареєструвати пониження',
        removal: 'Зареєструвати виключення'
    };

    const modal = new ModalBuilder()
        .setCustomId(`personnel_action_modal:${actionType}`)
        .setTitle(titles[actionType] || 'Кадрова дія');

    const nameInput = new TextInputBuilder()
        .setCustomId('personnel_target_name')
        .setLabel('Nick / Discord користувача')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Наприклад: Markiz Hoffman або @user')
        .setRequired(true);

    const oldRankInput = new TextInputBuilder()
        .setCustomId('personnel_old_rank')
        .setLabel(actionType === 'removal' ? 'Посада / ранг до виключення' : 'З якої посади / рангу')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Наприклад: 3 ранг')
        .setRequired(false);

    const newRankInput = new TextInputBuilder()
        .setCustomId('personnel_new_rank')
        .setLabel(actionType === 'removal' ? 'Статус після виключення' : 'На яку посаду / ранг')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder(actionType === 'removal' ? 'Наприклад: виключений зі складу' : 'Наприклад: 4 ранг')
        .setRequired(false);

    const reasonInput = new TextInputBuilder()
        .setCustomId('personnel_reason')
        .setLabel('Підстава / причина')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Коротко вкажіть причину кадрової дії')
        .setRequired(false);

    modal.addComponents(
        new ActionRowBuilder().addComponents(nameInput),
        new ActionRowBuilder().addComponents(oldRankInput),
        new ActionRowBuilder().addComponents(newRankInput),
        new ActionRowBuilder().addComponents(reasonInput)
    );

    return await interaction.showModal(modal);
}

async function handlePersonnelActionModal(interaction, actionType) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    if (!hasReviewAccess(interaction.member)) {
        return await interaction.editReply({
            content: '❌ Доступ до Personnel CRM мають тільки 9/10 ранг.'
        });
    }

    const targetNameRaw = interaction.fields.getTextInputValue('personnel_target_name').trim();
    const oldRank = interaction.fields.getTextInputValue('personnel_old_rank')?.trim() || '—';
    const newRank = interaction.fields.getTextInputValue('personnel_new_rank')?.trim() || (actionType === 'removal' ? 'Виключений зі складу' : '—');
    const reason = interaction.fields.getTextInputValue('personnel_reason')?.trim() || '—';
    const targetIdMatch = targetNameRaw.match(/<@!?(\d+)>/) || targetNameRaw.match(/^(\d{15,25})$/);
    const targetId = targetIdMatch ? targetIdMatch[1] : null;

    await recordPersonnelAction({
        type: actionType,
        targetId,
        targetName: targetNameRaw,
        oldRank,
        newRank,
        reason,
        performedBy: interaction.member?.displayName || interaction.user.username,
        performedById: interaction.user.id,
        source: 'manual'
    });

    await updatePersonnelCrmPanel();

    await logAction(
        getPersonnelActionLabel(actionType),
        `👤 Користувач: ${targetId ? `<@${targetId}>` : `**${targetNameRaw}**`}\n📌 ${oldRank} → ${newRank}\n📝 Причина: ${reason}\n🛡 Виконав: **${interaction.member?.displayName || interaction.user.username}**`,
        actionType === 'promotion' ? 0x00ff88 : actionType === 'demotion' ? 0xffcc00 : 0xff3333
    );

    return await interaction.editReply({
        content: `✅ Кадрову дію збережено: **${getPersonnelActionLabel(actionType)}** для ${targetId ? `<@${targetId}>` : `**${targetNameRaw}**`}.`
    });
}

const CAREER_TYPE_LABELS = {
    promotion: '⬆️ Заявка на підвищення',
    deputy: '👔 Заявка на заступника'
};

const CAREER_RANKS = [
    '[10] Founder',
    '[9] Elder',
    '[8] Veteran',
    '[7] Legend',
    '[6] Mentor',
    '[5] Master',
    '[4] Reliable member',
    '[3] Enthusiast',
    '[2] Beginner',
    '[1] Newbie'
];

function getCareerTypeLabel(type) {
    return CAREER_TYPE_LABELS[type] || '📋 Карʼєрна заявка';
}

async function getCareerSettings() {
    let settings = await botSettings.findOne({ name: 'career_settings' });

    if (!settings) {
        await botSettings.updateOne(
            { name: 'career_settings' },
            {
                $setOnInsert: {
                    name: 'career_settings',
                    promotionOpen: true,
                    deputyOpen: true,
                    publicPanelMessageId: null,
                    crmPanelMessageId: null
                }
            },
            { upsert: true }
        );

        settings = await botSettings.findOne({ name: 'career_settings' });
    }

    return settings;
}

async function getCareerWeeklyStats() {
    const range = getKyivWeekRange();
    const applications = careerApplications
        ? await careerApplications.find({ createdAt: { $gte: range.start, $lt: range.end } }).sort({ createdAt: -1 }).toArray()
        : [];

    const count = (filter) => applications.filter(filter).length;

    return {
        ...range,
        applications,
        lastApplications: applications.slice(0, 15),
        submitted: applications.length,
        promotionSubmitted: count(item => item.type === 'promotion'),
        deputySubmitted: count(item => item.type === 'deputy'),
        approved: count(item => item.status === 'approved'),
        rejected: count(item => item.status === 'rejected'),
        pending: count(item => item.status === 'pending'),
        promotionApproved: count(item => item.type === 'promotion' && item.status === 'approved'),
        deputyApproved: count(item => item.type === 'deputy' && item.status === 'approved')
    };
}

function createCareerPublicEmbed() {
    return new EmbedBuilder()
        .setColor(HOFFMAN_RED)
        .setTitle('HOFFMAN CAREER CENTER')
        .setDescription(
            `**Твій розвиток у Hoffman Family починається тут.**\n\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `**ДОСТУПНІ МОЖЛИВОСТІ**\n\n` +
            `⬆️ **Заявка на підвищення**\n` +
            `Подай свої досягнення та кандидатуру на наступний ранг.\n\n` +
            `👔 **Заявка на посаду заступника**\n` +
            `Запропонуй свою кандидатуру до керівного складу сімʼї.\n\n` +
            `📋 **Вимоги**\n` +
            `Переглянь ієрархію та критерії оцінювання.\n\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `Остаточне рішення за кожною заявкою приймає **Founder**.`
        )
        .setImage(CAREER_PANEL_IMAGE_URL)
        .setFooter({ text: 'Hoffman Family • Career Center' })
        .setTimestamp();
}

function createCareerPublicButtons() {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('career_apply_promotion')
            .setLabel('Подати на підвищення')
            .setStyle(ButtonStyle.Success)
            .setEmoji('⬆️'),

        new ButtonBuilder()
            .setCustomId('career_apply_deputy')
            .setLabel('Подати на заступника')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('👔'),

        new ButtonBuilder()
            .setCustomId('career_requirements')
            .setLabel('Вимоги')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('📋')
    );
}

async function ensureCareerPublicPanel() {
    const channel = await client.channels.fetch(CAREER_PUBLIC_CHANNEL_ID).catch(() => null);

    if (!channel) {
        console.log('Career public канал не знайдено.');
        return;
    }

    const settings = await getCareerSettings();
    const embed = createCareerPublicEmbed();
    const buttons = createCareerPublicButtons();

    if (settings?.publicPanelMessageId) {
        const oldMessage = await channel.messages.fetch(settings.publicPanelMessageId).catch(() => null);

        if (oldMessage) {
            await oldMessage.edit({ embeds: [embed], components: [buttons] });
            console.log('Career public панель оновлено.');
            return;
        }
    }

    const message = await channel.send({ embeds: [embed], components: [buttons] });

    await botSettings.updateOne(
        { name: 'career_settings' },
        { $set: { publicPanelMessageId: message.id } },
        { upsert: true }
    );

    console.log('Career public панель створено.');
}

async function createCareerCrmEmbed() {
    const settings = await getCareerSettings();
    const stats = await getCareerWeeklyStats();

    return new EmbedBuilder()
        .setColor(HOFFMAN_RED)
        .setTitle('HOFFMAN CAREER CRM')
        .setDescription(
            `**Founder Control • Карʼєрні заявки Hoffman Family**\n\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `**СТАН ПРИЙОМУ ЗАЯВОК**\n\n` +
            `⬆️ Підвищення: ${settings.promotionOpen ? '🟢 **відкрито**' : '🔴 **закрито**'}\n` +
            `👔 Заступники: ${settings.deputyOpen ? '🟢 **відкрито**' : '🔴 **закрито**'}\n\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `**СТАТИСТИКА ЗА ТИЖДЕНЬ**\n\n` +
            `📅 ${stats.startText} – ${stats.endText}\n` +
            `📨 Подано всього: **${stats.submitted}**\n` +
            `⬆️ На підвищення: **${stats.promotionSubmitted}**\n` +
            `👔 На заступника: **${stats.deputySubmitted}**\n\n` +
            `⏳ На розгляді: **${stats.pending}**\n` +
            `✅ Схвалено: **${stats.approved}**\n` +
            `❌ Відхилено: **${stats.rejected}**\n\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `⚙️ Рішення доступне тільки **Founder / 10 рангу**.`
        )
        .setFooter({ text: 'Hoffman Family • Career CRM' })
        .setTimestamp();
}

function createCareerCrmButtons() {
    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('career_crm_refresh').setLabel('Оновити').setStyle(ButtonStyle.Secondary).setEmoji('🔄'),
        new ButtonBuilder().setCustomId('career_crm_recent').setLabel('Останні заявки').setStyle(ButtonStyle.Secondary).setEmoji('📋')
    );

    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('career_crm_open_promotion').setLabel('Відкрити підвищення').setStyle(ButtonStyle.Success).setEmoji('🟢'),
        new ButtonBuilder().setCustomId('career_crm_close_promotion').setLabel('Закрити підвищення').setStyle(ButtonStyle.Danger).setEmoji('🔴')
    );

    const row3 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('career_crm_open_deputy').setLabel('Відкрити заступників').setStyle(ButtonStyle.Success).setEmoji('🟢'),
        new ButtonBuilder().setCustomId('career_crm_close_deputy').setLabel('Закрити заступників').setStyle(ButtonStyle.Danger).setEmoji('🔴')
    );

    return [row1, row2, row3];
}

async function ensureCareerCrmPanel() {
    const channel = await client.channels.fetch(CAREER_CRM_CHANNEL_ID).catch(() => null);

    if (!channel) {
        console.log('Career CRM канал не знайдено.');
        return;
    }

    const settings = await getCareerSettings();
    const embed = await createCareerCrmEmbed();
    const buttons = createCareerCrmButtons();

    if (settings?.crmPanelMessageId) {
        const oldMessage = await channel.messages.fetch(settings.crmPanelMessageId).catch(() => null);

        if (oldMessage) {
            await oldMessage.edit({ embeds: [embed], components: buttons });
            console.log('Career CRM панель оновлено.');
            return;
        }
    }

    const message = await channel.send({ embeds: [embed], components: buttons });

    await botSettings.updateOne(
        { name: 'career_settings' },
        { $set: { crmPanelMessageId: message.id } },
        { upsert: true }
    );

    console.log('Career CRM панель створено.');
}

async function updateCareerPanels() {
    await ensureCareerPublicPanel();
    await ensureCareerCrmPanel();
}

async function showCareerRequirements(interaction) {
    const embed = new EmbedBuilder()
        .setColor(HOFFMAN_RED)
        .setTitle('📋 Вимоги та ієрархія Hoffman Family')
        .setDescription(
            `🏛 **Ієрархія сімʼї:**\n\n` +
            CAREER_RANKS.map(rank => `◆ ${rank}`).join('\n') +
            `\n\n━━━━━━━━━━━━━━━━━━━━\n\n` +
            `⬆️ **Для підвищення враховується:**\n` +
            `• активність у сімʼї;\n` +
            `• участь у квестах та RP;\n` +
            `• допомога іншим учасникам;\n` +
            `• внесок у банк / розвиток сімʼї;\n` +
            `• дисципліна та репутація.\n\n` +
            `👔 **Для заявки на заступника додатково враховується:**\n` +
            `• відповідальність;\n` +
            `• ініціативність;\n` +
            `• вміння керувати людьми;\n` +
            `• стабільний онлайн;\n` +
            `• довіра Founder.\n\n` +
            `⚠️ Підвищення або призначення не є автоматичним. Остаточне рішення приймає керівництво.`
        )
        .setFooter({ text: 'Hoffman Family • Career Requirements' })
        .setTimestamp();

    return await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

async function openCareerApplicationModal(interaction, type) {
    if (interaction.channelId !== CAREER_PUBLIC_CHANNEL_ID) {
        return await interaction.reply({
            content: '❌ Подати карʼєрну заявку можна тільки у спеціальному каналі.',
            flags: MessageFlags.Ephemeral
        });
    }

    if (!hasFamilyAccess(interaction.member)) {
        return await interaction.reply({
            content: '❌ Подавати карʼєрні заявки можуть тільки учасники Hoffman Family.',
            flags: MessageFlags.Ephemeral
        });
    }

    const settings = await getCareerSettings();

    if (type === 'promotion' && !settings.promotionOpen) {
        return await interaction.reply({ content: '🔴 Прийом заявок на підвищення зараз закритий.', flags: MessageFlags.Ephemeral });
    }

    if (type === 'deputy' && !settings.deputyOpen) {
        return await interaction.reply({ content: '🔴 Прийом заявок на заступника зараз закритий.', flags: MessageFlags.Ephemeral });
    }

    const modal = new ModalBuilder()
        .setCustomId(`career_application_modal:${type}`)
        .setTitle(type === 'promotion' ? 'Заявка на підвищення' : 'Заявка на заступника');

    const currentRankInput = new TextInputBuilder()
        .setCustomId('career_current_rank')
        .setLabel('Ваш поточний ранг / посада')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Наприклад: [3] Enthusiast')
        .setRequired(true);

    const desiredRankInput = new TextInputBuilder()
        .setCustomId('career_desired_rank')
        .setLabel(type === 'promotion' ? 'На який ранг претендуєте' : 'Який напрямок заступника')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder(type === 'promotion' ? 'Наприклад: [4] Reliable member' : 'Наприклад: фінанси / персонал / забезпечення')
        .setRequired(true);

    const contributionInput = new TextInputBuilder()
        .setCustomId('career_contribution')
        .setLabel('Що зробили для сімʼї')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Квести, допомога, активності, внески, набір людей тощо')
        .setRequired(true);

    const onlineInput = new TextInputBuilder()
        .setCustomId('career_online')
        .setLabel('Ваш онлайн / активність')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Наприклад: 3-4 години щодня')
        .setRequired(true);

    const reasonInput = new TextInputBuilder()
        .setCustomId('career_reason')
        .setLabel('Чому саме вас потрібно обрати')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);

    modal.addComponents(
        new ActionRowBuilder().addComponents(currentRankInput),
        new ActionRowBuilder().addComponents(desiredRankInput),
        new ActionRowBuilder().addComponents(contributionInput),
        new ActionRowBuilder().addComponents(onlineInput),
        new ActionRowBuilder().addComponents(reasonInput)
    );

    return await interaction.showModal(modal);
}

function createCareerReviewButtons(applicationId) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`career_approve:${applicationId}`)
            .setLabel('Схвалити')
            .setStyle(ButtonStyle.Success)
            .setEmoji('✅'),

        new ButtonBuilder()
            .setCustomId(`career_reject:${applicationId}`)
            .setLabel('Відхилити')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('❌')
    );
}

async function handleCareerApplicationModal(interaction, type) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    if (!hasFamilyAccess(interaction.member)) {
        return await interaction.editReply({ content: '❌ Подавати карʼєрні заявки можуть тільки учасники Hoffman Family.' });
    }

    const settings = await getCareerSettings();

    if (type === 'promotion' && !settings.promotionOpen) {
        return await interaction.editReply({ content: '🔴 Прийом заявок на підвищення зараз закритий.' });
    }

    if (type === 'deputy' && !settings.deputyOpen) {
        return await interaction.editReply({ content: '🔴 Прийом заявок на заступника зараз закритий.' });
    }

    const currentRank = interaction.fields.getTextInputValue('career_current_rank').trim();
    const desiredRank = interaction.fields.getTextInputValue('career_desired_rank').trim();
    const contribution = interaction.fields.getTextInputValue('career_contribution').trim();
    const online = interaction.fields.getTextInputValue('career_online').trim();
    const reason = interaction.fields.getTextInputValue('career_reason').trim();
    const displayName = interaction.member?.displayName || interaction.user.username;

    const result = await careerApplications.insertOne({
        type,
        typeLabel: getCareerTypeLabel(type),
        status: 'pending',
        userId: interaction.user.id,
        userName: interaction.user.username,
        displayName,
        currentRank,
        desiredRank,
        contribution,
        online,
        reason,
        submittedAt: Date.now(),
        createdAt: Date.now(),
        reviewedAt: null,
        reviewedBy: null,
        reviewedById: null
    });

    const reviewChannel = await client.channels.fetch(CAREER_REVIEW_CHANNEL_ID).catch(() => null);

    if (!reviewChannel) {
        return await interaction.editReply({ content: '❌ Канал для розгляду заявок не знайдено.' });
    }

    const embed = new EmbedBuilder()
        .setColor(type === 'promotion' ? 0xd4af37 : 0x8B0000)
        .setTitle(`${getCareerTypeLabel(type)} — на розгляді`)
        .setDescription(
            `👤 **Учасник:** <@${interaction.user.id}>\n` +
            `📝 **Nick:** ${displayName}\n\n` +
            `📌 **Поточний ранг / посада:**\n${currentRank}\n\n` +
            `${type === 'promotion' ? '⬆️ **Бажаний ранг:**' : '👔 **Бажаний напрямок / посада:**'}\n${desiredRank}\n\n` +
            `📊 **Що зробив для сімʼї:**\n${contribution}\n\n` +
            `⏰ **Онлайн / активність:**\n${online}\n\n` +
            `📝 **Чому заслуговує:**\n${reason}\n\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `⚠️ Рішення може приймати тільки **Founder / 10 ранг**.`
        )
        .setFooter({ text: `Hoffman Career System • ID: ${result.insertedId}` })
        .setTimestamp();

    const message = await reviewChannel.send({
        content: `<@&${RANK_10_ROLE_ID}>`,
        embeds: [embed],
        components: [createCareerReviewButtons(result.insertedId.toString())]
    });

    await careerApplications.updateOne(
        { _id: result.insertedId },
        { $set: { reviewMessageId: message.id, reviewChannelId: reviewChannel.id } }
    );

    await updateCareerPanels();

    await logAction(
        '📨 Карʼєрну заявку подано',
        `Тип: **${getCareerTypeLabel(type)}**\n👤 Учасник: <@${interaction.user.id}>\n📌 ${currentRank} → ${desiredRank}`,
        0xd4af37
    );

    return await interaction.editReply({
        content: `✅ ${getCareerTypeLabel(type)} успішно подано на розгляд Founder.`
    });
}

function createCareerDecisionDM(type, approved) {
    if (approved && type === 'promotion') {
        return `🟢 **Вітаємо!**\n\nВашу заявку на підвищення було **схвалено**.\n\n📈 Новий ранг буде видано найближчим часом керівництвом Hoffman Family.\n\nДякуємо за активність та внесок у розвиток сімʼї.\n\n🔥 **Hoffman Family**`;
    }

    if (!approved && type === 'promotion') {
        return `🔴 **Заявку розглянуто**\n\nНа жаль, цього разу заявку на підвищення було **відхилено**.\n\nЦе не означає, що шансів більше немає. Продовжуйте проявляти активність, виконувати квести, брати участь у житті сімʼї та допомагати іншим учасникам.\n\n🤝 **Hoffman Family**`;
    }

    if (approved && type === 'deputy') {
        return `🟢 **Вітаємо!**\n\nВашу кандидатуру на посаду **заступника Hoffman Family** було схвалено.\n\nНайближчим часом Founder видасть необхідні права та проведе інструктаж.\n\nБажаємо успіхів на новій посаді.\n\n🔥 **Hoffman Family**`;
    }

    return `🔴 **Рішення керівництва**\n\nВашу кандидатуру на посаду заступника поки що не було погоджено.\n\nПродовжуйте проявляти себе та брати участь у розвитку сімʼї.\n\nМи впевнені, що наступного разу у вас буде більше шансів.\n\n🤝 **Hoffman Family**`;
}

async function reviewCareerApplication(interaction, approved) {
    if (!hasLeaderAccess(interaction.member)) {
        return await interaction.reply({
            content: '❌ Рішення по карʼєрних заявках може приймати тільки Founder / 10 ранг.',
            flags: MessageFlags.Ephemeral
        });
    }

    const applicationId = interaction.customId.split(':')[1];
    let objectId;

    try {
        objectId = new ObjectId(applicationId);
    } catch (error) {
        return await interaction.reply({ content: '❌ Невірний ID заявки.', flags: MessageFlags.Ephemeral });
    }

    const application = await careerApplications.findOne({ _id: objectId });

    if (!application) {
        return await interaction.reply({ content: '❌ Заявку не знайдено.', flags: MessageFlags.Ephemeral });
    }

    if (application.status !== 'pending') {
        return await interaction.reply({ content: 'ℹ️ Ця заявка вже була розглянута.', flags: MessageFlags.Ephemeral });
    }

    const status = approved ? 'approved' : 'rejected';
    const reviewer = interaction.member?.displayName || interaction.user.username;

    await careerApplications.updateOne(
        { _id: objectId },
        {
            $set: {
                status,
                reviewedAt: Date.now(),
                reviewedBy: reviewer,
                reviewedById: interaction.user.id
            }
        }
    );

    await recordPersonnelAction({
        type: approved && application.type === 'promotion' ? 'promotion' : approved ? 'application_approved' : 'application_rejected',
        targetId: application.userId,
        targetName: application.displayName || application.userName,
        oldRank: application.currentRank,
        newRank: approved ? application.desiredRank : 'Відхилено',
        reason: `${getCareerTypeLabel(application.type)}: ${approved ? 'схвалено' : 'відхилено'}`,
        performedBy: reviewer,
        performedById: interaction.user.id,
        source: 'career'
    });

    const user = await client.users.fetch(application.userId).catch(() => null);
    if (user) await user.send(createCareerDecisionDM(application.type, approved)).catch(() => null);

    const embed = EmbedBuilder.from(interaction.message.embeds[0])
        .setColor(approved ? 0x00ff88 : 0xff3333)
        .setTitle(`${getCareerTypeLabel(application.type)} — ${approved ? 'СХВАЛЕНО' : 'ВІДХИЛЕНО'}`)
        .addFields({
            name: approved ? '✅ Рішення' : '❌ Рішення',
            value: `${approved ? 'Заявку схвалив' : 'Заявку відхилив'}: **${reviewer}**`
        });

    await interaction.update({ embeds: [embed], components: [] });

    await updateCareerPanels();
    await updatePersonnelCrmPanel();

    await logAction(
        approved ? '✅ Карʼєрну заявку схвалено' : '❌ Карʼєрну заявку відхилено',
        `Тип: **${getCareerTypeLabel(application.type)}**\n👤 Учасник: <@${application.userId}>\n📌 ${application.currentRank} → ${application.desiredRank}\n🛡 Рішення прийняв: **${reviewer}**`,
        approved ? 0x00ff88 : 0xff3333
    );
}

async function setCareerOpen(interaction, field, value) {
    if (!hasLeaderAccess(interaction.member)) {
        return await interaction.reply({
            content: '❌ Career CRM доступна тільки Founder / 10 рангу.',
            flags: MessageFlags.Ephemeral
        });
    }

    await botSettings.updateOne(
        { name: 'career_settings' },
        { $set: { [field]: value, updatedAt: Date.now(), updatedBy: interaction.member?.displayName || interaction.user.username } },
        { upsert: true }
    );

    await updateCareerPanels();

    const label = field === 'promotionOpen' ? 'заявки на підвищення' : 'заявки на заступника';

    return await interaction.reply({
        content: `${value ? '🟢 Відкрито' : '🔴 Закрито'} ${label}.`,
        flags: MessageFlags.Ephemeral
    });
}

async function showCareerRecentApplications(interaction) {
    if (!hasLeaderAccess(interaction.member)) {
        return await interaction.reply({
            content: '❌ Career CRM доступна тільки Founder / 10 рангу.',
            flags: MessageFlags.Ephemeral
        });
    }

    const stats = await getCareerWeeklyStats();

    if (!stats.lastApplications.length) {
        return await interaction.reply({ content: 'ℹ️ За поточний тиждень карʼєрних заявок ще немає.', flags: MessageFlags.Ephemeral });
    }

    const text = stats.lastApplications.map(item => {
        const status = item.status === 'approved' ? '✅ Схвалено' : item.status === 'rejected' ? '❌ Відхилено' : '⏳ На розгляді';
        return `${item.typeLabel || getCareerTypeLabel(item.type)}\n👤 <@${item.userId}>\n📌 ${item.currentRank} → ${item.desiredRank}\n${status}\n🕒 ${getKyivDateTime(item.createdAt)}`;
    }).join('\n\n━━━━━━━━━━━━━━━\n\n');

    return await interaction.reply({
        embeds: [new EmbedBuilder()
            .setColor(0x8B0000)
            .setTitle('📋 Останні карʼєрні заявки')
            .setDescription(text)
            .setFooter({ text: 'Hoffman Career CRM • Recent Applications' })
            .setTimestamp()],
        flags: MessageFlags.Ephemeral
    });
}

async function logAction(title, description, color = 0xd4af37) {
    if (!LOG_CHANNEL_ID) return;

    const channel = await client.channels.fetch(LOG_CHANNEL_ID).catch(() => null);
    if (!channel) return;

    const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(title)
        .setDescription(description)
        .setFooter({ text: 'Hoffman System • Logs' })
        .setTimestamp();

    await channel.send({ embeds: [embed] }).catch(() => null);
}

async function checkGlobalSecurity(interaction) {
    if (!interaction.isChatInputCommand()) return true;

    const commandName = interaction.commandName;

    const now = Date.now();
    const cooldownKey = `${interaction.user.id}:${commandName}`;
    const lastUsed = commandCooldowns.get(cooldownKey);

    if (lastUsed && now - lastUsed < COOLDOWN_MS) {
        const left = Math.ceil((COOLDOWN_MS - (now - lastUsed)) / 1000);

        await interaction.reply({
            content: `⏳ Зачекайте **${left} сек.** перед повторним використанням цієї команди.`,
            flags: MessageFlags.Ephemeral
        });

        return false;
    }

    commandCooldowns.set(cooldownKey, now);

    if (await isBotLocked()) {
        if (commandName !== 'unlock_bot') {
            await interaction.reply({
                content: '🔒 Hoffman Bot зараз заблокований адміністрацією.',
                flags: MessageFlags.Ephemeral
            });

            return false;
        }
    }

    if (commandName === 'apply') {
        if (!hasRole(interaction.member, GUEST_ROLE_ID)) {
            await interaction.reply({
                content: '❌ Команда доступна тільки користувачам з роллю **Гість**.',
                flags: MessageFlags.Ephemeral
            });

            return false;
        }
    }

    if (isStaffCommand(commandName) && !hasReviewAccess(interaction.member)) {
        await interaction.reply({
            content: '❌ У вас немає прав для використання цієї команди.',
            flags: MessageFlags.Ephemeral
        });

        return false;
    }

    if (isFamilyCommand(commandName) && !hasFamilyAccess(interaction.member)) {
        await interaction.reply({
            content: '❌ Ця команда доступна тільки учасникам Hoffman Family.',
            flags: MessageFlags.Ephemeral
        });

        return false;
    }

    if (['lock_bot', 'unlock_bot'].includes(commandName) && !hasLeaderAccess(interaction.member)) {
        await interaction.reply({
            content: '❌ Ця команда доступна тільки 10 рангу.',
            flags: MessageFlags.Ephemeral
        });

        return false;
    }

    if (isBankCommand(commandName) && BANK_CHANNEL_ID && interaction.channelId !== BANK_CHANNEL_ID) {
        await interaction.reply({
            content: '❌ Банківські команди можна використовувати тільки в каналі банку.',
            flags: MessageFlags.Ephemeral
        });

        return false;
    }

    if (isQuestCommand(commandName) && QUEST_CHANNEL_ID && interaction.channelId !== QUEST_CHANNEL_ID) {
        await interaction.reply({
            content: '❌ Команди квестів можна використовувати тільки в каналі квестів.',
            flags: MessageFlags.Ephemeral
        });

        return false;
    }

    return true;
}

async function sendReport(manual = false) {
    if (!REPORT_CHANNEL_ID) {
        return { ok: false, message: '❌ REPORT_CHANNEL_ID не доданий у Render.' };
    }

    const date = getKyivDate();
    const stats = await dailyStats.findOne({ date });

    if (!manual && stats?.reportSent) {
        return { ok: false, message: 'ℹ️ Звіт за сьогодні вже був відправлений.' };
    }

    const plus = stats?.plus || 0;
    const minus = stats?.minus || 0;
    const balance = await getBalance();

    const channel = await client.channels.fetch(REPORT_CHANNEL_ID).catch(() => null);

    if (!channel) {
        return { ok: false, message: '❌ Канал для звіту не знайдено.' };
    }

    const embed = new EmbedBuilder()
        .setColor(0xd4af37)
        .setTitle('🏦 Hoffman Bank — Щоденний звіт')
        .setDescription(
            `╔════════════════════╗\n` +
            `        **ФІНАНСОВИЙ ЗВІТ**\n` +
            `╚════════════════════╝\n\n` +
            `📈 **Поповнення за день:**\n` +
            `\`${formatMoney(plus)}\`\n\n` +
            `📉 **Зняття за день:**\n` +
            `\`-${formatMoney(minus)}\`\n\n` +
            `━━━━━━━━━━━━━━━━━━━━\n\n` +
            `💰 **Поточний баланс сейфу:**\n` +
            `\`${formatMoney(balance)}\`\n\n` +
            `🗓 **Дата:** ${date}`
        )
        .setFooter({ text: 'Hoffman Bank • Daily Report' })
        .setTimestamp();

    await channel.send({ embeds: [embed] });

    await dailyStats.updateOne(
        { date },
        { $set: { reportSent: true } },
        { upsert: true }
    );

    await logAction(
        '📊 Звіт банку',
        `Звіт відправлено.\n📈 Поповнення: **${formatMoney(plus)}**\n📉 Зняття: **${formatMoney(minus)}**\n💰 Баланс: **${formatMoney(balance)}**`,
        0xd4af37
    );

    return { ok: true, message: '✅ Звіт відправлено.' };
}

function createApplicationPanelEmbed() {
    return new EmbedBuilder()
        .setColor(HOFFMAN_RED)
        .setTitle('HOFFMAN FAMILY')
        .setDescription(
            `**Не просто сімʼя. Спільнота, у якій кожен має значення.**\n\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `⚪ **НАШІ ЦІННОСТІ**\n\n` +
            `◆ Активність і командна гра\n` +
            `◆ Вірність та взаємоповага\n` +
            `◆ Допомога своїм\n` +
            `◆ Спільний розвиток\n\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `🔴 **ЯК ПРИЄДНАТИСЯ**\n\n` +
            `1. Отримай роль **Гість**\n` +
            `2. Ознайомся з правилами\n` +
            `3. Подай заявку через кнопку нижче\n\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `⚙️ Заповнюй анкету уважно. Заявку розглядає керівництво сімʼї.\n\n` +
            `**Luxury • Loyalty • Respect**`
        )
        .setImage('https://cdn.discordapp.com/attachments/1510979053090242711/1517087759255343194/ChatGPT_Image_7_2026_._14_21_24.png')
        .setFooter({ text: 'Hoffman Family • Recruitment Center' })
        .setTimestamp();
}

function createApplicationPanelButton() {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('get_guest_role')
            .setLabel('Отримати роль')
            .setStyle(ButtonStyle.Success)
            .setEmoji('✅'),

        new ButtonBuilder()
            .setCustomId('show_rules')
            .setLabel('Правила')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('📜'),

        new ButtonBuilder()
            .setCustomId('open_application_modal')
            .setLabel('Подати заявку')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('📨')
    );
}

async function ensureApplicationPanel() {
    const channel = await client.channels.fetch(APPLICATION_PUBLIC_CHANNEL_ID).catch(() => null);

    if (!channel) {
        console.log('Канал для панелі заявок не знайдено.');
        return;
    }

    const settings = await botSettings.findOne({ name: 'application_panel' });
    const embed = createApplicationPanelEmbed();
    const button = createApplicationPanelButton();

    if (settings?.messageId) {
        const oldMessage = await channel.messages.fetch(settings.messageId).catch(() => null);

        if (oldMessage) {
            await oldMessage.edit({
                embeds: [embed],
                components: [button]
            });

            console.log('Панель заявок оновлено.');
            return;
        }
    }

    const message = await channel.send({
        embeds: [embed],
        components: [button]
    });

    await botSettings.updateOne(
        { name: 'application_panel' },
        { $set: { name: 'application_panel', messageId: message.id } },
        { upsert: true }
    );

    console.log('Панель заявок створено.');
}

async function openApplicationModal(interaction) {
    if (interaction.channelId !== APPLICATION_PUBLIC_CHANNEL_ID) {
        return await interaction.reply({
            content: '❌ Подати заявку можна тільки у спеціальному каналі.',
            flags: MessageFlags.Ephemeral
        });
    }

    if (!hasRole(interaction.member, GUEST_ROLE_ID)) {
        return await interaction.reply({
            content: '❌ Подавати заявку можуть тільки користувачі з роллю **Гість**.',
            flags: MessageFlags.Ephemeral
        });
    }

    const modal = new ModalBuilder()
        .setCustomId('hoffman_application')
        .setTitle('Заявка до Hoffman');

    const nickInput = new TextInputBuilder()
        .setCustomId('nick_static')
        .setLabel('Nick Name #static')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    const levelInput = new TextInputBuilder()
        .setCustomId('game_level')
        .setLabel('Ігровий рівень')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    const ageInput = new TextInputBuilder()
        .setCustomId('real_age')
        .setLabel('Реальний вік')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    const onlineInput = new TextInputBuilder()
        .setCustomId('daily_online')
        .setLabel('Добовий онлайн')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    const extraInput = new TextInputBuilder()
        .setCustomId('extra_info')
        .setLabel('Додаткова інформація')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Плюси/мінуси, біо, напрямок, скрін')
        .setRequired(true);

    modal.addComponents(
        new ActionRowBuilder().addComponents(nickInput),
        new ActionRowBuilder().addComponents(levelInput),
        new ActionRowBuilder().addComponents(ageInput),
        new ActionRowBuilder().addComponents(onlineInput),
        new ActionRowBuilder().addComponents(extraInput)
    );

    return await interaction.showModal(modal);
}

async function sendApplicationDM(user, approved) {
    const text = approved
        ? `🏛 Вітаємо, ваша заявка до сімʼї Hoffman була схвалена!\n\n📌 Найближчим часом з вами звʼяжеться один із заступників сімʼї для подальшої співбесіди та введення в курс справ.\n\nПросимо залишатись на звʼязку та перевіряти приватні повідомлення.\n\nЛаскаво просимо до Hoffman Family. 🔥`
        : `🏛 Ваша заявка до сімʼї Hoffman була відхилена.\n\nПричини можуть бути різними:\n• недостатня активність\n• невідповідність вимогам\n• некоректне заповнення анкети\n• або інші внутрішні фактори\n\nВи можете подати повторну заявку пізніше.\n\nБажаємо успіхів та гарної гри. 🤝`;

    await user.send(text).catch(() => null);
}

async function getQuestChannel() {
    if (!QUEST_CHANNEL_ID) return null;
    return await client.channels.fetch(QUEST_CHANNEL_ID).catch(() => null);
}

function createQuestRunningEmbed(quest, userId, userName, note, participants = []) {
    return new EmbedBuilder()
        .setColor(0xd4af37)
        .setTitle('🧩 Hoffman Quest System')
        .setDescription(
            `📌 **Квест:** ${quest.name}\n\n` +
            `👤 **Почав виконання:** <@${userId}>\n` +
            `📝 **Імʼя:** ${userName}\n\n` +
            `👥 **Учасники:** ${participants.length ? participants.map(p => p.mention).join(', ') : `<@${userId}>`}\n\n` +
            `💰 **Нагорода:** \`${formatMoney(quest.reward)}\`\n` +
            `🔄 **Статус:** Виконується\n\n` +
            `🗒 **Примітка:** ${note || '—'}\n\n` +
            `━━━━━━━━━━━━━━━━━━━━\n\n` +
            `✅ Натисніть **Завершити квест**, якщо завдання виконано.\n` +
            `❌ Натисніть **Скасувати квест**, якщо завдання не виконано.`
        )
        .setFooter({ text: 'Hoffman Family • Quest Started' })
        .setTimestamp();
}

function createQuestButtons(key, userId) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`quest_finish:${key}:${userId}`)
            .setLabel('Завершити квест')
            .setStyle(ButtonStyle.Success)
            .setEmoji('✅'),

        new ButtonBuilder()
            .setCustomId(`quest_cancel:${key}:${userId}`)
            .setLabel('Скасувати квест')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('❌')
    );
}

function createQuestAdminButtons(key, userId) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`quest_admin_finish:${key}:${userId}`)
            .setLabel('Адмін завершити')
            .setStyle(ButtonStyle.Success)
            .setEmoji('🛡️'),

        new ButtonBuilder()
            .setCustomId(`quest_admin_cancel:${key}:${userId}`)
            .setLabel('Адмін скасувати')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('⛔'),

        new ButtonBuilder()
            .setCustomId(`quest_admin_transfer:${key}:${userId}`)
            .setLabel('Змінити виконавця')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('🔄')
    );
}

function createDisabledQuestButtons() {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('quest_finished_disabled')
            .setLabel('Завершено')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true),

        new ButtonBuilder()
            .setCustomId('quest_cancelled_disabled')
            .setLabel('Скасовано')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true)
    );
}

async function startQuest(interaction) {
    const questKey = interaction.options.getString('quest');
    const note = interaction.options.getString('note') || '—';

    const quest = await questDefinitions.findOne({ key: questKey });

    if (!quest) {
        return await interaction.reply({
            content: '❌ Такий квест не знайдено.',
            flags: MessageFlags.Ephemeral
        });
    }

    const state = await questStates.findOne({ key: quest.key });
    const now = Date.now();

    if (state?.status === 'running') {
        return await interaction.reply({
            content: `❌ Квест **${quest.name}** вже виконує <@${state.activeUserId}>.`,
            flags: MessageFlags.Ephemeral
        });
    }

    if (state?.status === 'cooldown' && state.cooldownUntil > now) {
        return await interaction.reply({
            content:
                `🔒 Квест **${quest.name}** зараз на відкаті.\n` +
                `⏳ Залишилось: **${formatDuration(state.cooldownUntil - now)}**\n` +
                `✅ Доступний: **${getKyivDateTime(state.cooldownUntil)}**`,
            flags: MessageFlags.Ephemeral
        });
    }

    const channel = await getQuestChannel();

    if (!channel) {
        return await interaction.reply({
            content: '❌ Канал квестів не знайдено. Перевір QUEST_CHANNEL_ID.',
            flags: MessageFlags.Ephemeral
        });
    }

    const userName = interaction.member?.displayName || interaction.user.username;
    const participants = getQuestParticipantsFromInteraction(interaction);

    const message = await channel.send({
        embeds: [createQuestRunningEmbed(quest, interaction.user.id, userName, note, participants)],
        components: [createQuestButtons(quest.key, interaction.user.id), createQuestAdminButtons(quest.key, interaction.user.id)]
    });

    await questStates.updateOne(
        { key: quest.key },
        {
            $set: {
                key: quest.key,
                status: 'running',
                activeUserId: interaction.user.id,
                activeUserName: userName,
                participants,
                messageId: message.id,
                cooldownUntil: null,
                reminder2hSent: false,
                availableSent: false,
                startedAt: now,
                note
            }
        },
        { upsert: true }
    );

    await logAction(
        '🧩 Квест запущено',
        `📌 Квест: **${quest.name}**\n👤 Почав: <@${interaction.user.id}>\n💰 Нагорода: **${formatMoney(quest.reward)}**`,
        0xd4af37
    );

    return await interaction.reply({
        content: `✅ Квест **${quest.name}** запущено.`,
        flags: MessageFlags.Ephemeral
    });
}

async function completeOrCancelQuest(interaction, completed, forceByAdmin = false) {
    const parts = interaction.customId.split(':');
    const key = parts[1];
    const starterId = parts[2];
    const isStarter = interaction.user.id === starterId;
    const isAdmin = hasReviewAccess(interaction.member);
    const localLockKey = `${key}:${interaction.message.id}`;

    if (!isStarter && !isAdmin) {
        return await interaction.reply({
            content: '❌ Завершити або скасувати цей квест може тільки той, хто його почав, або 9/10 ранг.',
            flags: MessageFlags.Ephemeral
        });
    }

    forceByAdmin = forceByAdmin || (!isStarter && isAdmin);

    if (questProcessingLocks.has(localLockKey)) {
        return await interaction.reply({
            content: '⏳ Ця дія вже обробляється. Повторне натискання не буде зараховано.',
            flags: MessageFlags.Ephemeral
        }).catch(() => null);
    }

    questProcessingLocks.add(localLockKey);

    try {
        const quest = await questDefinitions.findOne({ key });

        if (!quest) {
            return await interaction.reply({
                content: '❌ Цей квест не знайдено в базі.',
                flags: MessageFlags.Ephemeral
            });
        }

        // Одразу підтверджуємо interaction, щоб Discord не вважав кнопку завислою.
        await interaction.deferUpdate();

        // Головний захист від задвоєння:
        // лише ПЕРШИЙ запит атомарно переводить running -> processing.
        // Усі повторні кліки отримають null і не дійдуть до нарахування.
        const state = await questStates.findOneAndUpdate(
            {
                key,
                status: 'running'
            },
            {
                $set: {
                    status: 'processing',
                    processingInteractionId: interaction.id,
                    processingUserId: interaction.user.id,
                    processingStartedAt: Date.now(),
                    processingAction: completed ? 'complete' : 'cancel',
                    forceByAdmin: Boolean(forceByAdmin)
                }
            },
            {
                returnDocument: 'before'
            }
        );

        if (!state) {
            const latestState = await questStates.findOne({ key });

            if (latestState?.status === 'cooldown' && latestState.cooldownUntil) {
                const balance = await getBalance();
                const wasCompleted = Boolean(latestState.completed);
                const participants = latestState.participants?.length
                    ? latestState.participants
                    : [{ mention: `<@${latestState.activeUserId || starterId}>` }];

                const embed = new EmbedBuilder()
                    .setColor(wasCompleted ? 0x00ff88 : 0xff3333)
                    .setTitle(wasCompleted ? 'КВЕСТ ВЖЕ ВИКОНАНО' : 'КВЕСТ ВЖЕ СКАСОВАНО')
                    .setDescription(
                        `📌 **Квест:** ${quest.name}\n` +
                        `👤 **Починав:** <@${latestState.activeUserId || starterId}>\n` +
                        `👥 **Учасники:** ${participants.map(p => p.mention).join(', ')}\n\n` +
                        `💰 **Баланс сейфу:** \`${formatMoney(balance)}\`\n` +
                        `🔒 **Наступна доступність:** ${getKyivDateTime(latestState.cooldownUntil)}\n\n` +
                        `ℹ️ Повторне натискання проігноровано. Гроші та квитки повторно не нараховувалися.`
                    )
                    .setFooter({ text: 'Hoffman Family • Quest System' })
                    .setTimestamp();

                await interaction.message.edit({
                    embeds: [embed],
                    components: [createDisabledQuestButtons()]
                }).catch(() => null);

                return;
            }

            // Інший запит уже заблокував цей квест у processing.
            await interaction.message.edit({
                components: [createDisabledQuestButtons()]
            }).catch(() => null);

            return;
        }

        const cooldownUntil = Date.now() + quest.cooldownHours * 60 * 60 * 1000;
        let newBalance = await getBalance();

        const participants = state.participants?.length
            ? state.participants
            : [{
                id: state.activeUserId || interaction.user.id,
                mention: `<@${state.activeUserId || interaction.user.id}>`,
                name: state.activeUserName || interaction.member?.displayName || interaction.user.username
            }];

        if (completed) {
            newBalance = await changeBalance(quest.reward);
            await addDailyStat('plus', quest.reward);

            await recordBankOperation({
                type: 'plus',
                amount: quest.reward,
                category: 'quest',
                note: `Квест: ${quest.name}`,
                userId: state.activeUserId || interaction.user.id,
                userName: `<@${state.activeUserId || interaction.user.id}>`,
                displayName: state.activeUserName || interaction.member?.displayName || interaction.user.username,
                role: 'Quest System',
                balanceAfter: newBalance,
                source: 'quest',
                operationKey: `quest:${key}:${state.startedAt || state.messageId}`
            });

            await addLotteryTicketsForQuest(participants, quest.name);
            await updateFinanceCrmPanel();
        }

        // Завершуємо лише той processing, який створила саме ця interaction.
        await questStates.updateOne(
            {
                key,
                status: 'processing',
                processingInteractionId: interaction.id
            },
            {
                $set: {
                    status: 'cooldown',
                    cooldownUntil,
                    reminder2hSent: false,
                    availableSent: false,
                    completedAt: Date.now(),
                    completed,
                    processedBy: interaction.user.id
                },
                $unset: {
                    processingInteractionId: '',
                    processingUserId: '',
                    processingStartedAt: '',
                    processingAction: ''
                }
            }
        );

        const embed = new EmbedBuilder()
            .setColor(completed ? 0x00ff88 : 0xff3333)
            .setTitle(completed ? 'КВЕСТ ВИКОНАНО' : 'КВЕСТ СКАСОВАНО')
            .setDescription(
                `📌 **Квест:** ${quest.name}\n` +
                `👤 **Учасник:** <@${state.activeUserId || interaction.user.id}>\n` +
                `👥 **Квитки отримали:** ${completed ? participants.map(p => p.mention).join(', ') : '—'}\n\n` +
                `💰 **Нараховано в банк:** \`${completed ? formatMoney(quest.reward) : '$0'}\`\n` +
                `💰 **Баланс сейфу:** \`${formatMoney(newBalance)}\`\n\n` +
                `🔒 **Відкат:** ${quest.cooldownHours} годин\n` +
                `✅ **Наступна доступність:** ${getKyivDateTime(cooldownUntil)}`
            )
            .setFooter({ text: 'Hoffman Family • Quest System' })
            .setTimestamp();

        await interaction.message.edit({
            embeds: [embed],
            components: [createDisabledQuestButtons()]
        });

        await logAction(
            completed ? '✅ Квест виконано' : '❌ Квест скасовано',
            `📌 Квест: **${quest.name}**\n👤 Учасник: <@${state.activeUserId || interaction.user.id}>\n💰 Нараховано: **${completed ? formatMoney(quest.reward) : '$0'}**\n🎟 Квитки: **${completed ? participants.length : 0}**\n🔒 Наступна доступність: **${getKyivDateTime(cooldownUntil)}**`,
            completed ? 0x00ff88 : 0xff3333
        );
    } catch (error) {
        console.error(`Помилка обробки квесту ${key}:`, error);

        // Не повертаємо processing назад у running автоматично:
        // це виключає повторне нарахування, якщо помилка сталася вже після зміни балансу.
        await questStates.updateOne(
            {
                key,
                status: 'processing'
            },
            {
                $set: {
                    status: 'processing_error',
                    processingErrorAt: Date.now(),
                    processingError: String(error?.message || error).slice(0, 500)
                }
            }
        ).catch(() => null);

        await logAction(
            '⚠️ Помилка обробки квесту',
            `📌 Квест: **${key}**\n👤 Interaction: **${interaction.id}**\n📝 ${String(error?.message || error).slice(0, 800)}\n\nКвест заблоковано від повторного нарахування та потребує перевірки керівництвом.`,
            0xff9900
        ).catch(() => null);

        if (!interaction.deferred && !interaction.replied) {
            await interaction.reply({
                content: '⚠️ Під час обробки сталася помилка. Повторне натискання заблоковано, щоб не задвоїти нагороду.',
                flags: MessageFlags.Ephemeral
            }).catch(() => null);
        }
    } finally {
        questProcessingLocks.delete(localLockKey);
    }
}

async function openQuestTransferModal(interaction) {
    if (!hasReviewAccess(interaction.member)) {
        return await interaction.reply({
            content: '❌ Змінювати виконавця квесту можуть тільки 9/10 ранг.',
            flags: MessageFlags.Ephemeral
        });
    }

    const parts = interaction.customId.split(':');
    const key = parts[1];

    const modal = new ModalBuilder()
        .setCustomId(`quest_transfer_modal:${key}`)
        .setTitle('Змінити виконавця квесту');

    const userInput = new TextInputBuilder()
        .setCustomId('quest_new_executor')
        .setLabel('Новий виконавець')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Вставте @user або Discord ID')
        .setRequired(true);

    const reasonInput = new TextInputBuilder()
        .setCustomId('quest_transfer_reason')
        .setLabel('Причина зміни')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Наприклад: попередній виконавець вийшов з гри')
        .setRequired(false);

    modal.addComponents(
        new ActionRowBuilder().addComponents(userInput),
        new ActionRowBuilder().addComponents(reasonInput)
    );

    return await interaction.showModal(modal);
}

async function handleQuestTransferModal(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    if (!hasReviewAccess(interaction.member)) {
        return await interaction.editReply({
            content: '❌ Змінювати виконавця квесту можуть тільки 9/10 ранг.'
        });
    }

    const key = interaction.customId.split(':')[1];
    const rawUser = interaction.fields.getTextInputValue('quest_new_executor').trim();
    const reason = interaction.fields.getTextInputValue('quest_transfer_reason')?.trim() || '—';
    const userMatch = rawUser.match(/<@!?(\d+)>/) || rawUser.match(/^(\d{15,25})$/);

    if (!userMatch) {
        return await interaction.editReply({
            content: '❌ Не вдалося визначити користувача. Вставте mention або Discord ID.'
        });
    }

    const newUserId = userMatch[1];
    const quest = await questDefinitions.findOne({ key });
    const state = await questStates.findOne({ key });

    if (!quest || !state || state.status !== 'running') {
        return await interaction.editReply({
            content: '❌ Активний квест не знайдено або він вже не виконується.'
        });
    }

    const member = await interaction.guild.members.fetch(newUserId).catch(() => null);
    const newUserName = member?.displayName || `User ${newUserId}`;
    const oldUserId = state.activeUserId;
    const oldUserName = state.activeUserName || '—';

    let participants = state.participants?.length ? state.participants : [];

    if (!participants.some(p => p.id === newUserId)) {
        participants.push({
            id: newUserId,
            mention: `<@${newUserId}>`,
            name: newUserName
        });
    }

    participants = uniqueParticipants(participants).slice(0, 10);

    await questStates.updateOne(
        { key },
        {
            $set: {
                activeUserId: newUserId,
                activeUserName: newUserName,
                participants,
                transferredAt: Date.now(),
                transferredBy: interaction.user.id,
                transferReason: reason
            }
        }
    );

    const channel = await getQuestChannel();
    const message = channel && state.messageId
        ? await channel.messages.fetch(state.messageId).catch(() => null)
        : interaction.message;

    if (message) {
        await message.edit({
            embeds: [createQuestRunningEmbed(quest, newUserId, newUserName, state.note || reason, participants)],
            components: [createQuestButtons(quest.key, newUserId), createQuestAdminButtons(quest.key, newUserId)]
        }).catch(() => null);
    }

    await logAction(
        '🔄 Виконавця квесту змінено',
        `📌 Квест: **${quest.name}**
👤 Було: <@${oldUserId}> (${oldUserName})
👤 Стало: <@${newUserId}> (${newUserName})
📝 Причина: ${reason}
🛡 Змінив: **${interaction.member?.displayName || interaction.user.username}**`,
        0xffcc00
    );

    return await interaction.editReply({
        content: `✅ Виконавця квесту **${quest.name}** змінено на <@${newUserId}>.`
    });
}

async function sendQuestStatus(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const quests = await questDefinitions.find({}).toArray();
    const now = Date.now();

    let text = '';

    for (const quest of quests) {
        const state = await questStates.findOne({ key: quest.key });

        if (!state || state.status === 'available') {
            text += `✅ **${quest.name}** — доступний\n`;
            continue;
        }

        if (state.status === 'running') {
            text += `🔄 **${quest.name}** — виконує <@${state.activeUserId}>\n`;
            continue;
        }

        if (state.status === 'cooldown') {
            if (state.cooldownUntil <= now) {
                text += `✅ **${quest.name}** — доступний\n`;
            } else {
                text += `🔒 **${quest.name}** — доступний через **${formatDuration(state.cooldownUntil - now)}**\n`;
            }
        }
    }

    const embed = new EmbedBuilder()
        .setColor(0xd4af37)
        .setTitle('🧩 Hoffman Quest Status')
        .setDescription(text || 'Квести не знайдено.')
        .setFooter({ text: 'Hoffman Family • Quest System' })
        .setTimestamp();

    return await interaction.editReply({ embeds: [embed] });
}

async function addQuest(interaction) {
    const name = interaction.options.getString('name');
    const reward = interaction.options.getInteger('reward');
    const cooldownHours = interaction.options.getInteger('cooldown_hours');

    const key = makeQuestKey(name);

    await questDefinitions.updateOne(
        { key },
        { $set: { key, name, reward, cooldownHours } },
        { upsert: true }
    );

    await questStates.updateOne(
        { key },
        {
            $setOnInsert: {
                key,
                status: 'available',
                cooldownUntil: null,
                activeUserId: null,
                activeUserName: null,
                messageId: null,
                reminder2hSent: false,
                availableSent: false
            }
        },
        { upsert: true }
    );

    await logAction(
        '➕ Квест додано/оновлено',
        `📌 Квест: **${name}**\n💰 Нагорода: **${formatMoney(reward)}**\n🔒 КД: **${cooldownHours} год.**\n👤 Додав/оновив: **${interaction.member.displayName}**`,
        0xd4af37
    );

    return await interaction.reply({
        content:
            `✅ Квест додано/оновлено:\n` +
            `📌 **${name}**\n` +
            `💰 Нагорода: **${formatMoney(reward)}**\n` +
            `🔒 КД: **${cooldownHours} год.**`,
        flags: MessageFlags.Ephemeral
    });
}

async function checkQuestCooldowns() {
    if (!QUEST_CHANNEL_ID || !questStates || !questDefinitions) return;

    const channel = await getQuestChannel();
    if (!channel) return;

    const now = Date.now();
    const states = await questStates.find({ status: 'cooldown' }).toArray();

    for (const state of states) {
        const quest = await questDefinitions.findOne({ key: state.key });
        if (!quest || !state.cooldownUntil) continue;

        const remaining = state.cooldownUntil - now;

        if (remaining <= 0) {
            if (!state.availableSent) {
                await channel.send({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0x00ff88)
                            .setTitle('✅ КВЕСТ ДОСТУПНИЙ')
                            .setDescription(
                                `📌 **${quest.name}** знову доступний для виконання.\n\n` +
                                `Можна запускати через команду **/quests**.`
                            )
                            .setFooter({ text: 'Hoffman Family • Quest Available' })
                            .setTimestamp()
                    ]
                });
            }

            await questStates.updateOne(
                { key: state.key },
                {
                    $set: {
                        status: 'available',
                        activeUserId: null,
                        activeUserName: null,
                        cooldownUntil: null,
                        reminder2hSent: false,
                        availableSent: true
                    }
                }
            );

            continue;
        }

        if (remaining <= 2 * 60 * 60 * 1000 && !state.reminder2hSent) {
            await channel.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0xffcc00)
                        .setTitle('🔔 Hoffman Quest Notification')
                        .setDescription(
                            `📌 **Квест:** ${quest.name}\n\n` +
                            `⏳ До завершення відкату залишилось приблизно **2 години**.\n` +
                            `✅ Скоро квест знову буде доступний.`
                        )
                        .setFooter({ text: 'Hoffman Family • Quest Cooldown' })
                        .setTimestamp()
                ]
            });

            await questStates.updateOne(
                { key: state.key },
                { $set: { reminder2hSent: true } }
            );
        }
    }
}

async function sendQuestAutocomplete(interaction) {
    const focused = interaction.options.getFocused().toLowerCase();
    const quests = await questDefinitions.find({}).toArray();

    const filtered = quests
        .filter(q => q.name.toLowerCase().includes(focused))
        .slice(0, 25)
        .map(q => ({
            name: `${q.name} — ${formatMoney(q.reward)}`,
            value: q.key
        }));

    await interaction.respond(filtered).catch(() => {});
}

function normalizeBirthday(value) {
    const cleaned = value.trim().replace(/\s/g, '');
    const match = cleaned.match(/^(\d{1,2})[./-](\d{1,2})$/);

    if (!match) return null;

    const day = Number(match[1]);
    const month = Number(match[2]);

    if (month < 1 || month > 12) return null;

    const daysInMonth = {
        1: 31,
        2: 29,
        3: 31,
        4: 30,
        5: 31,
        6: 30,
        7: 31,
        8: 31,
        9: 30,
        10: 31,
        11: 30,
        12: 31
    };

    if (day < 1 || day > daysInMonth[month]) return null;

    return `${String(day).padStart(2, '0')}.${String(month).padStart(2, '0')}`;
}

function getKyivDayMonthYear() {
    const parts = new Intl.DateTimeFormat('uk-UA', {
        timeZone: 'Europe/Kyiv',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    }).formatToParts(new Date());

    return {
        day: parts.find(p => p.type === 'day').value,
        month: parts.find(p => p.type === 'month').value,
        year: parts.find(p => p.type === 'year').value
    };
}

async function createBirthdayPanelEmbed() {
    const list = await birthdays.find({}).sort({ birthdaySort: 1, name: 1 }).toArray();

    let text = '';

    if (!list.length) {
        text = 'Поки що список днів народження порожній.';
    } else {
        text = list
            .map(item => `🎂 **${item.birthday}** — ${item.name}`)
            .join('\n');
    }

    return new EmbedBuilder()
        .setColor(HOFFMAN_RED)
        .setTitle('HOFFMAN BIRTHDAY CENTER')
        .setDescription(
            `**Памʼятаємо важливі дати кожного учасника сімʼї.**\n\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `⚪ **КАЛЕНДАР ДНІВ НАРОДЖЕННЯ**\n\n` +
            `${text}\n\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `🔴 Всього записів: **${list.length}**\n\n` +
            `➕ **Додати** — внести день народження\n` +
            `➖ **Видалити** — прибрати запис`
        )
        .setImage('https://cdn.discordapp.com/attachments/1510979053090242711/1517095364862414930/ChatGPT_Image_18_._2026_._12_14_48.png')
        .setFooter({ text: 'Hoffman Family • Birthday Center' })
        .setTimestamp();
}

function createBirthdayButtons() {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('birthday_add')
            .setLabel('Додати')
            .setStyle(ButtonStyle.Success)
            .setEmoji('➕'),

        new ButtonBuilder()
            .setCustomId('birthday_remove')
            .setLabel('Видалити')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('➖')
    );
}

async function ensureBirthdayPanel() {
    const channel = await client.channels.fetch(BIRTHDAY_CHANNEL_ID).catch(() => null);

    if (!channel) {
        console.log('Канал днів народження не знайдено.');
        return;
    }

    const settings = await botSettings.findOne({ name: 'birthday_panel' });
    const embed = await createBirthdayPanelEmbed();
    const buttons = createBirthdayButtons();

    if (settings?.messageId) {
        const oldMessage = await channel.messages.fetch(settings.messageId).catch(() => null);

        if (oldMessage) {
            await oldMessage.edit({
                embeds: [embed],
                components: [buttons]
            });

            console.log('Панель днів народження оновлено.');
            return;
        }
    }

    const message = await channel.send({
        embeds: [embed],
        components: [buttons]
    });

    await botSettings.updateOne(
        { name: 'birthday_panel' },
        { $set: { name: 'birthday_panel', messageId: message.id } },
        { upsert: true }
    );

    console.log('Панель днів народження створено.');
}

async function updateBirthdayPanel() {
    await ensureBirthdayPanel();
}

async function openBirthdayAddModal(interaction) {
    if (!hasReviewAccess(interaction.member)) {
        return await interaction.reply({
            content: '❌ Додавати дні народження можуть тільки 9/10 ранг.',
            flags: MessageFlags.Ephemeral
        });
    }

    const modal = new ModalBuilder()
        .setCustomId('birthday_add_modal')
        .setTitle('Додати день народження');

    const nameInput = new TextInputBuilder()
        .setCustomId('birthday_name')
        .setLabel('Імʼя / Nick')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Наприклад: Hans Hoffman')
        .setRequired(true);

    const dateInput = new TextInputBuilder()
        .setCustomId('birthday_date')
        .setLabel('Дата народження')
        .setPlaceholder('Наприклад: 02.05')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    modal.addComponents(
        new ActionRowBuilder().addComponents(nameInput),
        new ActionRowBuilder().addComponents(dateInput)
    );

    return await interaction.showModal(modal);
}

async function openBirthdayRemoveModal(interaction) {
    if (!hasReviewAccess(interaction.member)) {
        return await interaction.reply({
            content: '❌ Видаляти дні народження можуть тільки 9/10 ранг.',
            flags: MessageFlags.Ephemeral
        });
    }

    const modal = new ModalBuilder()
        .setCustomId('birthday_remove_modal')
        .setTitle('Видалити день народження');

    const nameInput = new TextInputBuilder()
        .setCustomId('birthday_remove_name')
        .setLabel('Імʼя / Nick для видалення')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Наприклад: Hans Hoffman')
        .setRequired(true);

    modal.addComponents(
        new ActionRowBuilder().addComponents(nameInput)
    );

    return await interaction.showModal(modal);
}

async function checkBirthdays() {
    if (!birthdays) return;

    const { day, month, year } = getKyivDayMonthYear();
    const { hour, minute } = getKyivTime();

    if (hour !== 9 || minute > 10) return;

    const today = `${day}.${month}`;
    const list = await birthdays.find({ birthday: today }).toArray();

    if (!list.length) return;

    const newsChannel = await client.channels.fetch(BIRTHDAY_NEWS_CHANNEL_ID).catch(() => null);
    if (!newsChannel) return;

    for (const person of list) {
        if (person.lastCongratulatedYear === year) continue;

        const embed = new EmbedBuilder()
            .setColor(0xd4af37)
            .setTitle('🎉 Hoffman Family вітає з днем народження!')
            .setDescription(
                `Сьогодні день народження у **${person.name}**! 🎂\n\n` +
                `Бажаємо міцного здоровʼя, гарного настрою, успіхів, великих перемог та тільки приємних моментів у грі й житті.\n\n` +
                `🏛 **Hoffman Family**\n` +
                `Luxury • Loyalty • Respect`
            )
            .setFooter({ text: 'Hoffman Family • Birthday Notification' })
            .setTimestamp();

        await newsChannel.send({ embeds: [embed] });

        await birthdays.updateOne(
            { _id: person._id },
            { $set: { lastCongratulatedYear: year } }
        );

        await logAction(
            '🎂 Автопривітання',
            `Бот привітав **${person.name}** з днем народження.`,
            0xd4af37
        );
    }
}


function getKyivDayKey() {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Europe/Kyiv',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).format(new Date());
}

function getKyivWeekdayNumber() {
    const { day, month, year } = getKyivDayMonthYear();
    return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day))).getUTCDay();
}

function randomPrizeAmount(min, max, step = 100000) {
    const safeMin = Math.max(0, Number(min) || 0);
    const safeMax = Math.max(safeMin, Number(max) || safeMin);
    const safeStep = Math.max(1, Number(step) || 100000);
    const count = Math.floor((safeMax - safeMin) / safeStep);
    return safeMin + Math.floor(Math.random() * (count + 1)) * safeStep;
}

function uniqueParticipants(list) {
    const seen = new Set();
    const result = [];

    for (const item of list) {
        if (!item?.id || seen.has(item.id)) continue;
        seen.add(item.id);
        result.push(item);
    }

    return result;
}

function getQuestParticipantsFromInteraction(interaction) {
    const participants = [{
        id: interaction.user.id,
        mention: `<@${interaction.user.id}>`,
        name: interaction.member?.displayName || interaction.user.username
    }];

    for (let i = 1; i <= 10; i++) {
        const user = interaction.options.getUser(`member${i}`);
        const member = interaction.options.getMember(`member${i}`);

        if (!user || user.bot) continue;

        participants.push({
            id: user.id,
            mention: `<@${user.id}>`,
            name: member?.displayName || user.username
        });
    }

    return uniqueParticipants(participants);
}

async function getLotterySettings() {
    let settings = await lotterySettings.findOne({ name: 'weekly_lottery' });

    if (!settings) {
        await lotterySettings.updateOne(
            { name: 'weekly_lottery' },
            {
                $setOnInsert: {
                    name: 'weekly_lottery',
                    enabled: true,
                    minPrize: 500000,
                    maxPrize: 1000000,
                    prizeStep: 100000,
                    prizeType: 'money',
                    manualPrizeName: null,
                    manualPrizeDescription: null,
                    lastAutoDrawDate: null,
                    lotteryPanelMessageId: null,
                    lotteryCrmMessageId: null
                }
            },
            { upsert: true }
        );

        settings = await lotterySettings.findOne({ name: 'weekly_lottery' });
    }

    return settings;
}

async function getLotteryStats() {
    const rows = await lotteryTickets.find({ weeklyTickets: { $gt: 0 } }).sort({ weeklyTickets: -1 }).toArray();
    const totalTickets = rows.reduce((sum, item) => sum + (item.weeklyTickets || 0), 0);

    return {
        rows,
        totalTickets,
        participants: rows.length
    };
}

async function addLotteryTicket(userId, userName, source, count = 1) {
    await lotteryTickets.updateOne(
        { userId },
        {
            $set: { userId, userName, updatedAt: Date.now() },
            $inc: { weeklyTickets: count, totalTickets: count },
            $push: { history: { source, count, date: Date.now() } }
        },
        { upsert: true }
    );
}

async function addLotteryTicketsForQuest(participants, questName) {
    for (const participant of participants) {
        await addLotteryTicket(participant.id, participant.name, `Квест: ${questName}`, 1);
    }

    await logAction(
        '🎟 Видано квитки лотереї',
        participants.map(p => `${p.mention} — **+1 квиток**`).join('\n') + `\n\n📌 Джерело: **${questName}**`,
        0xd4af37
    );

    await updateLotteryPanels();
}

function getLotteryPrizeText(settings) {
    if (settings.prizeType === 'manual') {
        return `🎁 **${settings.manualPrizeName || 'Ручний приз'}**\n${settings.manualPrizeDescription || 'Опис не вказано.'}`;
    }

    return `💰 **Випадкова сума:** ${formatMoney(settings.minPrize)} – ${formatMoney(settings.maxPrize)}`;
}

async function createLotteryPanelEmbed() {
    const settings = await getLotterySettings();
    const stats = await getLotteryStats();

    return new EmbedBuilder()
        .setColor(HOFFMAN_RED)
        .setTitle('HOFFMAN WEEKLY LOTTERY')
        .setDescription(
            `**Виконуй завдання, збирай квитки та забирай приз тижня.**\n\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `⚪ **ГОЛОВНА ІНФОРМАЦІЯ**\n\n` +
            `📅 Розіграш: **щонеділі о 21:00**\n` +
            `🎁 Приз тижня:\n${getLotteryPrizeText(settings)}\n\n` +
            `🎟 Квитки нараховуються за виконані квести та Daily Tasks.\n` +
            `Чим більше квитків — тим вищий шанс на перемогу.\n\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `🔴 **ПОТОЧНА СТАТИСТИКА**\n\n` +
            `👥 Учасників: **${stats.participants}**\n` +
            `🎟 Квитків у розіграші: **${stats.totalTickets}**\n\n` +
            `⚙️ Перевір свої квитки кнопкою нижче.`
        )
        .setImage('https://cdn.discordapp.com/attachments/1510979053090242711/1517095365680168971/ChatGPT_Image_18_._2026_._11_58_55.png')
        .setFooter({ text: 'Hoffman Family • Weekly Lottery' })
        .setTimestamp();
}

function createLotteryPanelButtons() {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('lottery_my_tickets').setLabel('Мої квитки').setStyle(ButtonStyle.Primary).setEmoji('🎟'),
        new ButtonBuilder().setCustomId('lottery_participants').setLabel('Учасники').setStyle(ButtonStyle.Secondary).setEmoji('📊'),
        new ButtonBuilder().setCustomId('lottery_history').setLabel('Переможці').setStyle(ButtonStyle.Secondary).setEmoji('🏆')
    );
}

async function ensureLotteryPanel() {
    const channel = await client.channels.fetch(LOTTERY_CHANNEL_ID).catch(() => null);
    if (!channel) {
        console.log('Канал розіграшів не знайдено.');
        return;
    }

    const settings = await getLotterySettings();
    const embed = await createLotteryPanelEmbed();
    const buttons = createLotteryPanelButtons();

    if (settings?.lotteryPanelMessageId) {
        const oldMessage = await channel.messages.fetch(settings.lotteryPanelMessageId).catch(() => null);

        if (oldMessage) {
            await oldMessage.edit({ embeds: [embed], components: [buttons] });
            console.log('Панель лотереї оновлено.');
            return;
        }
    }

    const message = await channel.send({ embeds: [embed], components: [buttons] });

    await lotterySettings.updateOne(
        { name: 'weekly_lottery' },
        { $set: { lotteryPanelMessageId: message.id } },
        { upsert: true }
    );

    console.log('Панель лотереї створено.');
}

async function createLotteryCrmEmbed() {
    const settings = await getLotterySettings();
    const stats = await getLotteryStats();
    const balance = await getBalance();

    return new EmbedBuilder()
        .setColor(HOFFMAN_RED)
        .setTitle('HOFFMAN LOTTERY CRM')
        .setDescription(
            `**Панель керування щотижневим розіграшем**\n\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `**ПОТОЧНИЙ СТАН**\n\n` +
            `📌 Система: ${settings.enabled ? '🟢 **увімкнена**' : '🔴 **вимкнена**'}\n` +
            `📅 Авторозіграш: **щонеділі о 21:00**\n` +
            `🎁 Активний приз:\n${getLotteryPrizeText(settings)}\n\n` +
            `👥 Учасників: **${stats.participants}**\n` +
            `🎟 Квитків: **${stats.totalTickets}**\n` +
            `💰 Баланс банку: \`${formatMoney(balance)}\`\n\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `**КЕРУВАННЯ**\n\n` +
            `▶️ Провести розіграш вручну\n` +
            `🎁 Встановити предметний приз\n` +
            `💰 Налаштувати грошовий приз\n` +
            `🎟 Видати або забрати квитки\n` +
            `🗑 Скинути квитки поточного тижня`
        )
        .setFooter({ text: 'Hoffman Family • Lottery CRM' })
        .setTimestamp();
}

function createLotteryCrmButtons() {
    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('lottery_admin_run').setLabel('Провести зараз').setStyle(ButtonStyle.Success).setEmoji('▶️'),
        new ButtonBuilder().setCustomId('lottery_admin_money').setLabel('Грошовий приз').setStyle(ButtonStyle.Primary).setEmoji('💰'),
        new ButtonBuilder().setCustomId('lottery_admin_prize').setLabel('Додати приз').setStyle(ButtonStyle.Primary).setEmoji('🎁')
    );

    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('lottery_admin_add_tickets').setLabel('Видати квитки').setStyle(ButtonStyle.Secondary).setEmoji('🎟'),
        new ButtonBuilder().setCustomId('lottery_admin_stats').setLabel('Статистика').setStyle(ButtonStyle.Secondary).setEmoji('📊'),
        new ButtonBuilder().setCustomId('lottery_admin_reset').setLabel('Скинути квитки').setStyle(ButtonStyle.Danger).setEmoji('🗑')
    );

    const row3 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('lottery_admin_enable')
            .setLabel('Увімкнути')
            .setStyle(ButtonStyle.Success)
            .setEmoji('🟢'),

        new ButtonBuilder()
            .setCustomId('lottery_admin_disable')
            .setLabel('Вимкнути')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('🔴'),

        new ButtonBuilder()
            .setCustomId('lottery_admin_remove_tickets')
            .setLabel('Забрати квитки')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('➖')
    );
    
    return [row1, row2, row3];
}

async function ensureLotteryCrmPanel() {
    const channel = await client.channels.fetch(LOTTERY_CRM_CHANNEL_ID).catch(() => null);
    if (!channel) {
        console.log('CRM канал лотереї не знайдено.');
        return;
    }

    const settings = await getLotterySettings();
    const embed = await createLotteryCrmEmbed();
    const buttons = createLotteryCrmButtons();

    if (settings?.lotteryCrmMessageId) {
        const oldMessage = await channel.messages.fetch(settings.lotteryCrmMessageId).catch(() => null);

        if (oldMessage) {
            await oldMessage.edit({ embeds: [embed], components: buttons });
            console.log('CRM панель лотереї оновлено.');
            return;
        }
    }

    const message = await channel.send({ embeds: [embed], components: buttons });

    await lotterySettings.updateOne(
        { name: 'weekly_lottery' },
        { $set: { lotteryCrmMessageId: message.id } },
        { upsert: true }
    );

    console.log('CRM панель лотереї створено.');
}

async function updateLotteryPanels() {
    await ensureLotteryPanel();
    await ensureLotteryCrmPanel();
}

function pickWeightedWinner(rows) {
    const pool = [];

    for (const row of rows) {
        for (let i = 0; i < (row.weeklyTickets || 0); i++) {
            pool.push(row);
        }
    }

    if (!pool.length) return null;

    return pool[Math.floor(Math.random() * pool.length)];
}

async function runLotteryDraw(triggeredBy = 'auto') {
    const settings = await getLotterySettings();

    if (!settings.enabled) {
        return { ok: false, message: '🔴 Лотерея зараз вимкнена.' };
    }

    const stats = await getLotteryStats();

    if (!stats.totalTickets || !stats.rows.length) {
        const channel = await client.channels.fetch(LOTTERY_RESULTS_CHANNEL_ID).catch(() => null);
        if (channel) {
            await channel.send({
                embeds: [new EmbedBuilder()
                    .setColor(0xffcc00)
                    .setTitle('🎰 HOFFMAN WEEKLY LOTTERY')
                    .setDescription(`Цього тижня розіграш не відбувся.\n\nПричина: немає учасників з квитками.\n\n🎟 Нагадування: **1 виконаний квест = 1 квиток**.`)
                    .setFooter({ text: 'Hoffman Family • Weekly Lottery' })
                    .setTimestamp()]
            });
        }
        return { ok: false, message: 'Немає учасників з квитками.' };
    }

    const winner = pickWeightedWinner(stats.rows);
    if (!winner) return { ok: false, message: 'Не вдалося обрати переможця.' };

    let prizeAmount = 0;
    let prizeText = '';

    if (settings.prizeType === 'manual') {
        prizeText = `🎁 ${settings.manualPrizeName || 'Ручний приз'}`;
        if (settings.manualPrizeDescription) prizeText += `\n${settings.manualPrizeDescription}`;
    } else {
        prizeAmount = randomPrizeAmount(settings.minPrize, settings.maxPrize, settings.prizeStep);
        const balance = await getBalance();

        if (balance < prizeAmount) {
            const channel = await client.channels.fetch(LOTTERY_RESULTS_CHANNEL_ID).catch(() => null);
            if (channel) {
                await channel.send({
                    embeds: [new EmbedBuilder()
                        .setColor(0xff3333)
                        .setTitle('⚠️ HOFFMAN WEEKLY LOTTERY')
                        .setDescription(
                            `Цієї неділі розіграш не було проведено.\n\n` +
                            `Причина: у сімейному банку недостатньо коштів для призового фонду.\n\n` +
                            `💰 **Поточний баланс:** ${formatMoney(balance)}\n` +
                            `🎁 **Необхідно для призу:** ${formatMoney(prizeAmount)}\n\n` +
                            `Квитки учасників збережено до наступного розіграшу.`
                        )
                        .setFooter({ text: 'Hoffman Family • Weekly Lottery' })
                        .setTimestamp()]
                });
            }

            await logAction(
                '⚠️ Лотерею не проведено',
                `Недостатньо коштів у банку.\nБаланс: **${formatMoney(balance)}**\nПотрібно: **${formatMoney(prizeAmount)}**`,
                0xff3333
            );

            return { ok: false, message: 'Недостатньо коштів у банку.' };
        }

        const newBalance = await changeBalance(-prizeAmount);
        await addDailyStat('minus', prizeAmount);

        await recordBankOperation({
            type: 'minus',
            amount: prizeAmount,
            category: 'lottery',
            note: `Лотерея: переможець <@${winner.userId}>`,
            userId: winner.userId,
            userName: winner.userName,
            displayName: 'Hoffman Lottery System',
            role: 'Lottery System',
            balanceAfter: newBalance,
            source: 'lottery'
        });

        await updateFinanceCrmPanel();

        prizeText = `💰 ${formatMoney(prizeAmount)}`;
    }

    const channel = await client.channels.fetch(LOTTERY_RESULTS_CHANNEL_ID).catch(() => null);

    if (channel) {
        await channel.send({
            embeds: [new EmbedBuilder()
                .setColor(0xd4af37)
                .setTitle('🎰 HOFFMAN WEEKLY LOTTERY')
                .setDescription(
                    `⚙️ Розіграш завершено.\n\n` +
                    `━━━━━━━━━━━━━━━━━━━━\n\n` +
                    `🏆 **Переможець:** <@${winner.userId}>\n` +
                    `🎟 **Квитків переможця:** ${winner.weeklyTickets || 0}\n` +
                    `🎟 **Загальна кількість квитків:** ${stats.totalTickets}\n\n` +
                    `🎁 **Приз:**\n${prizeText}\n\n` +
                    `━━━━━━━━━━━━━━━━━━━━\n\n` +
                    `${settings.prizeType === 'money' ? '💰 Кошти автоматично списано з сімейного банку.\n' : '📌 Приз потрібно видати вручну.\n'}` +
                    `🎟 Квитки обнулено для нового тижня.`
                )
                .setImage('https://cdn.discordapp.com/attachments/1510979053090242711/1517095365277384754/ChatGPT_Image_18_._2026_._12_01_11.png')
                .setFooter({ text: 'Hoffman Family • Weekly Lottery' })
                .setTimestamp()]
        });
    }

    await lotteryHistory.insertOne({
        winnerId: winner.userId,
        winnerName: winner.userName,
        winnerTickets: winner.weeklyTickets || 0,
        totalTickets: stats.totalTickets,
        participants: stats.participants,
        prizeType: settings.prizeType,
        prizeAmount,
        prizeName: settings.manualPrizeName,
        prizeDescription: settings.manualPrizeDescription,
        triggeredBy,
        date: Date.now()
    });

    await lotteryTickets.updateMany({}, { $set: { weeklyTickets: 0 } });

    if (settings.prizeType === 'manual') {
        await lotterySettings.updateOne(
            { name: 'weekly_lottery' },
            { $set: { prizeType: 'money', manualPrizeName: null, manualPrizeDescription: null } }
        );
    }

    await logAction(
        '🏆 Проведено розіграш',
        `Переможець: <@${winner.userId}>\nКвитків: **${winner.weeklyTickets || 0}**\nПриз: **${prizeText.replace(/\n/g, ' ')}**\nЗапуск: **${triggeredBy}**`,
        0xd4af37
    );

    await updateLotteryPanels();

    return { ok: true, message: `Переможець: ${winner.userName}. Приз: ${prizeText}` };
}

async function checkLotteryAutoDraw() {
    const { hour, minute } = getKyivTime();
    const weekday = getKyivWeekdayNumber();
    const today = getKyivDayKey();

    if (weekday !== 0 || hour !== 21 || minute > 5) return;

    const settings = await getLotterySettings();
    if (settings.lastAutoDrawDate === today) return;

    await lotterySettings.updateOne(
        { name: 'weekly_lottery' },
        { $set: { lastAutoDrawDate: today } }
    );

    await runLotteryDraw('auto');
}

async function showMyLotteryTickets(interaction) {
    if (!hasFamilyAccess(interaction.member)) {
        return await interaction.reply({ content: '❌ Перегляд квитків доступний тільки учасникам Hoffman Family.', flags: MessageFlags.Ephemeral });
    }

    const data = await lotteryTickets.findOne({ userId: interaction.user.id });

    return await interaction.reply({
        content:
            `🎟 **Ваші квитки Hoffman Weekly Lottery**\n\n` +
            `Квитків цього тижня: **${data?.weeklyTickets || 0}**\n` +
            `Квитків за весь час: **${data?.totalTickets || 0}**`,
        flags: MessageFlags.Ephemeral
    });
}

async function showLotteryParticipants(interaction, ephemeral = true) {
    const stats = await getLotteryStats();
    const text = stats.rows.length
        ? stats.rows.slice(0, 15).map((item, index) => `${index + 1}. <@${item.userId}> — **${item.weeklyTickets || 0}** квит.`).join('\n')
        : 'Поки що немає учасників з квитками.';

    return await interaction.reply({
        embeds: [new EmbedBuilder()
            .setColor(0xd4af37)
            .setTitle('📊 Учасники Hoffman Weekly Lottery')
            .setDescription(`${text}\n\n━━━━━━━━━━━━━━━━━━━━\n👥 Учасників: **${stats.participants}**\n🎟 Квитків: **${stats.totalTickets}**`)
            .setFooter({ text: 'Hoffman Family • Weekly Lottery' })
            .setTimestamp()],
        flags: ephemeral ? MessageFlags.Ephemeral : undefined
    });
}

async function showLotteryHistory(interaction) {
    const rows = await lotteryHistory.find({}).sort({ date: -1 }).limit(10).toArray();
    const text = rows.length
        ? rows.map((item, index) => {
            const date = getKyivDateTime(item.date);
            const prize = item.prizeType === 'money' ? formatMoney(item.prizeAmount) : `${item.prizeName || 'Ручний приз'}`;
            return `${index + 1}. **${date}** — <@${item.winnerId}> — ${prize}`;
        }).join('\n')
        : 'Історія розіграшів поки що порожня.';

    return await interaction.reply({
        embeds: [new EmbedBuilder()
            .setColor(0xd4af37)
            .setTitle('🏆 Історія переможців Hoffman Lottery')
            .setDescription(text)
            .setFooter({ text: 'Hoffman Family • Weekly Lottery' })
            .setTimestamp()],
        flags: MessageFlags.Ephemeral
    });
}

async function openLotteryMoneyModal(interaction) {
    if (!hasReviewAccess(interaction.member)) {
        return await interaction.reply({ content: '❌ Доступ тільки для 9/10 рангу.', flags: MessageFlags.Ephemeral });
    }

    const modal = new ModalBuilder().setCustomId('lottery_money_modal').setTitle('Грошовий приз лотереї');

    const minInput = new TextInputBuilder()
        .setCustomId('lottery_min_prize')
        .setLabel('Мінімальна сума')
        .setPlaceholder('500000')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    const maxInput = new TextInputBuilder()
        .setCustomId('lottery_max_prize')
        .setLabel('Максимальна сума')
        .setPlaceholder('1000000')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    modal.addComponents(
        new ActionRowBuilder().addComponents(minInput),
        new ActionRowBuilder().addComponents(maxInput)
    );

    return await interaction.showModal(modal);
}

async function openLotteryManualPrizeModal(interaction) {
    if (!hasReviewAccess(interaction.member)) {
        return await interaction.reply({ content: '❌ Доступ тільки для 9/10 рангу.', flags: MessageFlags.Ephemeral });
    }

    const modal = new ModalBuilder().setCustomId('lottery_manual_prize_modal').setTitle('Додати ручний приз');

    const nameInput = new TextInputBuilder()
        .setCustomId('lottery_prize_name')
        .setLabel('Назва призу')
        .setPlaceholder('Наприклад: Ford Raptor / Rare Case / Lucky Member')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    const descriptionInput = new TextInputBuilder()
        .setCustomId('lottery_prize_description')
        .setLabel('Опис призу')
        .setPlaceholder('Наприклад: користування 3 дні або 2 предмети')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(false);

    modal.addComponents(
        new ActionRowBuilder().addComponents(nameInput),
        new ActionRowBuilder().addComponents(descriptionInput)
    );

    return await interaction.showModal(modal);
}

async function openLotteryAddTicketsModal(interaction) {
    if (!hasReviewAccess(interaction.member)) {
        return await interaction.reply({ content: '❌ Доступ тільки для 9/10 рангу.', flags: MessageFlags.Ephemeral });
    }

    const modal = new ModalBuilder().setCustomId('lottery_add_tickets_modal').setTitle('Видати квитки вручну');

    const userInput = new TextInputBuilder()
        .setCustomId('lottery_user_id')
        .setLabel('ID користувача')
        .setPlaceholder('Встав Discord ID користувача')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    const countInput = new TextInputBuilder()
        .setCustomId('lottery_ticket_count')
        .setLabel('Кількість квитків')
        .setPlaceholder('1')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    const reasonInput = new TextInputBuilder()
        .setCustomId('lottery_ticket_reason')
        .setLabel('Причина')
        .setPlaceholder('За допомогу сімʼї')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(false);

    modal.addComponents(
        new ActionRowBuilder().addComponents(userInput),
        new ActionRowBuilder().addComponents(countInput),
        new ActionRowBuilder().addComponents(reasonInput)
    );

    return await interaction.showModal(modal);
}


async function openLotteryRemoveTicketsModal(interaction) {
    if (!hasReviewAccess(interaction.member)) {
        return await interaction.reply({ content: '❌ Доступ тільки для 9/10 рангу.', flags: MessageFlags.Ephemeral });
    }

    const modal = new ModalBuilder().setCustomId('lottery_remove_tickets_modal').setTitle('Забрати квитки');

    const userInput = new TextInputBuilder()
        .setCustomId('lottery_remove_user_id')
        .setLabel('ID користувача')
        .setPlaceholder('Встав Discord ID користувача')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    const countInput = new TextInputBuilder()
        .setCustomId('lottery_remove_ticket_count')
        .setLabel('Кількість квитків')
        .setPlaceholder('1')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    const reasonInput = new TextInputBuilder()
        .setCustomId('lottery_remove_ticket_reason')
        .setLabel('Причина')
        .setPlaceholder('Помилкова видача / рішення керівництва')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(false);

    modal.addComponents(
        new ActionRowBuilder().addComponents(userInput),
        new ActionRowBuilder().addComponents(countInput),
        new ActionRowBuilder().addComponents(reasonInput)
    );

    return await interaction.showModal(modal);
}

async function removeLotteryTickets(userId, count) {
    const data = await lotteryTickets.findOne({ userId });
    const currentWeekly = data?.weeklyTickets || 0;
    const removeCount = Math.min(currentWeekly, count);
    const newWeekly = Math.max(0, currentWeekly - removeCount);

    await lotteryTickets.updateOne(
        { userId },
        { $set: { weeklyTickets: newWeekly, updatedAt: Date.now() } },
        { upsert: true }
    );

    return { removed: removeCount, previous: currentWeekly, current: newWeekly };
}

async function resetLotteryTickets(interaction) {
    if (!hasReviewAccess(interaction.member)) {
        return await interaction.reply({ content: '❌ Доступ тільки для 9/10 рангу.', flags: MessageFlags.Ephemeral });
    }

    await lotteryTickets.updateMany({}, { $set: { weeklyTickets: 0 } });
    await updateLotteryPanels();

    await logAction(
        '🗑 Квитки лотереї скинуто',
        `Скинув: **${interaction.member.displayName}**`,
        0xff3333
    );

    return await interaction.reply({ content: '✅ Квитки поточного тижня скинуто.', flags: MessageFlags.Ephemeral });
}


function getDifficultyLabel(difficulty) {
    if (difficulty === 'easy') return '🟢 Легке';
    if (difficulty === 'medium') return '🟡 Середнє';
    if (difficulty === 'hard') return '🔴 Складне';
    return difficulty;
}

function getDifficultyReward(difficulty) {
    if (difficulty === 'easy') return 1;
    if (difficulty === 'medium') return 2;
    if (difficulty === 'hard') return 3;
    return 1;
}

function getDailyTaskButtonId(difficulty) {
    return `daily_task_submit:${difficulty}`;
}

async function pickRandomDailyTask(difficulty) {
    const tasks = await dailyTasksPool.find({ difficulty, enabled: true }).toArray();

    if (!tasks.length) {
        return {
            key: `fallback_${difficulty}`,
            difficulty,
            rewardTickets: getDifficultyReward(difficulty),
            text: 'Завдання не знайдено. Додайте завдання у пул.'
        };
    }

    return tasks[Math.floor(Math.random() * tasks.length)];
}

async function getOrCreateDailySettings(forceNew = false) {
    const today = getKyivDate();
    let settings = await dailyTaskSettings.findOne({ name: 'daily_tasks' });

    if (!settings || forceNew || settings.currentDate !== today || !settings.activeTasks) {
        const easy = await pickRandomDailyTask('easy');
        const medium = await pickRandomDailyTask('medium');
        const hard = await pickRandomDailyTask('hard');

        const activeTasks = {
            easy: {
                key: easy.key,
                text: easy.text,
                difficulty: 'easy',
                rewardTickets: easy.rewardTickets || 1
            },
            medium: {
                key: medium.key,
                text: medium.text,
                difficulty: 'medium',
                rewardTickets: medium.rewardTickets || 2
            },
            hard: {
                key: hard.key,
                text: hard.text,
                difficulty: 'hard',
                rewardTickets: hard.rewardTickets || 3
            }
        };

        await dailyTaskSettings.updateOne(
            { name: 'daily_tasks' },
            {
                $set: {
                    name: 'daily_tasks',
                    currentDate: today,
                    activeTasks,
                    updatedAt: Date.now()
                },
                $setOnInsert: {
                    panelMessageId: null
                }
            },
            { upsert: true }
        );

        settings = await dailyTaskSettings.findOne({ name: 'daily_tasks' });
    }

    return settings;
}

async function getDailyTaskStats(date = getKyivDate()) {
    const approved = await dailyTaskSubmissions.find({ date, status: 'approved' }).toArray();
    const pending = await dailyTaskSubmissions.find({ date, status: 'pending' }).toArray();

    const approvedByDifficulty = {
        easy: approved.filter(item => item.difficulty === 'easy').length,
        medium: approved.filter(item => item.difficulty === 'medium').length,
        hard: approved.filter(item => item.difficulty === 'hard').length
    };

    return {
        approved,
        pending,
        approvedByDifficulty,
        approvedTotal: approved.length,
        pendingTotal: pending.length
    };
}

async function createDailyTasksPanelEmbed() {
    const settings = await getOrCreateDailySettings();
    const stats = await getDailyTaskStats(settings.currentDate);
    const tasks = settings.activeTasks;

    return new EmbedBuilder()
        .setColor(HOFFMAN_RED)
        .setTitle('HOFFMAN DAILY TASKS')
        .setDescription(
            `**Три завдання щодня — обирай своє та заробляй квитки.**\n` +
            `Після виконання натисни кнопку потрібного рівня. Доказ надсилається боту в особисті повідомлення.\n\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `**ЛЕГКЕ • +${tasks.easy.rewardTickets} КВИТОК**\n` +
            `${tasks.easy.text}\n` +
            `Схвалено сьогодні: **${stats.approvedByDifficulty.easy}**\n\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `**СЕРЕДНЄ • +${tasks.medium.rewardTickets} КВИТКИ**\n` +
            `${tasks.medium.text}\n` +
            `Схвалено сьогодні: **${stats.approvedByDifficulty.medium}**\n\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `**СКЛАДНЕ • +${tasks.hard.rewardTickets} КВИТКИ**\n` +
            `${tasks.hard.text}\n` +
            `Схвалено сьогодні: **${stats.approvedByDifficulty.hard}**\n\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `📅 Дата: **${settings.currentDate}**\n` +
            `⏳ На перевірці: **${stats.pendingTotal}**`
        )
        .setImage('https://cdn.discordapp.com/attachments/1510979053090242711/1517095366124900422/ChatGPT_Image_18_._2026_._11_57_33.png')
        .setFooter({ text: 'Hoffman Family • Daily Tasks' })
        .setTimestamp();
}

function createDailyTasksPanelButtons() {
    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(getDailyTaskButtonId('easy'))
            .setLabel('Виконати легке')
            .setStyle(ButtonStyle.Success)
            .setEmoji('🟢'),

        new ButtonBuilder()
            .setCustomId(getDailyTaskButtonId('medium'))
            .setLabel('Виконати середнє')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('🟡'),

        new ButtonBuilder()
            .setCustomId(getDailyTaskButtonId('hard'))
            .setLabel('Виконати складне')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('🔴')
    );

    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('daily_task_my_progress')
            .setLabel('Мої завдання')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('📊'),

        new ButtonBuilder()
            .setCustomId('daily_task_refresh')
            .setLabel('Оновити')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('🔁')
    );

    return [row1, row2];
}

async function ensureDailyTasksPanel(forceNewTasks = false) {
    const channel = await client.channels.fetch(DAILY_TASKS_CHANNEL_ID).catch(() => null);
    if (!channel) {
        console.log('Канал щоденних завдань не знайдено.');
        return;
    }

    const settings = await getOrCreateDailySettings(forceNewTasks);
    const embed = await createDailyTasksPanelEmbed();
    const buttons = createDailyTasksPanelButtons();

    if (settings?.panelMessageId) {
        const oldMessage = await channel.messages.fetch(settings.panelMessageId).catch(() => null);

        if (oldMessage) {
            await oldMessage.edit({
                embeds: [embed],
                components: buttons
            });

            console.log('Панель щоденних завдань оновлено.');
            return;
        }
    }

    const message = await channel.send({
        embeds: [embed],
        components: buttons
    });

    await dailyTaskSettings.updateOne(
        { name: 'daily_tasks' },
        { $set: { panelMessageId: message.id } },
        { upsert: true }
    );

    console.log('Панель щоденних завдань створено.');
}

async function updateDailyTasksPanel() {
    await ensureDailyTasksPanel(false);
}

async function checkDailyTasksRefresh() {
    if (!dailyTaskSettings) return;

    const { hour } = getKyivTime();
    const today = getKyivDate();
    const settings = await dailyTaskSettings.findOne({ name: 'daily_tasks' });

    if (!settings || settings.currentDate !== today) {
        if (hour >= 9) {
            await ensureDailyTasksPanel(true);
        }
    }
}

async function openDailyTaskSubmitModal(interaction, difficulty) {
    if (!hasFamilyAccess(interaction.member)) {
        return await interaction.reply({
            content: '❌ Щоденні завдання доступні тільки учасникам Hoffman Family.',
            flags: MessageFlags.Ephemeral
        });
    }

    const settings = await getOrCreateDailySettings();
    const task = settings.activeTasks?.[difficulty];

    if (!task) {
        return await interaction.reply({
            content: '❌ Завдання цього рівня зараз не знайдено.',
            flags: MessageFlags.Ephemeral
        });
    }

    const existing = await dailyTaskSubmissions.findOne({
        date: settings.currentDate,
        userId: interaction.user.id,
        difficulty,
        status: { $in: ['pending', 'approved'] }
    });

    if (existing?.status === 'approved') {
        return await interaction.reply({
            content: '✅ Це завдання за сьогодні вже зараховано.',
            flags: MessageFlags.Ephemeral
        });
    }

    if (existing?.status === 'pending') {
        return await interaction.reply({
            content: '⏳ Це завдання вже на перевірці. Дочекайтесь рішення керівництва.',
            flags: MessageFlags.Ephemeral
        });
    }

    const modal = new ModalBuilder()
        .setCustomId(`daily_task_submit_modal:${difficulty}`)
        .setTitle(`${getDifficultyLabel(difficulty)} завдання`);

    const proofInput = new TextInputBuilder()
        .setCustomId('daily_task_proof')
        .setLabel('Доказ текстом або посиланням')
        .setPlaceholder('Залиш порожнім, щоб бот запросив скріншот у особистих повідомленнях')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(false);

    const commentInput = new TextInputBuilder()
        .setCustomId('daily_task_comment')
        .setLabel('Коментар')
        .setPlaceholder('Коротко опиши, що саме зробив')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(false);

    modal.addComponents(
        new ActionRowBuilder().addComponents(proofInput),
        new ActionRowBuilder().addComponents(commentInput)
    );

    return await interaction.showModal(modal);
}


async function createDailyTaskReviewSubmission({ userId, userName, difficulty, task, date, proof, comment, imageUrl = null }) {
    const submission = {
        date,
        userId,
        userName,
        difficulty,
        taskKey: task.key,
        taskText: task.text,
        rewardTickets: task.rewardTickets,
        proof: proof || '—',
        comment: comment || '—',
        imageUrl,
        status: 'pending',
        createdAt: Date.now()
    };

    const insertResult = await dailyTaskSubmissions.insertOne(submission);
    const submissionId = insertResult.insertedId.toString();

    const reviewChannel = await client.channels.fetch(DAILY_TASKS_REVIEW_CHANNEL_ID).catch(() => null);
    if (!reviewChannel) {
        throw new Error('Канал перевірки щоденних завдань не знайдено.');
    }

    const proofText = imageUrl
        ? `🖼 **Скріншот:** ${imageUrl}\n${proof && proof !== '—' ? `📎 **Текстовий доказ:**\n${proof}` : ''}`
        : `${proof || '—'}`;

    const embed = new EmbedBuilder()
        .setColor(0xffcc00)
        .setTitle('📋 Daily Task — на перевірку')
        .setDescription(
            `👤 **Учасник:** <@${userId}>\n` +
            `📅 **Дата:** ${date}\n\n` +
            `${getDifficultyLabel(difficulty)}\n` +
            `📌 **Завдання:** ${task.text}\n` +
            `🎟 **Нагорода:** +${task.rewardTickets} ticket(s)\n\n` +
            `📎 **Доказ:**\n${proofText}\n\n` +
            `📝 **Коментар:** ${comment || '—'}`
        )
        .setFooter({ text: `Submission ID: ${submissionId}` })
        .setTimestamp();

    if (imageUrl) {
        embed.setImage(imageUrl);
    }

    const buttons = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`daily_task_approve:${submissionId}`)
            .setLabel('Схвалити')
            .setStyle(ButtonStyle.Success)
            .setEmoji('✅'),

        new ButtonBuilder()
            .setCustomId(`daily_task_reject:${submissionId}`)
            .setLabel('Відхилити')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('❌')
    );

    await reviewChannel.send({
        content: `<@&${RANK_9_ROLE_ID}> <@&${RANK_10_ROLE_ID}>`,
        embeds: [embed],
        components: [buttons]
    });

    await logAction(
        '📋 Daily task подано',
        `👤 Учасник: <@${userId}>\n${getDifficultyLabel(difficulty)}\n📌 Завдання: **${task.text}**\n🎟 Нагорода: **+${task.rewardTickets}**`,
        0xffcc00
    );

    await updateDailyTasksPanel();

    return submissionId;
}

async function handleDailyTaskSubmitModal(interaction, difficulty) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    if (!hasFamilyAccess(interaction.member)) {
        return await interaction.editReply({
            content: '❌ Щоденні завдання доступні тільки учасникам Hoffman Family.'
        });
    }

    const settings = await getOrCreateDailySettings();
    const task = settings.activeTasks?.[difficulty];

    if (!task) {
        return await interaction.editReply({
            content: '❌ Завдання цього рівня зараз не знайдено.'
        });
    }

    const existing = await dailyTaskSubmissions.findOne({
        date: settings.currentDate,
        userId: interaction.user.id,
        difficulty,
        status: { $in: ['pending', 'approved'] }
    });

    if (existing?.status === 'approved') {
        return await interaction.editReply({
            content: '✅ Це завдання за сьогодні вже зараховано.'
        });
    }

    if (existing?.status === 'pending') {
        return await interaction.editReply({
            content: '⏳ Це завдання вже на перевірці.'
        });
    }

    const proof = interaction.fields.getTextInputValue('daily_task_proof')?.trim() || '';
    const comment = interaction.fields.getTextInputValue('daily_task_comment')?.trim() || '—';

    if (!proof) {
        const dmEmbed = new EmbedBuilder()
            .setColor(0xd4af37)
            .setTitle('📸 Надсилання доказу Daily Task')
            .setDescription(
                `${getDifficultyLabel(difficulty)}\n\n` +
                `📌 **Завдання:** ${task.text}\n` +
                `🎟 **Нагорода:** +${task.rewardTickets} ticket(s)\n\n` +
                `━━━━━━━━━━━━━━━━━━━━\n\n` +
                `Надішли **один скріншот у цей особистий чат** протягом 10 хвилин.\n` +
                `Після отримання бот автоматично передасть його керівництву на перевірку.`
            )
            .setFooter({ text: 'Hoffman Family • Daily Tasks' })
            .setTimestamp();

        const dmMessage = await interaction.user.send({ embeds: [dmEmbed] }).catch(() => null);

        if (!dmMessage) {
            return await interaction.editReply({
                content:
                    '❌ Не вдалося написати тобі в особисті повідомлення.\n' +
                    'Дозволь особисті повідомлення від учасників сервера та спробуй ще раз.\n\n' +
                    'Або повторно відкрий форму й встав доказ текстом чи посиланням.'
            });
        }

        pendingDailyTaskUploads.set(interaction.user.id, {
            dmChannelId: dmMessage.channelId,
            date: settings.currentDate,
            difficulty,
            task,
            comment,
            expiresAt: Date.now() + 10 * 60 * 1000
        });

        setTimeout(() => {
            const pending = pendingDailyTaskUploads.get(interaction.user.id);
            if (pending && pending.expiresAt <= Date.now()) {
                pendingDailyTaskUploads.delete(interaction.user.id);
                interaction.user.send('⌛ Час очікування скріншота минув. Для здачі завдання натисни кнопку ще раз.').catch(() => null);
            }
        }, 10 * 60 * 1000 + 1000);

        return await interaction.editReply({
            content: '✅ Я написав тобі в особисті повідомлення. Надішли скріншот боту протягом 10 хвилин.'
        });
    }

    try {
        await createDailyTaskReviewSubmission({
            userId: interaction.user.id,
            userName: interaction.member?.displayName || interaction.user.username,
            difficulty,
            task,
            date: settings.currentDate,
            proof,
            comment
        });
    } catch (error) {
        console.error('Daily task submit error:', error);
        return await interaction.editReply({
            content: '❌ Не вдалося відправити завдання на перевірку. Перевір канал перевірки.'
        });
    }

    return await interaction.editReply({
        content: '✅ Завдання відправлено на перевірку керівництву.'
    });
}

async function approveDailyTask(interaction, submissionId) {
    if (!hasReviewAccess(interaction.member)) {
        return await interaction.reply({
            content: '❌ Схвалювати daily tasks можуть тільки 9/10 ранг.',
            flags: MessageFlags.Ephemeral
        });
    }

    await interaction.deferUpdate();

    const submission = await dailyTaskSubmissions.findOne({ _id: new ObjectId(submissionId) });

    if (!submission) {
        return await interaction.followUp({
            content: '❌ Заявку на завдання не знайдено.',
            flags: MessageFlags.Ephemeral
        });
    }

    if (submission.status !== 'pending') {
        return await interaction.followUp({
            content: `ℹ️ Це завдання вже оброблено. Статус: **${submission.status}**.`,
            flags: MessageFlags.Ephemeral
        });
    }

    await dailyTaskSubmissions.updateOne(
        { _id: submission._id },
        {
            $set: {
                status: 'approved',
                reviewedBy: interaction.member.displayName,
                reviewedAt: Date.now()
            }
        }
    );

    await addLotteryTicket(
        submission.userId,
        submission.userName,
        `Daily task: ${submission.taskText}`,
        submission.rewardTickets
    );

    await updateLotteryPanels();
    await updateDailyTasksPanel();

    await logAction(
        '✅ Daily task схвалено',
        `👤 Учасник: <@${submission.userId}>\n📌 Завдання: **${submission.taskText}**\n🎟 Видано: **+${submission.rewardTickets}**\n🛡 Схвалив: **${interaction.member.displayName}**`,
        0x00ff88
    );

    const taskUser = await client.users.fetch(submission.userId).catch(() => null);
    if (taskUser) {
        const ticketData = await lotteryTickets.findOne({ userId: submission.userId });
        await taskUser.send(
            `🎉 **Завдання схвалено!**\n\n` +
            `📌 ${submission.taskText}\n` +
            `🎟 Нараховано: **+${submission.rewardTickets}**\n` +
            `🎫 Квитків цього тижня: **${ticketData?.weeklyTickets || 0}**\n\n` +
            `Перевірив: **${interaction.member.displayName}**`
        ).catch(() => null);
    }

    const oldEmbed = interaction.message.embeds[0];
    const newEmbed = EmbedBuilder.from(oldEmbed)
        .setColor(0x00ff88)
        .setTitle('✅ Daily Task — схвалено')
        .addFields({
            name: '✅ Статус',
            value: `СХВАЛЕНО\nПеревірив: ${interaction.member.displayName}\n🎟 Видано: +${submission.rewardTickets} ticket(s)`
        })
        .setFooter({ text: 'Hoffman Family • Daily Task Approved' })
        .setTimestamp();

    await interaction.message.edit({
        embeds: [newEmbed],
        components: []
    });
}

async function rejectDailyTask(interaction, submissionId) {
    if (!hasReviewAccess(interaction.member)) {
        return await interaction.reply({
            content: '❌ Відхиляти daily tasks можуть тільки 9/10 ранг.',
            flags: MessageFlags.Ephemeral
        });
    }

    await interaction.deferUpdate();

    const submission = await dailyTaskSubmissions.findOne({ _id: new ObjectId(submissionId) });

    if (!submission) {
        return await interaction.followUp({
            content: '❌ Заявку на завдання не знайдено.',
            flags: MessageFlags.Ephemeral
        });
    }

    if (submission.status !== 'pending') {
        return await interaction.followUp({
            content: `ℹ️ Це завдання вже оброблено. Статус: **${submission.status}**.`,
            flags: MessageFlags.Ephemeral
        });
    }

    await dailyTaskSubmissions.updateOne(
        { _id: submission._id },
        {
            $set: {
                status: 'rejected',
                reviewedBy: interaction.member.displayName,
                reviewedAt: Date.now()
            }
        }
    );

    await updateDailyTasksPanel();

    await logAction(
        '❌ Daily task відхилено',
        `👤 Учасник: <@${submission.userId}>\n📌 Завдання: **${submission.taskText}**\n🛡 Відхилив: **${interaction.member.displayName}**`,
        0xff3333
    );

    const taskUser = await client.users.fetch(submission.userId).catch(() => null);
    if (taskUser) {
        await taskUser.send(
            `❌ **Завдання відхилено.**\n\n` +
            `📌 ${submission.taskText}\n\n` +
            `Перевірив: **${interaction.member.displayName}**\n` +
            `Ти можеш повторно подати завдання, якщо воно ще актуальне.`
        ).catch(() => null);
    }

    const oldEmbed = interaction.message.embeds[0];
    const newEmbed = EmbedBuilder.from(oldEmbed)
        .setColor(0xff3333)
        .setTitle('❌ Daily Task — відхилено')
        .addFields({
            name: '❌ Статус',
            value: `ВІДХИЛЕНО\nПеревірив: ${interaction.member.displayName}`
        })
        .setFooter({ text: 'Hoffman Family • Daily Task Rejected' })
        .setTimestamp();

    await interaction.message.edit({
        embeds: [newEmbed],
        components: []
    });
}

async function showMyDailyTasks(interaction) {
    if (!hasFamilyAccess(interaction.member)) {
        return await interaction.reply({
            content: '❌ Щоденні завдання доступні тільки учасникам Hoffman Family.',
            flags: MessageFlags.Ephemeral
        });
    }

    const settings = await getOrCreateDailySettings();
    const submissions = await dailyTaskSubmissions.find({
        date: settings.currentDate,
        userId: interaction.user.id
    }).toArray();

    const statusByDifficulty = {
        easy: 'Не подано',
        medium: 'Не подано',
        hard: 'Не подано'
    };

    for (const item of submissions) {
        if (item.status === 'approved') statusByDifficulty[item.difficulty] = '✅ Схвалено';
        if (item.status === 'pending') statusByDifficulty[item.difficulty] = '⏳ На перевірці';
        if (item.status === 'rejected') statusByDifficulty[item.difficulty] = '❌ Відхилено';
    }

    return await interaction.reply({
        embeds: [new EmbedBuilder()
            .setColor(0xd4af37)
            .setTitle('📊 Мої Daily Tasks')
            .setDescription(
                `📅 **Дата:** ${settings.currentDate}\n\n` +
                `🟢 Легке: **${statusByDifficulty.easy}**\n` +
                `🟡 Середнє: **${statusByDifficulty.medium}**\n` +
                `🔴 Складне: **${statusByDifficulty.hard}**\n\n` +
                `Після схвалення квитки автоматично додаються до Hoffman Weekly Lottery.`
            )
            .setFooter({ text: 'Hoffman Family • Daily Tasks' })
            .setTimestamp()],
        flags: MessageFlags.Ephemeral
    });
}


const commands = [
    new SlashCommandBuilder().setName('total_plus').setDescription('Поповнення сейфу'),
    new SlashCommandBuilder().setName('total_minus').setDescription('Зняття коштів'),
    new SlashCommandBuilder().setName('balance').setDescription('Показати баланс сейфу'),
    new SlashCommandBuilder().setName('report').setDescription('Відправити звіт вручну'),
    new SlashCommandBuilder().setName('apply').setDescription('Подати заявку до сімʼї Hoffman'),

    new SlashCommandBuilder()
        .setName('quests')
        .setDescription('Почати виконання квесту')
        .addStringOption(option =>
            option.setName('quest').setDescription('Оберіть квест').setRequired(true).setAutocomplete(true)
        )
        .addStringOption(option =>
            option.setName('note').setDescription('Примітка').setRequired(false)
        )
        .addUserOption(option =>
            option.setName('member1').setDescription('Співучасник 1').setRequired(false)
        )
        .addUserOption(option =>
            option.setName('member2').setDescription('Співучасник 2').setRequired(false)
        )
        .addUserOption(option =>
            option.setName('member3').setDescription('Співучасник 3').setRequired(false)
        )
        .addUserOption(option =>
            option.setName('member4').setDescription('Співучасник 4').setRequired(false)
        )
        .addUserOption(option =>
            option.setName('member5').setDescription('Співучасник 5').setRequired(false)
        )
        .addUserOption(option =>
            option.setName('member6').setDescription('Співучасник 6').setRequired(false)
        )
        .addUserOption(option =>
            option.setName('member7').setDescription('Співучасник 7').setRequired(false)
        )
        .addUserOption(option =>
            option.setName('member8').setDescription('Співучасник 8').setRequired(false)
        )
        .addUserOption(option =>
            option.setName('member9').setDescription('Співучасник 9').setRequired(false)
        )
        .addUserOption(option =>
            option.setName('member10').setDescription('Співучасник 10').setRequired(false)
        ),

    new SlashCommandBuilder().setName('quest_status').setDescription('Показати статус усіх квестів'),

    new SlashCommandBuilder()
        .setName('quest_add')
        .setDescription('Додати або оновити квест')
        .addStringOption(option =>
            option.setName('name').setDescription('Назва квесту').setRequired(true)
        )
        .addIntegerOption(option =>
            option.setName('reward').setDescription('Нагорода').setRequired(true)
        )
        .addIntegerOption(option =>
            option.setName('cooldown_hours').setDescription('КД у годинах').setRequired(true)
        ),

    new SlashCommandBuilder().setName('lock_bot').setDescription('Заблокувати Hoffman Bot'),
    new SlashCommandBuilder().setName('unlock_bot').setDescription('Розблокувати Hoffman Bot')
].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);

client.once(Events.ClientReady, async () => {
    console.log(`Бот запущений: ${client.user.tag}`);

    try {
        await connectDB();

        await rest.put(
            Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
            { body: commands }
        );

        console.log('Команди зареєстровано.');

        await ensureApplicationPanel();
        await ensureBirthdayPanel();
        await ensureLotteryPanel();
        await ensureLotteryCrmPanel();
        await ensureDailyTasksPanel();
        await ensureFinanceCrmPanel();
        await ensurePersonnelCrmPanel();
        await ensureCareerPublicPanel();
        await ensureCareerCrmPanel();

        setInterval(async () => {
            const { hour, minute } = getKyivTime();

            if (hour === 23 && minute === 59) {
                await sendReport(false);
            }
        }, 60000);

        setInterval(async () => {
            await checkQuestCooldowns();
        }, 60000);

        setInterval(async () => {
            await checkBirthdays();
        }, 60000);

        setInterval(async () => {
            await checkLotteryAutoDraw();
        }, 60000);

        setInterval(async () => {
            await checkDailyTasksRefresh();
        }, 60000);

    } catch (error) {
        console.error('Помилка запуску:', error);
    }
});


client.on('messageCreate', async message => {
    try {
        if (message.author.bot || message.guild) return;

        const pending = pendingDailyTaskUploads.get(message.author.id);
        if (!pending) return;

        if (pending.expiresAt <= Date.now()) {
            pendingDailyTaskUploads.delete(message.author.id);
            await message.reply('⌛ Час очікування скріншота минув. Натисни кнопку здачі завдання ще раз.').catch(() => null);
            return;
        }

        if (message.channelId !== pending.dmChannelId) return;

        const attachment = message.attachments.find(file =>
            file.contentType?.startsWith('image/') || /\.(png|jpe?g|webp|gif)$/i.test(file.name || '')
        );

        if (!attachment) {
            await message.reply('📎 Надішли саме зображення або скріншот файлом.').catch(() => null);
            return;
        }

        const existing = await dailyTaskSubmissions.findOne({
            date: pending.date,
            userId: message.author.id,
            difficulty: pending.difficulty,
            status: { $in: ['pending', 'approved'] }
        });

        if (existing) {
            pendingDailyTaskUploads.delete(message.author.id);
            await message.reply('⏳ Це завдання вже подано або зараховано.').catch(() => null);
            return;
        }

        const guild = await client.guilds.fetch(GUILD_ID).catch(() => null);
        const member = guild ? await guild.members.fetch(message.author.id).catch(() => null) : null;

        await createDailyTaskReviewSubmission({
            userId: message.author.id,
            userName: member?.displayName || message.author.username,
            difficulty: pending.difficulty,
            task: pending.task,
            date: pending.date,
            proof: 'Скріншот надіслано боту в особистих повідомленнях',
            comment: pending.comment,
            imageUrl: attachment.url
        });

        pendingDailyTaskUploads.delete(message.author.id);

        await message.reply(
            '✅ **Скріншот отримано.**\n\n' +
            '⏳ Завдання передано керівництву на перевірку. Результат також надійде сюди в особисті повідомлення.'
        ).catch(() => null);
    } catch (error) {
        console.error('Daily task DM attachment error:', error);
        await message.reply('❌ Не вдалося обробити скріншот. Спробуй повторно здати завдання.').catch(() => null);
    }
});

client.on('interactionCreate', async interaction => {
    try {
        if (interaction.isAutocomplete()) {
            if (interaction.commandName === 'quests') {
                return await sendQuestAutocomplete(interaction);
            }
        }

        if (interaction.isChatInputCommand()) {
            const allowed = await checkGlobalSecurity(interaction);
            if (!allowed) return;

            if (interaction.commandName === 'lock_bot') {
                await setBotLock(true, interaction.member.displayName);

                await logAction(
                    '🔒 Бот заблоковано',
                    `👤 Заблокував: **${interaction.member.displayName}**`,
                    0xff3333
                );

                return await interaction.reply({
                    content: '🔒 Hoffman Bot заблоковано.',
                    flags: MessageFlags.Ephemeral
                });
            }

            if (interaction.commandName === 'unlock_bot') {
                await setBotLock(false, interaction.member.displayName);

                await logAction(
                    '🔓 Бот розблоковано',
                    `👤 Розблокував: **${interaction.member.displayName}**`,
                    0x00ff88
                );

                return await interaction.reply({
                    content: '🔓 Hoffman Bot розблоковано.',
                    flags: MessageFlags.Ephemeral
                });
            }

            if (interaction.commandName === 'balance') {
                const balance = await getBalance();

                const embed = new EmbedBuilder()
                    .setColor(0xd4af37)
                    .setTitle('🏦 Hoffman Bank')
                    .setDescription(`💰 **Поточний баланс сейфу:**\n\n\`${formatMoney(balance)}\``)
                    .setFooter({ text: 'Hoffman Bank • Safe Balance' })
                    .setTimestamp();

                return await interaction.reply({
                    embeds: [embed],
                    flags: MessageFlags.Ephemeral
                });
            }

            if (interaction.commandName === 'report') {
                await interaction.deferReply({ flags: MessageFlags.Ephemeral });

                const result = await sendReport(true);

                return await interaction.editReply({
                    content: result.message
                });
            }

            if (interaction.commandName === 'apply') {
                return await openApplicationModal(interaction);
            }

            if (interaction.commandName === 'quests') {
                return await startQuest(interaction);
            }

            if (interaction.commandName === 'quest_status') {
                return await sendQuestStatus(interaction);
            }

            if (interaction.commandName === 'quest_add') {
                return await addQuest(interaction);
            }

            const isPlus = interaction.commandName === 'total_plus';
            const type = isPlus ? 'plus' : 'minus';

            const embed = new EmbedBuilder()
                .setColor(isPlus ? 0x00ff88 : 0xff3333)
                .setTitle(isPlus ? '🟢 Поповнення сейфу' : '🔴 Зняття коштів')
                .setDescription(
                    `Спочатку оберіть категорію ${isPlus ? 'поповнення' : 'зняття'} нижче.

` +
                    `Після вибору відкриється форма, де потрібно буде вказати суму та примітку.`
                )
                .setFooter({ text: 'Hoffman Bank • Category Select' })
                .setTimestamp();

            return await interaction.reply({
                embeds: [embed],
                components: [createBankCategorySelect(type)],
                flags: MessageFlags.Ephemeral
            });
        }

        if (interaction.isStringSelectMenu()) {
            if (interaction.customId.startsWith('bank_category:')) {
                const type = interaction.customId.split(':')[1];
                const category = interaction.values[0];
                const isPlus = type === 'plus';
                const categoryLabel = getBankCategoryLabel(type, category);

                const modal = new ModalBuilder()
                    .setCustomId(`${isPlus ? 'modal_plus' : 'modal_minus'}:${category}`)
                    .setTitle(isPlus ? 'Поповнення сейфу' : 'Зняття коштів');

                const amountInput = new TextInputBuilder()
                    .setCustomId('amount')
                    .setLabel('Сума')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true);

                const noteInput = new TextInputBuilder()
                    .setCustomId('note')
                    .setLabel(`Примітка • ${categoryLabel}`.slice(0, 45))
                    .setStyle(TextInputStyle.Paragraph)
                    .setRequired(false);

                modal.addComponents(
                    new ActionRowBuilder().addComponents(amountInput),
                    new ActionRowBuilder().addComponents(noteInput)
                );

                return await interaction.showModal(modal);
            }
        }

        if (interaction.isButton()) {
            if (interaction.customId === 'career_apply_promotion') {
                return await openCareerApplicationModal(interaction, 'promotion');
            }

            if (interaction.customId === 'career_apply_deputy') {
                return await openCareerApplicationModal(interaction, 'deputy');
            }

            if (interaction.customId === 'career_requirements') {
                return await showCareerRequirements(interaction);
            }

            if (interaction.customId.startsWith('career_approve:')) {
                return await reviewCareerApplication(interaction, true);
            }

            if (interaction.customId.startsWith('career_reject:')) {
                return await reviewCareerApplication(interaction, false);
            }

            if (interaction.customId === 'career_crm_refresh') {
                if (!hasLeaderAccess(interaction.member)) {
                    return await interaction.reply({ content: '❌ Career CRM доступна тільки Founder / 10 рангу.', flags: MessageFlags.Ephemeral });
                }

                await updateCareerPanels();
                return await interaction.reply({ content: '✅ Career CRM оновлено.', flags: MessageFlags.Ephemeral });
            }

            if (interaction.customId === 'career_crm_recent') {
                return await showCareerRecentApplications(interaction);
            }

            if (interaction.customId === 'career_crm_open_promotion') {
                return await setCareerOpen(interaction, 'promotionOpen', true);
            }

            if (interaction.customId === 'career_crm_close_promotion') {
                return await setCareerOpen(interaction, 'promotionOpen', false);
            }

            if (interaction.customId === 'career_crm_open_deputy') {
                return await setCareerOpen(interaction, 'deputyOpen', true);
            }

            if (interaction.customId === 'career_crm_close_deputy') {
                return await setCareerOpen(interaction, 'deputyOpen', false);
            }

            if (interaction.customId === 'finance_crm_refresh') {
                if (!hasReviewAccess(interaction.member)) {
                    return await interaction.reply({
                        content: '❌ Доступ до Finance CRM мають тільки 9/10 ранг.',
                        flags: MessageFlags.Ephemeral
                    });
                }

                await updateFinanceCrmPanel();

                return await interaction.reply({
                    content: '✅ Finance CRM панель оновлено.',
                    flags: MessageFlags.Ephemeral
                });
            }

            if (interaction.customId === 'finance_crm_preview_report') {
                if (!hasReviewAccess(interaction.member)) {
                    return await interaction.reply({
                        content: '❌ Доступ до Finance CRM мають тільки 9/10 ранг.',
                        flags: MessageFlags.Ephemeral
                    });
                }

                const embed = await createFinanceWeeklyReportEmbed(interaction.member?.displayName || interaction.user.username);

                return await interaction.reply({
                    embeds: [embed],
                    flags: MessageFlags.Ephemeral
                });
            }

            if (interaction.customId === 'finance_crm_send_report') {
                if (!hasReviewAccess(interaction.member)) {
                    return await interaction.reply({
                        content: '❌ Доступ до Finance CRM мають тільки 9/10 ранг.',
                        flags: MessageFlags.Ephemeral
                    });
                }

                return await sendFinanceWeeklyReport(interaction);
            }

            if (interaction.customId === 'finance_crm_recent_operations') {
                if (!hasReviewAccess(interaction.member)) {
                    return await interaction.reply({
                        content: '❌ Доступ до Finance CRM мають тільки 9/10 ранг.',
                        flags: MessageFlags.Ephemeral
                    });
                }

                return await showFinanceRecentOperations(interaction);
            }


            if (interaction.customId === 'personnel_crm_refresh') {
                if (!hasReviewAccess(interaction.member)) {
                    return await interaction.reply({
                        content: '❌ Доступ до Personnel CRM мають тільки 9/10 ранг.',
                        flags: MessageFlags.Ephemeral
                    });
                }

                await updatePersonnelCrmPanel();

                return await interaction.reply({
                    content: '✅ Personnel CRM панель оновлено.',
                    flags: MessageFlags.Ephemeral
                });
            }

            if (interaction.customId === 'personnel_crm_preview_report') {
                if (!hasReviewAccess(interaction.member)) {
                    return await interaction.reply({
                        content: '❌ Доступ до Personnel CRM мають тільки 9/10 ранг.',
                        flags: MessageFlags.Ephemeral
                    });
                }

                const embed = await createPersonnelWeeklyReportEmbed(interaction.member?.displayName || interaction.user.username);

                return await interaction.reply({
                    embeds: [embed],
                    flags: MessageFlags.Ephemeral
                });
            }

            if (interaction.customId === 'personnel_crm_send_report') {
                if (!hasReviewAccess(interaction.member)) {
                    return await interaction.reply({
                        content: '❌ Доступ до Personnel CRM мають тільки 9/10 ранг.',
                        flags: MessageFlags.Ephemeral
                    });
                }

                return await sendPersonnelWeeklyReport(interaction);
            }

            if (interaction.customId === 'personnel_crm_recent_actions') {
                if (!hasReviewAccess(interaction.member)) {
                    return await interaction.reply({
                        content: '❌ Доступ до Personnel CRM мають тільки 9/10 ранг.',
                        flags: MessageFlags.Ephemeral
                    });
                }

                return await showPersonnelRecentActions(interaction);
            }

            if (interaction.customId === 'personnel_crm_add_promotion') {
                return await openPersonnelActionModal(interaction, 'promotion');
            }

            if (interaction.customId === 'personnel_crm_add_demotion') {
                return await openPersonnelActionModal(interaction, 'demotion');
            }

            if (interaction.customId === 'personnel_crm_add_removal') {
                return await openPersonnelActionModal(interaction, 'removal');
            }

             if (interaction.customId === 'get_guest_role') {
                if (interaction.member.roles.cache.has(GUEST_ROLE_ID)) {
                    return await interaction.reply({
                        content: 'ℹ️ У вас вже є роль **Гість**.',
                        flags: MessageFlags.Ephemeral
                    });
                }

                await interaction.member.roles.add(GUEST_ROLE_ID);

                await logAction(
                    '👤 Видано роль Гість',
                    `Користувач: <@${interaction.user.id}>\nРоль: **Гість**`,
                    0x00ff88
                );

                return await interaction.reply({
                    content: '✅ Вам успішно видано роль **Гість**.',
                    flags: MessageFlags.Ephemeral
                });
            }

            if (interaction.customId === 'show_rules') {
                return await interaction.reply({
                    content:
                        '📜 **Основні правила Hoffman Family**\n\n' +
                        '1. Поважайте всіх учасників сімʼї.\n' +
                        '2. Заборонені образи, провокації та токсична поведінка.\n' +
                        '3. Заборонений спам, флуд та беззмістовні повідомлення.\n' +
                        '4. Виконуйте вказівки керівництва сімʼї.\n' +
                        '5. Не виносьте внутрішню інформацію за межі сімʼї.\n' +
                        '6. Підтримуйте адекватну RP-атмосферу.\n' +
                        '7. Перед подачею заявки заповнюйте форму чесно та повністю.\n\n' +
                        '🏛 **Hoffman Family**\n' +
                        'Luxury • Loyalty • Respect',
                    flags: MessageFlags.Ephemeral
                });
            }
            
            if (interaction.customId === 'open_application_modal') {
                return await openApplicationModal(interaction);
            }

            if (interaction.customId === 'birthday_add') {
                return await openBirthdayAddModal(interaction);
            }

            if (interaction.customId === 'birthday_remove') {
                return await openBirthdayRemoveModal(interaction);
            }

            if (interaction.customId === 'lottery_my_tickets') {
                return await showMyLotteryTickets(interaction);
            }

            if (interaction.customId === 'lottery_participants') {
                return await showLotteryParticipants(interaction, true);
            }

            if (interaction.customId === 'lottery_history') {
                return await showLotteryHistory(interaction);
            }

            if (interaction.customId === 'lottery_admin_run') {
                if (!hasReviewAccess(interaction.member)) {
                    return await interaction.reply({ content: '❌ Доступ тільки для 9/10 рангу.', flags: MessageFlags.Ephemeral });
                }

                await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                const result = await runLotteryDraw(`manual:${interaction.user.id}`);
                return await interaction.editReply({ content: result.ok ? `✅ ${result.message}` : `⚠️ ${result.message}` });
            }

            if (interaction.customId === 'lottery_admin_enable') {
    if (!hasReviewAccess(interaction.member)) {
        return await interaction.reply({
            content: '❌ Доступ тільки для 9/10 рангу.',
            flags: MessageFlags.Ephemeral
        });
    }

    await lotterySettings.updateOne(
        { name: 'weekly_lottery' },
        { $set: { enabled: true } },
        { upsert: true }
    );

    await updateLotteryPanels();

    await logAction(
        '🟢 Лотерею увімкнено',
        `Увімкнув: **${interaction.member.displayName}**`,
        0x00ff88
    );

    return await interaction.reply({
        content: '🟢 Лотерею увімкнено.',
        flags: MessageFlags.Ephemeral
    });
}

if (interaction.customId === 'lottery_admin_disable') {
    if (!hasReviewAccess(interaction.member)) {
        return await interaction.reply({
            content: '❌ Доступ тільки для 9/10 рангу.',
            flags: MessageFlags.Ephemeral
        });
    }

    await lotterySettings.updateOne(
        { name: 'weekly_lottery' },
        { $set: { enabled: false } },
        { upsert: true }
    );

    await updateLotteryPanels();

    await logAction(
        '🔴 Лотерею вимкнено',
        `Вимкнув: **${interaction.member.displayName}**`,
        0xff3333
    );

    return await interaction.reply({
        content: '🔴 Лотерею вимкнено.',
        flags: MessageFlags.Ephemeral
    });
}

            if (interaction.customId === 'lottery_admin_money') {
                return await openLotteryMoneyModal(interaction);
            }

            if (interaction.customId === 'lottery_admin_prize') {
                return await openLotteryManualPrizeModal(interaction);
            }

            if (interaction.customId === 'lottery_admin_add_tickets') {
                return await openLotteryAddTicketsModal(interaction);
            }

            if (interaction.customId === 'lottery_admin_remove_tickets') {
                return await openLotteryRemoveTicketsModal(interaction);
            }

            if (interaction.customId === 'lottery_admin_stats') {
                return await showLotteryParticipants(interaction, true);
            }

            if (interaction.customId === 'lottery_admin_reset') {
                return await resetLotteryTickets(interaction);
            }

            if (interaction.customId.startsWith('withdraw_confirm:')) {
                const userId = interaction.customId.split(':')[1];

                if (interaction.user.id !== userId) {
                    return await interaction.reply({
                        content: '❌ Це підтвердження не для вас.',
                        flags: MessageFlags.Ephemeral
                    });
                }

                const data = pendingWithdrawals.get(userId);

                if (!data) {
                    return await interaction.reply({
                        content: '❌ Операція вже застаріла або не знайдена.',
                        flags: MessageFlags.Ephemeral
                    });
                }

                pendingWithdrawals.delete(userId);

                const newBalance = await changeBalance(-data.amount);
                await addDailyStat('minus', data.amount);

                await recordBankOperation({
                    type: 'minus',
                    amount: data.amount,
                    category: data.category || 'other',
                    note: data.note,
                    userId: interaction.user.id,
                    userName: data.nick,
                    displayName: data.displayName,
                    role: data.role,
                    balanceAfter: newBalance,
                    source: 'manual'
                });

                await updateFinanceCrmPanel();

                const embed = new EmbedBuilder()
                    .setColor(0xff3333)
                    .setTitle('🔴 Hoffman Bank — Зняття коштів')
                    .setDescription(
                        `╔════════════════════╗\n` +
                        `     **ЗНЯТТЯ КОШТІВ**\n` +
                        `╚════════════════════╝\n\n` +
                        `👤 **Учасник:** ${data.nick}\n\n` +
                        `💵 **Сума:** \`${formatMoney(data.amount)}\`\n\n` +
                        `📂 **Категорія:** ${data.categoryLabel || getBankCategoryLabel('minus', data.category)}\n\n` +
                        `📝 **Примітка:** ${data.note}\n\n` +
                        `━━━━━━━━━━━━━━━━━━━━\n\n` +
                        `💰 **Баланс сейфу:**\n` +
                        `\`${formatMoney(newBalance)}\`\n\n` +
                        `✅ **Дію виконав:** ${data.displayName}\n` +
                        `🎭 **Роль:** ${data.role}`
                    )
                    .setFooter({ text: 'Hoffman Bank • Transaction System' })
                    .setTimestamp();

                await logAction(
                    '📉 Зняття коштів',
                    `👤 Виконав: **${data.displayName}**\n👤 Учасник: **${data.nick}**\n💵 Сума: **${formatMoney(data.amount)}**\n📂 Категорія: **${data.categoryLabel || getBankCategoryLabel('minus', data.category)}**\n💰 Новий баланс: **${formatMoney(newBalance)}**\n📌 Примітка: ${data.note}`,
                    0xff3333
                );

                return await interaction.update({
                    content: '',
                    embeds: [embed],
                    components: []
                });
            }

            if (interaction.customId.startsWith('withdraw_cancel:')) {
                const userId = interaction.customId.split(':')[1];

                if (interaction.user.id !== userId) {
                    return await interaction.reply({
                        content: '❌ Це підтвердження не для вас.',
                        flags: MessageFlags.Ephemeral
                    });
                }

                pendingWithdrawals.delete(userId);

                return await interaction.update({
                    content: '❌ Зняття коштів скасовано.',
                    embeds: [],
                    components: []
                });
            }

            if (interaction.customId.startsWith('quest_admin_finish:')) {
                return await completeOrCancelQuest(interaction, true, true);
            }

            if (interaction.customId.startsWith('quest_admin_cancel:')) {
                return await completeOrCancelQuest(interaction, false, true);
            }

            if (interaction.customId.startsWith('quest_admin_transfer:')) {
                return await openQuestTransferModal(interaction);
            }

            if (interaction.customId.startsWith('quest_finish:')) {
                return await completeOrCancelQuest(interaction, true);
            }

            if (interaction.customId.startsWith('quest_cancel:')) {
                return await completeOrCancelQuest(interaction, false);
            }


            if (interaction.customId.startsWith('daily_task_submit:')) {
                const difficulty = interaction.customId.split(':')[1];
                return await openDailyTaskSubmitModal(interaction, difficulty);
            }

            if (interaction.customId === 'daily_task_my_progress') {
                return await showMyDailyTasks(interaction);
            }

            if (interaction.customId === 'daily_task_refresh') {
                if (!hasReviewAccess(interaction.member)) {
                    return await interaction.reply({
                        content: '❌ Оновлювати панель можуть тільки 9/10 ранг.',
                        flags: MessageFlags.Ephemeral
                    });
                }

                await updateDailyTasksPanel();

                return await interaction.reply({
                    content: '🔁 Панель щоденних завдань оновлено.',
                    flags: MessageFlags.Ephemeral
                });
            }

            if (interaction.customId.startsWith('daily_task_approve:')) {
                const submissionId = interaction.customId.split(':')[1];
                return await approveDailyTask(interaction, submissionId);
            }

            if (interaction.customId.startsWith('daily_task_reject:')) {
                const submissionId = interaction.customId.split(':')[1];
                return await rejectDailyTask(interaction, submissionId);
            }

            if (!['application_approve', 'application_reject'].includes(interaction.customId)) return;

            if (!hasReviewAccess(interaction.member)) {
                return await interaction.reply({
                    content: '❌ У вас немає доступу.',
                    flags: MessageFlags.Ephemeral
                });
            }

            const approved = interaction.customId === 'application_approve';
            const oldEmbed = interaction.message.embeds[0];

            const userMention = oldEmbed.description?.match(/<@(\d+)>/);
            const applicantId = userMention ? userMention[1] : null;

            if (approved && applicantId) {
                const guildMember = await interaction.guild.members.fetch(applicantId).catch(() => null);

                if (guildMember) {
                    await guildMember.roles.add(ACCEPTED_ROLE_ID).catch(() => null);
                    await guildMember.roles.remove(GUEST_ROLE_ID).catch(() => null);
                }
            }

            if (applicantId) {
                const applicantUser = await client.users.fetch(applicantId).catch(() => null);
                if (applicantUser) {
                    await sendApplicationDM(applicantUser, approved);
                }
            }


            await recordPersonnelAction({
                type: approved ? 'application_approved' : 'application_rejected',
                targetId: applicantId,
                targetName: applicantId ? `<@${applicantId}>` : 'Невідомий кандидат',
                oldRank: approved ? 'Гість' : 'Кандидат',
                newRank: approved ? 'Учасник Hoffman Family' : 'Відхилено',
                reason: approved ? 'Заявку схвалено керівництвом' : 'Заявку відхилено керівництвом',
                performedBy: interaction.member?.displayName || interaction.user.username,
                performedById: interaction.user.id,
                source: 'application'
            });

            await updatePersonnelCrmPanel();

            await logAction(
                approved ? '✅ Заявку схвалено' : '❌ Заявку відхилено',
                `👤 Кандидат: ${applicantId ? `<@${applicantId}>` : 'невідомо'}\n🛡 Розглянув: **${interaction.member.displayName}**`,
                approved ? 0x00ff88 : 0xff3333
            );

            const newEmbed = EmbedBuilder.from(oldEmbed)
                .setColor(approved ? 0x00ff88 : 0xff3333)
                .addFields({
                    name: approved ? '✅ Статус заявки' : '❌ Статус заявки',
                    value: `${approved ? 'СХВАЛЕНО' : 'ВІДХИЛЕНО'}\nРозглянув: ${interaction.member.displayName}`
                })
                .setFooter({
                    text: approved
                        ? 'Hoffman Family • Application Approved'
                        : 'Hoffman Family • Application Rejected'
                })
                .setTimestamp();

            const disabledButtons = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('application_approve')
                    .setLabel('Схвалено')
                    .setStyle(ButtonStyle.Success)
                    .setDisabled(true),

                new ButtonBuilder()
                    .setCustomId('application_reject')
                    .setLabel('Відхилено')
                    .setStyle(ButtonStyle.Danger)
                    .setDisabled(true)
            );

            return await interaction.update({
                embeds: [newEmbed],
                components: [disabledButtons]
            });
        }

        if (interaction.type === InteractionType.ModalSubmit) {
            if (interaction.customId === 'birthday_add_modal') {
                await interaction.deferReply({ flags: MessageFlags.Ephemeral });

                if (!hasReviewAccess(interaction.member)) {
                    return await interaction.editReply({
                        content: '❌ Додавати дні народження можуть тільки 9/10 ранг.'
                    });
                }

                const name = interaction.fields.getTextInputValue('birthday_name').trim();
                const birthdayRaw = interaction.fields.getTextInputValue('birthday_date');
                const birthday = normalizeBirthday(birthdayRaw);

                if (!birthday) {
                    return await interaction.editReply({
                        content: '❌ Невірний формат дати. Приклад правильного формату: **02.05**'
                    });
                }

                const [day, month] = birthday.split('.');
                const birthdaySort = Number(month) * 100 + Number(day);
                const nameLower = name.toLowerCase();

                await birthdays.updateOne(
                    { nameLower },
                    {
                        $set: {
                            name,
                            nameLower,
                            birthday,
                            birthdaySort,
                            addedBy: interaction.member.displayName,
                            updatedAt: Date.now()
                        }
                    },
                    { upsert: true }
                );

                await updateBirthdayPanel();

                await logAction(
                    '🎂 День народження додано/оновлено',
                    `👤 **${name}**\n📅 Дата: **${birthday}**\n🛡 Додав/оновив: **${interaction.member.displayName}**`,
                    0xd4af37
                );

                return await interaction.editReply({
                    content: `✅ День народження додано/оновлено: **${name} — ${birthday}**`
                });
            }

            if (interaction.customId === 'birthday_remove_modal') {
                await interaction.deferReply({ flags: MessageFlags.Ephemeral });

                if (!hasReviewAccess(interaction.member)) {
                    return await interaction.editReply({
                        content: '❌ Видаляти дні народження можуть тільки 9/10 ранг.'
                    });
                }

                const name = interaction.fields.getTextInputValue('birthday_remove_name').trim();
                const nameLower = name.toLowerCase();

                const result = await birthdays.deleteOne({ nameLower });

                if (!result.deletedCount) {
                    return await interaction.editReply({
                        content: '❌ Запис не знайдено. Перевір імʼя.'
                    });
                }

                await updateBirthdayPanel();

                await logAction(
                    '🗑 День народження видалено',
                    `👤 **${name}**\n🛡 Видалив: **${interaction.member.displayName}**`,
                    0xff3333
                );

                return await interaction.editReply({
                    content: `✅ День народження видалено: **${name}**`
                });
            }


            if (interaction.customId.startsWith('career_application_modal:')) {
                const type = interaction.customId.split(':')[1];
                return await handleCareerApplicationModal(interaction, type);
            }

            if (interaction.customId.startsWith('quest_transfer_modal:')) {
                return await handleQuestTransferModal(interaction);
            }

            if (interaction.customId.startsWith('personnel_action_modal:')) {
                const actionType = interaction.customId.split(':')[1];
                return await handlePersonnelActionModal(interaction, actionType);
            }

            if (interaction.customId === 'lottery_money_modal') {
                await interaction.deferReply({ flags: MessageFlags.Ephemeral });

                if (!hasReviewAccess(interaction.member)) {
                    return await interaction.editReply({ content: '❌ Доступ тільки для 9/10 рангу.' });
                }

                const minPrize = parseInt(interaction.fields.getTextInputValue('lottery_min_prize').replace(/\D/g, ''));
                const maxPrize = parseInt(interaction.fields.getTextInputValue('lottery_max_prize').replace(/\D/g, ''));

                if (!minPrize || !maxPrize || minPrize <= 0 || maxPrize < minPrize) {
                    return await interaction.editReply({ content: '❌ Невірно вказано суми. Максимальна сума має бути більшою або рівною мінімальній.' });
                }

                await lotterySettings.updateOne(
                    { name: 'weekly_lottery' },
                    {
                        $set: {
                            prizeType: 'money',
                            minPrize,
                            maxPrize,
                            manualPrizeName: null,
                            manualPrizeDescription: null,
                            updatedAt: Date.now()
                        }
                    },
                    { upsert: true }
                );

                await updateLotteryPanels();

                await logAction(
                    '💰 Приз лотереї змінено',
                    `Тип: **Гроші**\nМін: **${formatMoney(minPrize)}**\nМакс: **${formatMoney(maxPrize)}**\nЗмінив: **${interaction.member.displayName}**`,
                    0xd4af37
                );

                return await interaction.editReply({ content: `✅ Грошовий приз встановлено: **${formatMoney(minPrize)} – ${formatMoney(maxPrize)}**` });
            }

            if (interaction.customId === 'lottery_manual_prize_modal') {
                await interaction.deferReply({ flags: MessageFlags.Ephemeral });

                if (!hasReviewAccess(interaction.member)) {
                    return await interaction.editReply({ content: '❌ Доступ тільки для 9/10 рангу.' });
                }

                const prizeName = interaction.fields.getTextInputValue('lottery_prize_name').trim();
                const prizeDescription = interaction.fields.getTextInputValue('lottery_prize_description')?.trim() || 'Опис не вказано.';

                await lotterySettings.updateOne(
                    { name: 'weekly_lottery' },
                    {
                        $set: {
                            prizeType: 'manual',
                            manualPrizeName: prizeName,
                            manualPrizeDescription: prizeDescription,
                            updatedAt: Date.now()
                        }
                    },
                    { upsert: true }
                );

                await updateLotteryPanels();

                await logAction(
                    '🎁 Ручний приз лотереї встановлено',
                    `Приз: **${prizeName}**\nОпис: ${prizeDescription}\nДодав: **${interaction.member.displayName}**`,
                    0xd4af37
                );

                return await interaction.editReply({ content: `✅ Ручний приз встановлено: **${prizeName}**` });
            }

            if (interaction.customId === 'lottery_add_tickets_modal') {
                await interaction.deferReply({ flags: MessageFlags.Ephemeral });

                if (!hasReviewAccess(interaction.member)) {
                    return await interaction.editReply({ content: '❌ Доступ тільки для 9/10 рангу.' });
                }

                const userId = interaction.fields.getTextInputValue('lottery_user_id').replace(/\D/g, '');
                const count = parseInt(interaction.fields.getTextInputValue('lottery_ticket_count').replace(/\D/g, ''));
                const reason = interaction.fields.getTextInputValue('lottery_ticket_reason') || 'Ручне нарахування';

                if (!userId || !count || count <= 0) {
                    return await interaction.editReply({ content: '❌ Невірний ID користувача або кількість квитків.' });
                }

                const member = await interaction.guild.members.fetch(userId).catch(() => null);
                const userName = member?.displayName || `User ${userId}`;

                await addLotteryTicket(userId, userName, reason, count);
                await updateLotteryPanels();

                await logAction(
                    '🎟 Квитки видано вручну',
                    `Користувач: <@${userId}>\nКількість: **${count}**\nПричина: ${reason}\nВидав: **${interaction.member.displayName}**`,
                    0xd4af37
                );

                return await interaction.editReply({ content: `✅ Видано **${count}** квит. для <@${userId}>.` });
            }

            if (interaction.customId === 'lottery_remove_tickets_modal') {
                await interaction.deferReply({ flags: MessageFlags.Ephemeral });

                if (!hasReviewAccess(interaction.member)) {
                    return await interaction.editReply({ content: '❌ Доступ тільки для 9/10 рангу.' });
                }

                const userId = interaction.fields.getTextInputValue('lottery_remove_user_id').replace(/\D/g, '');
                const count = parseInt(interaction.fields.getTextInputValue('lottery_remove_ticket_count').replace(/\D/g, ''));
                const reason = interaction.fields.getTextInputValue('lottery_remove_ticket_reason') || 'Ручне списання';

                if (!userId || !count || count <= 0) {
                    return await interaction.editReply({ content: '❌ Невірний ID користувача або кількість квитків.' });
                }

                const result = await removeLotteryTickets(userId, count);
                await updateLotteryPanels();

                await logAction(
                    '➖ Квитки забрано вручну',
                    `Користувач: <@${userId}>\nБуло: **${result.previous}**\nЗабрано: **${result.removed}**\nЗалишилось: **${result.current}**\nПричина: ${reason}\nЗабрав: **${interaction.member.displayName}**`,
                    0xffcc00
                );

                return await interaction.editReply({
                    content: `✅ У <@${userId}> забрано **${result.removed}** квит. Залишилось: **${result.current}**.`
                });
            }



            if (interaction.customId.startsWith('daily_task_submit_modal:')) {
                const difficulty = interaction.customId.split(':')[1];
                return await handleDailyTaskSubmitModal(interaction, difficulty);
            }

            if (interaction.customId === 'hoffman_application') {
                await interaction.deferReply({ flags: MessageFlags.Ephemeral });

                const nickStatic = interaction.fields.getTextInputValue('nick_static');
                const gameLevel = interaction.fields.getTextInputValue('game_level');
                const realAge = interaction.fields.getTextInputValue('real_age');
                const dailyOnline = interaction.fields.getTextInputValue('daily_online');
                const extraInfo = interaction.fields.getTextInputValue('extra_info');

                const reviewChannel = await client.channels.fetch(APPLICATION_REVIEW_CHANNEL_ID);

                const embed = new EmbedBuilder()
                    .setColor(0xd4af37)
                    .setTitle('📥 Нова заявка до Hoffman')
                    .setDescription(
                        `👤 **Discord:** <@${interaction.user.id}>\n\n` +
                        `📝 **Nick:** ${nickStatic}\n\n` +
                        `🎮 **Рівень:** ${gameLevel}\n\n` +
                        `🎂 **Вік:** ${realAge}\n\n` +
                        `⏰ **Онлайн:** ${dailyOnline}\n\n` +
                        `📌 **Інформація:**\n${extraInfo}\n\n` +
                        `━━━━━━━━━━━━━━━━━━━━\n` +
                        `⏳ **Термін розгляду:** до 4 годин`
                    )
                    .setFooter({ text: 'Hoffman Family • Application System' })
                    .setTimestamp();

                const buttons = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('application_approve')
                        .setLabel('Схвалити')
                        .setStyle(ButtonStyle.Success)
                        .setEmoji('✅'),

                    new ButtonBuilder()
                        .setCustomId('application_reject')
                        .setLabel('Відхилити')
                        .setStyle(ButtonStyle.Danger)
                        .setEmoji('❌')
                );

                await reviewChannel.send({
                    content: `<@&1495997440333971507> <@&1495997048669863966>`,
                    embeds: [embed],
                    components: [buttons]
                });


                await recordPersonnelAction({
                    type: 'application_submitted',
                    targetId: interaction.user.id,
                    targetName: nickStatic,
                    oldRank: 'Гість',
                    newRank: 'На розгляді',
                    reason: `Рівень: ${gameLevel}; Вік: ${realAge}; Онлайн: ${dailyOnline}`,
                    performedBy: interaction.member?.displayName || interaction.user.username,
                    performedById: interaction.user.id,
                    source: 'application'
                });

                await updatePersonnelCrmPanel();

                await logAction(
                    '📨 Нова заявка',
                    `👤 Кандидат: <@${interaction.user.id}>\n📝 Nick: **${nickStatic}**\n🎮 Рівень: **${gameLevel}**`,
                    0xd4af37
                );

                return await interaction.editReply({
                    content: '✅ Заявка успішно подана. Термін розгляду — до 4 годин.'
                });
            }

            await interaction.deferReply();

            const amountText = interaction.fields.getTextInputValue('amount');
            const note = interaction.fields.getTextInputValue('note') || '—';

            const amount = parseInt(amountText.replace(/\D/g, ''));

            if (!amount || isNaN(amount)) {
                return await interaction.editReply({
                    content: '❌ Сума має бути числом.'
                });
            }

            const modalParts = interaction.customId.split(':');
            const isPlus = modalParts[0] === 'modal_plus';
            const bankType = isPlus ? 'plus' : 'minus';
            const category = modalParts[1] || 'other';
            const categoryLabel = getBankCategoryLabel(bankType, category);

            const member = interaction.member;
            const displayName = member?.displayName || interaction.user.username;
            const nick = `<@${interaction.user.id}>`;

            const role =
                member.roles.cache
                    .filter(r => r.name !== '@everyone')
                    .sort((a, b) => b.position - a.position)
                    .first()?.name || 'Без ролі';

            if (!isPlus) {
                pendingWithdrawals.set(interaction.user.id, {
                    nick,
                    amount,
                    note,
                    displayName,
                    role,
                    category,
                    categoryLabel,
                    createdAt: Date.now()
                });

                const confirmEmbed = new EmbedBuilder()
                    .setColor(0xffcc00)
                    .setTitle('⚠️ Підтвердження зняття коштів')
                    .setDescription(
                        `👤 **Учасник:** ${nick}\n\n` +
                        `💵 **Сума:** \`${formatMoney(amount)}\`\n\n` +
                        `📂 **Категорія:** ${categoryLabel}\n\n` +
                        `📝 **Примітка:** ${note}\n\n` +
                        `━━━━━━━━━━━━━━━━━━━━\n\n` +
                        `Натисніть **Підтвердити**, щоб виконати зняття.`
                    )
                    .setFooter({ text: 'Hoffman Bank • Withdraw Confirmation' })
                    .setTimestamp();

                const buttons = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId(`withdraw_confirm:${interaction.user.id}`)
                        .setLabel('Підтвердити')
                        .setStyle(ButtonStyle.Success)
                        .setEmoji('✅'),

                    new ButtonBuilder()
                        .setCustomId(`withdraw_cancel:${interaction.user.id}`)
                        .setLabel('Скасувати')
                        .setStyle(ButtonStyle.Danger)
                        .setEmoji('❌')
                );

                return await interaction.editReply({
                    embeds: [confirmEmbed],
                    components: [buttons]
                });
            }

            const newBalance = await changeBalance(amount);
            await addDailyStat('plus', amount);

            await recordBankOperation({
                type: 'plus',
                amount,
                category,
                note,
                userId: interaction.user.id,
                userName: nick,
                displayName,
                role,
                balanceAfter: newBalance,
                source: 'manual'
            });

            await updateFinanceCrmPanel();

            const embed = new EmbedBuilder()
                .setColor(0x00ff88)
                .setTitle('🟢 Hoffman Bank — Поповнення сейфу')
                .setDescription(
                    `╔════════════════════╗\n` +
                    `     **ПОПОВНЕННЯ**\n` +
                    `╚════════════════════╝\n\n` +
                    `👤 **Учасник:** ${nick}\n\n` +
                    `💵 **Сума:** \`${formatMoney(amount)}\`\n\n` +
                    `📂 **Категорія:** ${categoryLabel}\n\n` +
                    `📝 **Примітка:** ${note}\n\n` +
                    `━━━━━━━━━━━━━━━━━━━━\n\n` +
                    `💰 **Баланс сейфу:**\n` +
                    `\`${formatMoney(newBalance)}\`\n\n` +
                    `✅ **Дію виконав:** ${displayName}\n` +
                    `🎭 **Роль:** ${role}`
                )
                .setFooter({ text: 'Hoffman Bank • Transaction System' })
                .setTimestamp();

            await logAction(
                '📈 Поповнення сейфу',
                `👤 Виконав: **${displayName}**\n👤 Учасник: **${nick}**\n💵 Сума: **${formatMoney(amount)}**\n📂 Категорія: **${categoryLabel}**\n💰 Новий баланс: **${formatMoney(newBalance)}**\n📌 Примітка: ${note}`,
                0x00ff88
            );

            return await interaction.editReply({
                embeds: [embed]
            });
        }
    } catch (error) {
        console.error('Помилка interactionCreate:', error);

        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content: '❌ Сталась помилка.',
                flags: MessageFlags.Ephemeral
            }).catch(() => {});
        } else {
            await interaction.editReply({
                content: '❌ Сталась помилка.'
            }).catch(() => {});
        }
    }
});

client.on('warn', info => console.warn('⚠️ Discord warn:', info));
client.on('error', error => console.error('❌ Discord client error:', error));
client.on('shardError', error => console.error('❌ Discord shard error:', error));
client.on('shardReady', id => console.log(`✅ Discord shard ${id} ready`));
client.on('shardDisconnect', (event, id) => console.warn(`⚠️ Discord shard ${id} disconnected:`, event?.code, event?.reason));
client.on('shardReconnecting', id => console.log(`🔄 Discord shard ${id} reconnecting...`));
client.on('invalidated', () => console.error('❌ Discord session invalidated.'));

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
