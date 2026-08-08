module.exports = function registerModule(ctx) {
    with (ctx) {
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
            `3. Обери напрямок та подай заявку\n\n` +
            `🏠 **Hoffman Family** — вступ до основного складу сімʼї.\n` +
            `🏢 **Hoffman LTD** — працевлаштування до компанії сімʼї.\n\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `⚙️ Заповнюй анкету уважно. Заявки розглядає керівництво.\n\n` +
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
            .setCustomId('open_family_application_modal')
            .setLabel('Заявка в сімʼю')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('💌'),

        new ButtonBuilder()
            .setCustomId('open_company_application_modal')
            .setLabel('Заявка до фірми')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('🏢')
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
            content: '❌ Подавати заявку в сімʼю можуть тільки користувачі з роллю **Гість**.',
            flags: MessageFlags.Ephemeral
        });
    }

    const modal = new ModalBuilder()
        .setCustomId('hoffman_family_application')
        .setTitle('Заявка в Hoffman Family');

    const nickInput = new TextInputBuilder()
        .setCustomId('nick_static')
        .setLabel('Nick Name #static')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    const levelAgeInput = new TextInputBuilder()
        .setCustomId('level_age')
        .setLabel('Ігровий рівень та реальний вік')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Наприклад: 25 рівень, 22 роки')
        .setRequired(true);

    const onlineInput = new TextInputBuilder()
        .setCustomId('daily_online')
        .setLabel('Добовий онлайн')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    const previousFamilyInput = new TextInputBuilder()
        .setCustomId('previous_family')
        .setLabel('В якій сімʼї були до цього?')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Якщо не були — вкажіть "Не був"')
        .setRequired(true);

    const extraInput = new TextInputBuilder()
        .setCustomId('extra_info')
        .setLabel('Додаткова інформація')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Плюси/мінуси, біо, напрямок розвитку, посилання на статистику')
        .setRequired(true);

    modal.addComponents(
        new ActionRowBuilder().addComponents(nickInput),
        new ActionRowBuilder().addComponents(levelAgeInput),
        new ActionRowBuilder().addComponents(onlineInput),
        new ActionRowBuilder().addComponents(previousFamilyInput),
        new ActionRowBuilder().addComponents(extraInput)
    );

    return await interaction.showModal(modal);
}

async function openCompanyApplicationModal(interaction) {
    if (interaction.channelId !== APPLICATION_PUBLIC_CHANNEL_ID) {
        return await interaction.reply({
            content: '❌ Подати заявку можна тільки у спеціальному каналі.',
            flags: MessageFlags.Ephemeral
        });
    }

    const mayApply = hasRole(interaction.member, GUEST_ROLE_ID) || hasFamilyAccess(interaction.member);

    if (!mayApply) {
        return await interaction.reply({
            content: '❌ Спочатку отримайте роль **Гість** через кнопку в панелі.',
            flags: MessageFlags.Ephemeral
        });
    }

    const modal = new ModalBuilder()
        .setCustomId('hoffman_company_application')
        .setTitle('Заявка до Hoffman LTD');

    const nickInput = new TextInputBuilder()
        .setCustomId('company_nick_static')
        .setLabel('Nick Name #static')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    const levelInput = new TextInputBuilder()
        .setCustomId('company_game_level')
        .setLabel('Ігровий рівень')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    const onlineInput = new TextInputBuilder()
        .setCustomId('company_daily_online')
        .setLabel('Добовий онлайн')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    const experienceInput = new TextInputBuilder()
        .setCustomId('company_experience')
        .setLabel('Досвід роботи у компаніях')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Якщо досвіду немає — вкажіть "Немає"')
        .setRequired(true);

    const reasonInput = new TextInputBuilder()
        .setCustomId('company_reason')
        .setLabel('Чому хочете працювати в Hoffman LTD?')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);

    modal.addComponents(
        new ActionRowBuilder().addComponents(nickInput),
        new ActionRowBuilder().addComponents(levelInput),
        new ActionRowBuilder().addComponents(onlineInput),
        new ActionRowBuilder().addComponents(experienceInput),
        new ActionRowBuilder().addComponents(reasonInput)
    );

    return await interaction.showModal(modal);
}

async function sendApplicationDM(user, approved) {
    const text = approved
        ? `🏛 **Вітаємо!**\n\nВашу заявку до **Hoffman Family** було схвалено.\n\nРоль учасника сімʼї вже видана автоматично, а роль **Гість** прибрана.\n\nЛаскаво просимо до Hoffman Family! 🔥\n\n━━━━━━━━━━━━━━━━━━━━\n\n💼 **Додаткова можливість**\n\nЯкщо бажаєте працювати, виконувати рейси та допомагати розвитку сімейної компанії, подайте окрему заявку до **Hoffman LTD**.\n\nДля цього відкрийте канал подачі заявок і натисніть кнопку **«Заявка до фірми»**.`
        : `🏛 Вашу заявку до сімʼї Hoffman було розглянуто.\n\nНа жаль, цього разу її було відхилено.\n\nПричиною може бути недостатня активність, невідповідність вимогам або неповне заповнення анкети.\n\nВи можете подати повторну заявку пізніше.\n\nБажаємо успіхів та гарної гри. 🤝`;

    await user.send(text).catch(() => null);
}

async function sendCompanyApplicationDM(user, approved) {
    const text = approved
        ? `🏢 **Вітаємо!**\n\nВашу заявку до **Hoffman LTD** було схвалено.\n\nВас офіційно прийнято до компанії, роль працівника видана автоматично, а роль **Гість** прибрана.\n\n💼 Виконуйте рейси, беріть участь у житті компанії та допомагайте розвитку Hoffman Family.\n\nБажаємо успіхів і продуктивної роботи!\n\n**Hoffman LTD**`
        : `🏢 Вашу заявку до **Hoffman LTD** було розглянуто.\n\nНа жаль, цього разу її не було схвалено.\n\nРекомендуємо підвищити активність, отримати більше ігрового досвіду та подати заявку повторно пізніше.\n\nБажаємо успіхів і гарної гри. 🤝`;

    await user.send(text).catch(() => null);
}

        Object.assign(ctx, {
            createApplicationPanelEmbed,
            createApplicationPanelButton,
            ensureApplicationPanel,
            openApplicationModal,
            openCompanyApplicationModal,
            sendApplicationDM,
            sendCompanyApplicationDM
        });
    }
};