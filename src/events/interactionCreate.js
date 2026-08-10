module.exports = function registerEvent(ctx) {
    with (ctx) {
client.on('interactionCreate', async interaction => {
    try {
        if (interaction.isAutocomplete()) {
            if (interaction.commandName === 'quests' || interaction.commandName === 'quest_repair' || interaction.commandName === 'quest_delete') {
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

            if (interaction.commandName === 'quest_repair') {
                return await repairQuest(interaction);
            }

            if (interaction.commandName === 'quest_add') {
                return await addQuest(interaction);
            }

            if (interaction.commandName === 'quest_delete') {
                return await deleteQuest(interaction);
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
            
            if (interaction.customId === 'open_family_application_modal' || interaction.customId === 'open_application_modal') {
                return await openApplicationModal(interaction);
            }

            if (interaction.customId === 'open_company_application_modal') {
                return await openCompanyApplicationModal(interaction);
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

            const applicationDecisionIds = [
                'application_approve',
                'application_reject',
                'family_application_approve',
                'family_application_reject',
                'company_application_approve',
                'company_application_reject'
            ];

            if (!applicationDecisionIds.includes(interaction.customId)) return;

            if (!hasReviewAccess(interaction.member)) {
                return await interaction.reply({
                    content: '❌ У вас немає доступу.',
                    flags: MessageFlags.Ephemeral
                });
            }

            const approved = interaction.customId.endsWith('_approve');
            const isCompanyApplication = interaction.customId.startsWith('company_');
            const oldEmbed = interaction.message.embeds[0];

            const userMention = oldEmbed.description?.match(/<@!?(\d+)>/);
            const applicantId = userMention ? userMention[1] : null;

            if (approved && applicantId) {
                const guildMember = await interaction.guild.members.fetch(applicantId).catch(() => null);

                if (guildMember) {
                    const roleToAdd = isCompanyApplication ? COMPANY_ROLE_ID : ACCEPTED_ROLE_ID;
                    await guildMember.roles.add(roleToAdd).catch(() => null);
                    await guildMember.roles.remove(GUEST_ROLE_ID).catch(() => null);
                }
            }

            if (applicantId) {
                const applicantUser = await client.users.fetch(applicantId).catch(() => null);

                if (applicantUser) {
                    if (isCompanyApplication) {
                        await sendCompanyApplicationDM(applicantUser, approved);
                    } else {
                        await sendApplicationDM(applicantUser, approved);
                    }
                }
            }

            await recordPersonnelAction({
                type: approved ? 'application_approved' : 'application_rejected',
                targetId: applicantId,
                targetName: applicantId ? `<@${applicantId}>` : 'Невідомий кандидат',
                oldRank: approved ? 'Гість / кандидат' : 'Кандидат',
                newRank: approved
                    ? (isCompanyApplication ? 'Працівник Hoffman LTD' : 'Учасник Hoffman Family')
                    : 'Відхилено',
                reason: approved
                    ? (isCompanyApplication ? 'Заявку до Hoffman LTD схвалено' : 'Заявку до Hoffman Family схвалено')
                    : (isCompanyApplication ? 'Заявку до Hoffman LTD відхилено' : 'Заявку до Hoffman Family відхилено'),
                performedBy: interaction.member?.displayName || interaction.user.username,
                performedById: interaction.user.id,
                source: isCompanyApplication ? 'company_application' : 'family_application'
            });

            await updatePersonnelCrmPanel();

            await logAction(
                approved
                    ? (isCompanyApplication ? '✅ Заявку до Hoffman LTD схвалено' : '✅ Заявку до Hoffman Family схвалено')
                    : (isCompanyApplication ? '❌ Заявку до Hoffman LTD відхилено' : '❌ Заявку до Hoffman Family відхилено'),
                `👤 Кандидат: ${applicantId ? `<@${applicantId}>` : 'невідомо'}\n` +
                `${approved ? `🎭 Видана роль: <@&${isCompanyApplication ? COMPANY_ROLE_ID : ACCEPTED_ROLE_ID}>\n🧹 Роль Гість прибрана\n` : ''}` +
                `🛡 Розглянув: **${interaction.member.displayName}**`,
                approved ? 0x00ff88 : 0xff3333
            );

            const newEmbed = EmbedBuilder.from(oldEmbed)
                .setColor(approved ? 0x00ff88 : 0xff3333)
                .addFields({
                    name: approved ? '✅ Статус заявки' : '❌ Статус заявки',
                    value:
                        `${approved ? 'СХВАЛЕНО' : 'ВІДХИЛЕНО'}\n` +
                        `Розглянув: ${interaction.member.displayName}` +
                        (approved ? `\nРоль видано автоматично.` : '')
                })
                .setFooter({
                    text: approved
                        ? (isCompanyApplication ? 'Hoffman LTD • Application Approved' : 'Hoffman Family • Application Approved')
                        : (isCompanyApplication ? 'Hoffman LTD • Application Rejected' : 'Hoffman Family • Application Rejected')
                })
                .setTimestamp();

            const disabledButtons = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(isCompanyApplication ? 'company_application_approve' : 'family_application_approve')
                    .setLabel('Схвалено')
                    .setStyle(ButtonStyle.Success)
                    .setDisabled(true),

                new ButtonBuilder()
                    .setCustomId(isCompanyApplication ? 'company_application_reject' : 'family_application_reject')
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

            if (interaction.customId === 'hoffman_family_application' || interaction.customId === 'hoffman_application') {
                await interaction.deferReply({ flags: MessageFlags.Ephemeral });

                if (!hasRole(interaction.member, GUEST_ROLE_ID)) {
                    return await interaction.editReply({
                        content: '❌ Подавати заявку в сімʼю можуть тільки користувачі з роллю **Гість**.'
                    });
                }

                const nickStatic = interaction.fields.getTextInputValue('nick_static');
                const levelAge = interaction.fields.getTextInputValue('level_age');
                const dailyOnline = interaction.fields.getTextInputValue('daily_online');
                const previousFamily = interaction.fields.getTextInputValue('previous_family');
                const extraInfo = interaction.fields.getTextInputValue('extra_info');

                const reviewChannel = await client.channels.fetch(APPLICATION_REVIEW_CHANNEL_ID);

                const embed = new EmbedBuilder()
                    .setColor(0xd4af37)
                    .setTitle('🏠 Нова заявка в Hoffman Family')
                    .setDescription(
                        `👤 **Discord:** <@${interaction.user.id}>\n\n` +
                        `📝 **Nick / Static:** ${nickStatic}\n\n` +
                        `🎮 **Рівень та вік:** ${levelAge}\n\n` +
                        `⏰ **Добовий онлайн:** ${dailyOnline}\n\n` +
                        `🏠 **В якій сімʼї були до цього:** ${previousFamily}\n\n` +
                        `📌 **Додаткова інформація:**\n${extraInfo}\n\n` +
                        `━━━━━━━━━━━━━━━━━━━━\n` +
                        `⏳ **Термін розгляду:** до 4 годин`
                    )
                    .setFooter({ text: 'Hoffman Family • Application System' })
                    .setTimestamp();

                const buttons = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('family_application_approve')
                        .setLabel('Схвалити')
                        .setStyle(ButtonStyle.Success)
                        .setEmoji('✅'),

                    new ButtonBuilder()
                        .setCustomId('family_application_reject')
                        .setLabel('Відхилити')
                        .setStyle(ButtonStyle.Danger)
                        .setEmoji('❌')
                );

                await reviewChannel.send({
                    content: `<@&${RANK_9_ROLE_ID}> <@&${RANK_10_ROLE_ID}>`,
                    embeds: [embed],
                    components: [buttons]
                });

                await recordPersonnelAction({
                    type: 'application_submitted',
                    targetId: interaction.user.id,
                    targetName: nickStatic,
                    oldRank: 'Гість',
                    newRank: 'На розгляді — Hoffman Family',
                    reason: `Рівень/вік: ${levelAge}; Онлайн: ${dailyOnline}; Попередня сімʼя: ${previousFamily}`,
                    performedBy: interaction.member?.displayName || interaction.user.username,
                    performedById: interaction.user.id,
                    source: 'family_application'
                });

                await updatePersonnelCrmPanel();

                await logAction(
                    '📨 Нова заявка в Hoffman Family',
                    `👤 Кандидат: <@${interaction.user.id}>\n📝 Nick: **${nickStatic}**\n🏠 Попередня сімʼя: **${previousFamily}**`,
                    0xd4af37
                );

                return await interaction.editReply({
                    content: '✅ Заявка в **Hoffman Family** успішно подана. Термін розгляду — до 4 годин.'
                });
            }

            if (interaction.customId === 'hoffman_company_application') {
                await interaction.deferReply({ flags: MessageFlags.Ephemeral });

                const mayApply = hasRole(interaction.member, GUEST_ROLE_ID) || hasFamilyAccess(interaction.member);

                if (!mayApply) {
                    return await interaction.editReply({
                        content: '❌ Спочатку отримайте роль **Гість** через кнопку в панелі.'
                    });
                }

                const nickStatic = interaction.fields.getTextInputValue('company_nick_static');
                const gameLevel = interaction.fields.getTextInputValue('company_game_level');
                const dailyOnline = interaction.fields.getTextInputValue('company_daily_online');
                const experience = interaction.fields.getTextInputValue('company_experience');
                const reason = interaction.fields.getTextInputValue('company_reason');

                const reviewChannel = await client.channels.fetch(APPLICATION_REVIEW_CHANNEL_ID);

                const embed = new EmbedBuilder()
                    .setColor(HOFFMAN_RED)
                    .setTitle('🏢 Нова заявка до Hoffman LTD')
                    .setDescription(
                        `👤 **Discord:** <@${interaction.user.id}>\n\n` +
                        `📝 **Nick / Static:** ${nickStatic}\n\n` +
                        `🎮 **Ігровий рівень:** ${gameLevel}\n\n` +
                        `⏰ **Добовий онлайн:** ${dailyOnline}\n\n` +
                        `💼 **Досвід роботи у компаніях:**\n${experience}\n\n` +
                        `📌 **Чому хоче працювати в Hoffman LTD:**\n${reason}\n\n` +
                        `━━━━━━━━━━━━━━━━━━━━\n` +
                        `⏳ **Статус:** очікує розгляду`
                    )
                    .setFooter({ text: 'Hoffman LTD • Employment Application' })
                    .setTimestamp();

                const buttons = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('company_application_approve')
                        .setLabel('Схвалити')
                        .setStyle(ButtonStyle.Success)
                        .setEmoji('✅'),

                    new ButtonBuilder()
                        .setCustomId('company_application_reject')
                        .setLabel('Відхилити')
                        .setStyle(ButtonStyle.Danger)
                        .setEmoji('❌')
                );

                await reviewChannel.send({
                    content: `<@&${RANK_9_ROLE_ID}> <@&${RANK_10_ROLE_ID}>`,
                    embeds: [embed],
                    components: [buttons]
                });

                await recordPersonnelAction({
                    type: 'application_submitted',
                    targetId: interaction.user.id,
                    targetName: nickStatic,
                    oldRank: hasFamilyAccess(interaction.member) ? 'Учасник Hoffman Family' : 'Гість',
                    newRank: 'На розгляді — Hoffman LTD',
                    reason: `Рівень: ${gameLevel}; Онлайн: ${dailyOnline}`,
                    performedBy: interaction.member?.displayName || interaction.user.username,
                    performedById: interaction.user.id,
                    source: 'company_application'
                });

                await updatePersonnelCrmPanel();

                await logAction(
                    '🏢 Нова заявка до Hoffman LTD',
                    `👤 Кандидат: <@${interaction.user.id}>\n📝 Nick: **${nickStatic}**\n🎮 Рівень: **${gameLevel}**`,
                    HOFFMAN_RED
                );

                return await interaction.editReply({
                    content: '✅ Заявка до **Hoffman LTD** успішно подана на розгляд.'
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
    }
};
