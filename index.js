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
    ButtonStyle
} = require('discord.js');

const { MongoClient } = require('mongodb');
const http = require('http');

const TOKEN = process.env.TOKEN;
const LOTTERY_CHANNEL_ID = '1513486880488816640';
const LOTTERY_CRM_CHANNEL_ID = '1513487657190166538';
const MONGODB_URI = process.env.MONGODB_URI;
const REPORT_CHANNEL_ID = process.env.REPORT_CHANNEL_ID;
const QUEST_CHANNEL_ID = process.env.QUEST_CHANNEL_ID;
const BANK_CHANNEL_ID = process.env.BANK_CHANNEL_ID;
const LOG_CHANNEL_ID = process.env.LOG_CHANNEL_ID;

const BIRTHDAY_CHANNEL_ID = '1495990457904140428';
const BIRTHDAY_NEWS_CHANNEL_ID = '1495989840930672721';

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

const DEFAULT_QUESTS = [
    { key: 'tovarnyi_vybukh', name: 'Товарний вибух', reward: 1000000, cooldownHours: 24 },
    { key: 'dopomoha_hromadianam', name: 'Допомога громадянам', reward: 1000000, cooldownHours: 24 },
    { key: 'myslyvskyi_sezon', name: 'Мисливський сезон', reward: 500000, cooldownHours: 24 }
];

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

let lotteryTickets;
let lotterySettings;
let lotteryHistory;
let balances;
let dailyStats;
let botSettings;
let questDefinitions;
let questStates;
let birthdays;

const commandCooldowns = new Map();
const pendingWithdrawals = new Map();

