module.exports = function registerModule(ctx) {
    with (ctx) {
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

        Object.assign(ctx, {
            CAREER_TYPE_LABELS,
            CAREER_RANKS,
            getCareerTypeLabel,
            getCareerSettings,
            getCareerWeeklyStats,
            createCareerPublicEmbed,
            createCareerPublicButtons,
            ensureCareerPublicPanel,
            createCareerCrmEmbed,
            createCareerCrmButtons,
            ensureCareerCrmPanel,
            updateCareerPanels,
            showCareerRequirements,
            openCareerApplicationModal,
            createCareerReviewButtons,
            handleCareerApplicationModal,
            createCareerDecisionDM,
            reviewCareerApplication,
            setCareerOpen,
            showCareerRecentApplications
        });
    }
};