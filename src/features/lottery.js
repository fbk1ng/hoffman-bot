module.exports = function registerModule(ctx) {
    with (ctx) {
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

        Object.assign(ctx, {
            getKyivDayKey,
            getKyivWeekdayNumber,
            randomPrizeAmount,
            uniqueParticipants,
            getQuestParticipantsFromInteraction,
            getLotterySettings,
            getLotteryStats,
            addLotteryTicket,
            addLotteryTicketsForQuest,
            getLotteryPrizeText,
            createLotteryPanelEmbed,
            createLotteryPanelButtons,
            ensureLotteryPanel,
            createLotteryCrmEmbed,
            createLotteryCrmButtons,
            ensureLotteryCrmPanel,
            updateLotteryPanels,
            pickWeightedWinner,
            runLotteryDraw,
            checkLotteryAutoDraw,
            showMyLotteryTickets,
            showLotteryParticipants,
            showLotteryHistory,
            openLotteryMoneyModal,
            openLotteryManualPrizeModal,
            openLotteryAddTicketsModal,
            openLotteryRemoveTicketsModal,
            removeLotteryTickets,
            resetLotteryTickets
        });
    }
};