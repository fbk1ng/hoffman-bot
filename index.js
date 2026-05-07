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
const MONGODB_URI = process.env.MONGODB_URI;
const REPORT_CHANNEL_ID = process.env.REPORT_CHANNEL_ID;

const CLIENT_ID = '1501160094006771812';
const GUILD_ID = '1495987963887227031';

const APPLICATION_PUBLIC_CHANNEL_ID = '1495989924938383490';
const APPLICATION_REVIEW_CHANNEL_ID = '1501498789188341851';

const GUEST_ROLE_ID = '1496709652866666586';
const ACCEPTED_ROLE_ID = '1495998331216723968';

const REVIEW_ROLE_IDS = [
    '1495997440333971507',
    '1495997048669863966'
];

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

let balances;
let dailyStats;
let botSettings;

function getKyivDate() {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Europe/Kyiv',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).format(new Date());
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

async function connectDB() {
    if (!MONGODB_URI) throw new Error('MONGODB_URI не доданий у Render');

    const mongo = new MongoClient(MONGODB_URI);
    await mongo.connect();

    const db = mongo.db('hoffman_bot');

    balances = db.collection('balances');
    dailyStats = db.collection('daily_stats');
    botSettings = db.collection('bot_settings');

    await balances.updateOne(
        { name: 'safe' },
        { $setOnInsert: { name: 'safe', balance: 0 } },
        { upsert: true }
    );

    console.log('MongoDB підключено.');
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
            `\`+$${plus.toLocaleString('en-US')}\`\n\n` +
            `📉 **Зняття за день:**\n` +
            `\`-$${minus.toLocaleString('en-US')}\`\n\n` +
            `━━━━━━━━━━━━━━━━━━━━\n\n` +
            `💰 **Поточний баланс сейфу:**\n` +
            `\`$${balance.toLocaleString('en-US')}\`\n\n` +
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

    return { ok: true, message: '✅ Звіт відправлено.' };
}

function hasReviewAccess(member) {
    return REVIEW_ROLE_IDS.some(roleId => member.roles.cache.has(roleId));
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
            .setCustomId('open_application_modal')
            .setLabel('Подати заявку')
            .setStyle(ButtonStyle.Success)
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

    if (!interaction.member.roles.cache.has(GUEST_ROLE_ID)) {
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

const commands = [
    new SlashCommandBuilder()
        .setName('total_plus')
        .setDescription('Поповнення сейфу'),

    new SlashCommandBuilder()
        .setName('total_minus')
        .setDescription('Зняття коштів'),

    new SlashCommandBuilder()
        .setName('balance')
        .setDescription('Показати баланс сейфу'),

    new SlashCommandBuilder()
        .setName('report')
        .setDescription('Відправити звіт вручну'),

    new SlashCommandBuilder()
        .setName('apply')
        .setDescription('Подати заявку до сімʼї Hoffman')
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

        setInterval(async () => {
            const { hour, minute } = getKyivTime();

            if (hour === 23 && minute === 59) {
                await sendReport(false);
            }
        }, 60000);

    } catch (error) {
        console.error('Помилка запуску:', error);
    }
});

client.on('interactionCreate', async interaction => {
    try {
        if (interaction.isChatInputCommand()) {
            if (interaction.commandName === 'balance') {
                const balance = await getBalance();

                const embed = new EmbedBuilder()
                    .setColor(0xd4af37)
                    .setTitle('🏦 Hoffman Bank')
                    .setDescription(
                        `💰 **Поточний баланс сейфу:**\n\n` +
                        `\`$${balance.toLocaleString('en-US')}\``
                    )
                    .setFooter({ text: 'Hoffman Bank • Safe Balance' })
                    .setTimestamp();

                return await interaction.reply({
                    embeds: [embed],
                    flags: MessageFlags.Ephemeral
                });
            }

            if (interaction.commandName === 'report') {
                await interaction.deferReply({
                    flags: MessageFlags.Ephemeral
                });

                const result = await sendReport(true);

                return await interaction.editReply({
                    content: result.message
                });
            }

            if (interaction.commandName === 'apply') {
                return await openApplicationModal(interaction);
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
            if (interaction.customId === 'open_application_modal') {
                return await openApplicationModal(interaction);
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
            if (interaction.customId === 'hoffman_application') {
                await interaction.deferReply({
                    flags: MessageFlags.Ephemeral
                });

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
            const newBalance = await changeBalance(isPlus ? amount : -amount);

            await addDailyStat(isPlus ? 'plus' : 'minus', amount);

            const member = interaction.member;
            const displayName = member?.displayName || interaction.user.username;

            const role =
                member.roles.cache
                    .filter(r => r.name !== '@everyone')
                    .sort((a, b) => b.position - a.position)
                    .first()?.name || 'Без ролі';

            const embed = new EmbedBuilder()
                .setColor(isPlus ? 0x00ff88 : 0xff3333)
                .setTitle(
                    isPlus
                        ? '🟢 Hoffman Bank — Поповнення сейфу'
                        : '🔴 Hoffman Bank — Зняття коштів'
                )
                .setDescription(
                    `╔════════════════════╗\n` +
                    `     **${isPlus ? 'ПОПОВНЕННЯ' : 'ЗНЯТТЯ КОШТІВ'}**\n` +
                    `╚════════════════════╝\n\n` +
                    `👤 **Нік:** ${nick}\n\n` +
                    `💵 **Сума:** \`$${amount.toLocaleString('en-US')}\`\n\n` +
                    `📝 **Примітка:** ${note}\n\n` +
                    `━━━━━━━━━━━━━━━━━━━━\n\n` +
                    `💰 **Баланс сейфу:**\n` +
                    `\`$${newBalance.toLocaleString('en-US')}\`\n\n` +
                    `✅ **Дію виконав:** ${displayName}\n` +
                    `🎭 **Роль:** ${role}`
                )
                .setFooter({
                    text: 'Hoffman Bank • Transaction System'
                })
                .setTimestamp();

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
    res.writeHead(200, {
        'Content-Type': 'text/plain'
    });

    res.end('Bot is running');

}).listen(process.env.PORT || 3000, () => {
    console.log('Web server запущений для Render');
});
