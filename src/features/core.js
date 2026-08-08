module.exports = function registerModule(ctx) {
    with (ctx) {
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

        Object.assign(ctx, {
            logAction,
            checkGlobalSecurity,
            sendReport
        });
    }
};