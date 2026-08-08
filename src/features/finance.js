module.exports = function registerModule(ctx) {
    with (ctx) {
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

        Object.assign(ctx, {
            getKyivWeekRange,
            formatSignedMoney,
            getFinanceWeeklyStats,
            formatCategoryStats,
            createFinanceCrmEmbed,
            createFinanceCrmButtons,
            ensureFinanceCrmPanel,
            updateFinanceCrmPanel,
            createFinanceWeeklyReportEmbed,
            sendFinanceWeeklyReport,
            showFinanceRecentOperations
        });
    }
};