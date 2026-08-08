module.exports = function registerModule(ctx) {
    with (ctx) {
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

        Object.assign(ctx, {
            PERSONNEL_ACTION_LABELS,
            getPersonnelActionLabel,
            recordPersonnelAction,
            getPersonnelWeeklyStats,
            createPersonnelCrmEmbed,
            createPersonnelCrmButtons,
            ensurePersonnelCrmPanel,
            updatePersonnelCrmPanel,
            createPersonnelWeeklyReportEmbed,
            sendPersonnelWeeklyReport,
            showPersonnelRecentActions,
            openPersonnelActionModal,
            handlePersonnelActionModal
        });
    }
};