function formatMoney(amount) {
    return `$${Number(amount).toLocaleString('en-US')}`;
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
    if (!MONGODB_URI) throw new Error('MONGODB_URI не доданий у Render');

    const mongo = new MongoClient(MONGODB_URI);
    await mongo.connect();

    const db = mongo.db('hoffman_bot');

    balances = db.collection('balances');
    dailyStats = db.collection('daily_stats');
    botSettings = db.collection('bot_settings');
    lotteryTickets = db.collection('lottery_tickets');
    lotterySettings = db.collection('lottery_settings');
    lotteryHistory = db.collection('lottery_history');
    questDefinitions = db.collection('quest_definitions');
    questStates = db.collection('quest_states');
    birthdays = db.collection('birthdays');

    await birthdays.createIndex({ nameLower: 1 }, { unique: true });

     await lotteryTickets.createIndex({ userId: 1 }, { unique: true });

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
        .setColor(0xd4af37)
        .setTitle('🏛 FAMILY HOFFMAN — Система заявок')
        .setDescription(
            `📌 **Для подачі заявки до сімʼї Hoffman натисніть кнопку нижче:**\n\n` +
            `📨 **Подати заявку**\n\n` +
            `━━━━━━━━━━━━━━━━━━━━\n\n` +
            `📋 **Хто може подати заявку:**\n` +
            `• тільки користувачі з роллю **Гість**\n\n` +
            `📨 **Після подачі заявки:**\n` +
            `• анкета автоматично потрапить на розгляд керівництва\n` +
            `• заявки розглядаються 9 та 10 рангом\n` +
            `• у разі схвалення з вами звʼяжуться в приватні повідомлення\n` +
            `• у разі відмови заявка буде відхилена\n\n` +
            `⚠️ **Важливо:**\n` +
            `• заповнюйте форму повністю та адекватно\n` +
            `• заявки не по формі можуть бути відхилені\n` +
            `• повторний спам заявками може призвести до відмови\n\n` +
            `━━━━━━━━━━━━━━━━━━━━\n\n` +
            `💼 **Hoffman Family Recruitment System**`
        )
        .setFooter({ text: 'Hoffman Family • Application Panel' })
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

function createQuestRunningEmbed(quest, userId, userName, note, members = []) {
    const membersText = members.length
        ? members.map(member => `<@${member.id}>`).join('\n')
        : `<@${userId}>`;

    return new EmbedBuilder()
        .setColor(0xd4af37)
        .setTitle('🧩 Hoffman Quest System')
        .setDescription(
            `📌 **Квест:** ${quest.name}\n\n` +
            `👤 **Почав виконання:** <@${userId}>\n` +
            `📝 **Імʼя:** ${userName}\n\n` +
            `👥 **Учасники квесту:**\n${membersText}\n\n` +
            `💰 **Нагорода:** \`${formatMoney(quest.reward)}\`\n` +
            `🎟 **Квитки:** +1 кожному учаснику після виконання\n` +
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

const questMembers = [
    interaction.user,
    interaction.options.getUser('member1'),
    interaction.options.getUser('member2'),
    interaction.options.getUser('member3'),
    interaction.options.getUser('member4')
].filter(Boolean);

const uniqueQuestMembers = [
    ...new Map(questMembers.map(member => [member.id, member])).values()
];

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

    const message = await channel.send({
        embeds: [createQuestRunningEmbed(quest, interaction.user.id, userName, note)],
        components: [createQuestButtons(quest.key, interaction.user.id)]
    });

    await questStates.updateOne(
        { key: quest.key },
        {
            $set: {
                key: quest.key,
                status: 'running',
                activeUserId: interaction.user.id,
                activeUserName: userName,
                members: uniqueQuestMembers.map(member => member.id),
                messageId: message.id,
                cooldownUntil: null,
                reminder2hSent: false,
                availableSent: false,
                startedAt: now
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

async function completeOrCancelQuest(interaction, completed) {
    const [_, key, starterId] = interaction.customId.split(':');

    if (interaction.user.id !== starterId) {
        return await interaction.reply({
            content: '❌ Завершити або скасувати цей квест може тільки той, хто його почав.',
            flags: MessageFlags.Ephemeral
        });
    }

    const quest = await questDefinitions.findOne({ key });
    const state = await questStates.findOne({ key });

    if (!quest || !state || state.status !== 'running') {
        return await interaction.reply({
            content: '❌ Цей квест вже не перебуває у виконанні.',
            flags: MessageFlags.Ephemeral
        });
    }

    const cooldownUntil = Date.now() + quest.cooldownHours * 60 * 60 * 1000;
    let newBalance = await getBalance();

    if (completed) {
    newBalance = await changeBalance(quest.reward);
    await addDailyStat('plus', quest.reward);

    const rewardMembers = state.members || [interaction.user.id];

    for (const memberId of rewardMembers) {
        await addLotteryTicket(memberId, 1);
    }

    await logAction(
        '🎟 Видано lottery квитки',
        rewardMembers.map(id => `• <@${id}> → +1 квиток`).join('\n'),
        0xffd700
    );
}
    
    await questStates.updateOne(
        { key },
        {
            $set: {
                status: 'cooldown',
                cooldownUntil,
                reminder2hSent: false,
                availableSent: false,
                completedAt: Date.now(),
                completed
            }
        },
        { upsert: true }
    );

    const embed = new EmbedBuilder()
        .setColor(completed ? 0x00ff88 : 0xff3333)
        .setTitle(completed ? '✅ КВЕСТ ВИКОНАНО' : '❌ КВЕСТ СКАСОВАНО')
        .setDescription(
            `📌 **Квест:** ${quest.name}\n\n` +
            `👤 **Учасник:** <@${interaction.user.id}>\n\n` +
            `💰 **Нараховано в банк:** \`${completed ? formatMoney(quest.reward) : '$0'}\`\n` +
            `💰 **Баланс сейфу:** \`${formatMoney(newBalance)}\`\n\n` +
            `🔒 **Відкат:** ${quest.cooldownHours} годин\n` +
            `✅ **Наступна доступність:** ${getKyivDateTime(cooldownUntil)}`
        )
        .setFooter({ text: completed ? 'Hoffman Family • Quest Completed' : 'Hoffman Family • Quest Cancelled' })
        .setTimestamp();

    await logAction(
        completed ? '✅ Квест виконано' : '❌ Квест скасовано',
        `📌 Квест: **${quest.name}**\n👤 Учасник: <@${interaction.user.id}>\n💰 Нараховано: **${completed ? formatMoney(quest.reward) : '$0'}**\n🔒 Наступна доступність: **${getKyivDateTime(cooldownUntil)}**`,
        completed ? 0x00ff88 : 0xff3333
    );

    await interaction.update({
        embeds: [embed],
        components: [createDisabledQuestButtons()]
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
        .setColor(0xd4af37)
        .setTitle('🎂 Hoffman Birthday System')
        .setDescription(
            `Список днів народження учасників сімʼї Hoffman.\n\n` +
            `━━━━━━━━━━━━━━━━━━━━\n\n` +
            `${text}\n\n` +
            `━━━━━━━━━━━━━━━━━━━━\n\n` +
            `📌 **Всього записів:** ${list.length}\n\n` +
            `➕ **Додати** — внести новий день народження\n` +
            `➖ **Видалити** — прибрати запис зі списку`
        )
        .setFooter({ text: 'Hoffman Family • Birthday System' })
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

async function createLotteryPanelEmbed() {
    const settings = await getLotterySettings();
    const tickets = await getAllLotteryTickets();

    const totalTickets = tickets.reduce((sum, item) => sum + (item.tickets || 0), 0);
    const participants = tickets.filter(item => item.tickets > 0).length;

    const prizeText = settings.prizeType === 'money'
        ? `💰 Випадкова сума від **${formatMoney(settings.minPrize)}** до **${formatMoney(settings.maxPrize)}**`
        : `🎁 **${settings.manualPrizeName || 'Ручний приз'}**\n${settings.manualPrizeDescription || 'Опис не вказано.'}`;

    return new EmbedBuilder()
        .setColor(0xd4af37)
        .setTitle('🎰 HOFFMAN WEEKLY LOTTERY')
        .setDescription(
            `🏛 Щотижневий розіграш серед учасників Hoffman Family.\n\n` +
            `━━━━━━━━━━━━━━━━━━━━\n\n` +
            `📅 **Розіграш:** щонеділі о 21:00\n\n` +
            `🎁 **Приз цього тижня:**\n${prizeText}\n\n` +
            `🎟 **Як отримати квитки:**\n` +
            `1 виконаний квест = 1 квиток\n` +
            `Якщо квест виконували разом — кожен учасник отримує по 1 квитку.\n\n` +
            `📊 **Учасників цього тижня:** ${participants}\n` +
            `🎟 **Загальна кількість квитків:** ${totalTickets}\n\n` +
            `━━━━━━━━━━━━━━━━━━━━\n\n` +
            `Чим більше активності — тим більше шансів на перемогу.`
        )
        .setFooter({ text: 'Hoffman Family • Weekly Lottery' })
        .setTimestamp();
}

function createLotteryPanelButtons() {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('lottery_my_tickets')
            .setLabel('Мої квитки')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('🎟'),

        new ButtonBuilder()
            .setCustomId('lottery_table')
            .setLabel('Таблиця')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('📊'),

        new ButtonBuilder()
            .setCustomId('lottery_history')
            .setLabel('Історія')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('🏆')
    );
}

async function ensureLotteryPanel() {
    const channel = await client.channels.fetch(LOTTERY_CHANNEL_ID).catch(() => null);
    if (!channel) {
        console.log('Канал лотереї не знайдено.');
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

    const message = await channel.send({
        embeds: [embed],
        components: [buttons]
    });

    await updateLotterySettings({
        lotteryPanelMessageId: message.id
    });

    console.log('Панель лотереї створено.');
}

async function updateLotteryPanel() {
    await ensureLotteryPanel();
}

async function createLotteryCrmEmbed() {
    const settings = await getLotterySettings();
    const tickets = await getAllLotteryTickets();

    const totalTickets = tickets.reduce((sum, item) => sum + (item.tickets || 0), 0);
    const participants = tickets.filter(item => item.tickets > 0).length;

    const prizeText = settings.prizeType === 'money'
        ? `💰 ${formatMoney(settings.minPrize)} — ${formatMoney(settings.maxPrize)}`
        : `🎁 ${settings.manualPrizeName || 'Ручний приз'}\n${settings.manualPrizeDescription || 'Опис не вказано.'}`;

    return new EmbedBuilder()
        .setColor(0xd4af37)
        .setTitle('🎰 HOFFMAN LOTTERY CRM')
        .setDescription(
            `⚙️ **Статус:** ${settings.enabled ? 'Увімкнено' : 'Вимкнено'}\n` +
            `📅 **Авто-розіграш:** щонеділі о 21:00\n\n` +
            `🎁 **Активний приз:**\n${prizeText}\n\n` +
            `👥 **Учасників:** ${participants}\n` +
            `🎟 **Квитків:** ${totalTickets}\n\n` +
            `━━━━━━━━━━━━━━━━━━━━\n\n` +
            `CRM-панель доступна тільки керівництву Hoffman Family.`
        )
        .setFooter({ text: 'Hoffman Family • Lottery CRM' })
        .setTimestamp();
}

function createLotteryCrmButtons() {
    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('lottery_run_now')
            .setLabel('Провести зараз')
            .setStyle(ButtonStyle.Success)
            .setEmoji('▶️'),

        new ButtonBuilder()
            .setCustomId('lottery_set_money')
            .setLabel('Грошовий приз')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('💰'),

        new ButtonBuilder()
            .setCustomId('lottery_set_manual_prize')
            .setLabel('Ручний приз')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('🎁')
    );

    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('lottery_add_ticket')
            .setLabel('Видати квитки')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('🎟'),

        new ButtonBuilder()
            .setCustomId('lottery_reset_tickets')
            .setLabel('Скинути квитки')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('🗑'),

        new ButtonBuilder()
            .setCustomId('lottery_refresh')
            .setLabel('Оновити')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('🔁')
    );

    return [row1, row2];
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

    const message = await channel.send({
        embeds: [embed],
        components: buttons
    });

    await updateLotterySettings({
        lotteryCrmMessageId: message.id
    });

    console.log('CRM панель лотереї створено.');
}

async function updateLotteryCrmPanel() {
    await ensureLotteryCrmPanel();
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
    .addStringOption(option =>
        option.setName('note').setDescription('Примітка').setRequired(false)
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

    } catch (error) {
        console.error('Помилка запуску:', error);
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

            const modal = new ModalBuilder()
                .setCustomId(isPlus ? 'modal_plus' : 'modal_minus')
                .setTitle(isPlus ? 'Поповнення сейфу' : 'Зняття коштів');

            const nickInput = new TextInputBuilder()
                .setCustomId('nick')
                .setLabel('Нік')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            const amountInput = new TextInputBuilder()
                .setCustomId('amount')
                .setLabel('Сума')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            const noteInput = new TextInputBuilder()
                .setCustomId('note')
                .setLabel('Примітка')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(false);

            modal.addComponents(
                new ActionRowBuilder().addComponents(nickInput),
                new ActionRowBuilder().addComponents(amountInput),
                new ActionRowBuilder().addComponents(noteInput)
            );

            return await interaction.showModal(modal);
        }

        if (interaction.isButton()) {
              if (interaction.customId === 'lottery_my_tickets') {
            const tickets = await getLotteryTickets(interaction.user.id);

            return await interaction.reply({
                content:
                    `🎟 У вас зараз **${tickets}** lottery квитків.\n\n` +
                    `🧩 1 виконаний квест = 1 квиток.`,
                flags: MessageFlags.Ephemeral
            });
        }

        if (interaction.customId === 'lottery_table') {
            const entries = await getAllLotteryTickets();

            if (!entries.length) {
                return await interaction.reply({
                    content: '❌ Зараз ще немає учасників лотереї.',
                    flags: MessageFlags.Ephemeral
                });
            }

            const sorted = entries
                .sort((a, b) => b.tickets - a.tickets)
                .slice(0, 10);

            const text = sorted
                .map((entry, index) =>
                    `**${index + 1}.** <@${entry.userId}> — 🎟 ${entry.tickets}`
                )
                .join('\n');

            return await interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0xd4af37)
                        .setTitle('📊 Hoffman Lottery Leaderboard')
                        .setDescription(text)
                        .setFooter({
                            text: 'Hoffman Family • Weekly Lottery'
                        })
                        .setTimestamp()
                ],
                flags: MessageFlags.Ephemeral
            });
        }

        if (interaction.customId === 'lottery_history') {
            const history = await lotteryHistory
                .find({})
                .sort({ createdAt: -1 })
                .limit(10)
                .toArray();

            if (!history.length) {
                return await interaction.reply({
                    content: '❌ Історія розіграшів поки порожня.',
                    flags: MessageFlags.Ephemeral
                });
            }

            const text = history
                .map((item, index) => {
                    const prize =
                        item.prizeType === 'money'
                            ? `💰 ${formatMoney(item.amount)}`
                            : `🎁 ${item.prizeName}`;

                    return `**${index + 1}.** <@${item.userId}> — ${prize}`;
                })
                .join('\n');

            return await interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0xd4af37)
                        .setTitle('🏆 Історія Hoffman Lottery')
                        .setDescription(text)
                        .setFooter({
                            text: 'Hoffman Family • Weekly Lottery'
                        })
                        .setTimestamp()
                ],
                flags: MessageFlags.Ephemeral
            });
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

                const embed = new EmbedBuilder()
                    .setColor(0xff3333)
                    .setTitle('🔴 Hoffman Bank — Зняття коштів')
                    .setDescription(
                        `╔════════════════════╗\n` +
                        `     **ЗНЯТТЯ КОШТІВ**\n` +
                        `╚════════════════════╝\n\n` +
                        `👤 **Нік:** ${data.nick}\n\n` +
                        `💵 **Сума:** \`${formatMoney(data.amount)}\`\n\n` +
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
                    `👤 Виконав: **${data.displayName}**\n📝 Нік: **${data.nick}**\n💵 Сума: **${formatMoney(data.amount)}**\n💰 Новий баланс: **${formatMoney(newBalance)}**\n📌 Примітка: ${data.note}`,
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

            if (interaction.customId.startsWith('quest_finish:')) {
                return await completeOrCancelQuest(interaction, true);
            }

            if (interaction.customId.startsWith('quest_cancel:')) {
                return await completeOrCancelQuest(interaction, false);
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

            function getRandomPrize(min, max, step = 100000) {
    const count = Math.floor((max - min) / step) + 1;
    return min + Math.floor(Math.random() * count) * step;
}

async function addLotteryTicket(userId, amount = 1) {
    await lotteryTickets.updateOne(
        { userId },
        {
            $inc: {
                tickets: amount
            }
        },
        { upsert: true }
    );
}

async function getLotteryTickets(userId) {
    const data = await lotteryTickets.findOne({ userId });

    return data?.tickets || 0;
}

async function resetLotteryTickets() {
    await lotteryTickets.deleteMany({});
}

async function getAllLotteryTickets() {
    return await lotteryTickets.find({}).toArray();
}

async function getLotterySettings() {
    return await lotterySettings.findOne({
        name: 'weekly_lottery'
    });
}

async function updateLotterySettings(data) {
    await lotterySettings.updateOne(
        { name: 'weekly_lottery' },
        {
            $set: data
        }
    );
}

async function saveLotteryHistory(data) {
    await lotteryHistory.insertOne({
        ...data,
        createdAt: new Date()
    });
}

function pickLotteryWinner(entries) {
    const pool = [];

    for (const entry of entries) {
        for (let i = 0; i < entry.tickets; i++) {
            pool.push(entry.userId);
        }
    }

    if (!pool.length) return null;

    return pool[Math.floor(Math.random() * pool.length)];
}

async function canRunLottery() {
    const settings = await getLotterySettings();

    const balanceData = await balances.findOne({ name: 'safe' });

    const balance = balanceData?.balance || 0;

    return balance >= settings.minPrize;
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

            const nick = interaction.fields.getTextInputValue('nick');
            const amountText = interaction.fields.getTextInputValue('amount');
            const note = interaction.fields.getTextInputValue('note') || '—';

            const amount = parseInt(amountText.replace(/\D/g, ''));

            if (!amount || isNaN(amount)) {
                return await interaction.editReply({
                    content: '❌ Сума має бути числом.'
                });
            }

            const isPlus = interaction.customId === 'modal_plus';

            const member = interaction.member;
            const displayName = member?.displayName || interaction.user.username;

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
                    createdAt: Date.now()
                });

                const confirmEmbed = new EmbedBuilder()
                    .setColor(0xffcc00)
                    .setTitle('⚠️ Підтвердження зняття коштів')
                    .setDescription(
                        `👤 **Нік:** ${nick}\n\n` +
                        `💵 **Сума:** \`${formatMoney(amount)}\`\n\n` +
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

            const embed = new EmbedBuilder()
                .setColor(0x00ff88)
                .setTitle('🟢 Hoffman Bank — Поповнення сейфу')
                .setDescription(
                    `╔════════════════════╗\n` +
                    `     **ПОПОВНЕННЯ**\n` +
                    `╚════════════════════╝\n\n` +
                    `👤 **Нік:** ${nick}\n\n` +
                    `💵 **Сума:** \`${formatMoney(amount)}\`\n\n` +
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
                `👤 Виконав: **${displayName}**\n📝 Нік: **${nick}**\n💵 Сума: **${formatMoney(amount)}**\n💰 Новий баланс: **${formatMoney(newBalance)}**\n📌 Примітка: ${note}`,
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

client.login(TOKEN);

http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Bot is running');
}).listen(process.env.PORT || 3000, () => {
    console.log('Web server запущений для Render');
});
