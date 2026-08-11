module.exports = function registerModule(ctx) {
    with (ctx) {
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
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const questKey = interaction.options.getString('quest');
    const note = interaction.options.getString('note') || '—';

    const quest = await questDefinitions.findOne({ key: questKey });

    if (!quest) {
        return await interaction.editReply({
            content: '❌ Такий квест не знайдено.'
        });
    }

    const state = await questStates.findOne({ key: quest.key });
    const now = Date.now();

    if (state?.status === 'running') {
        return await interaction.editReply({
            content: `❌ Квест **${quest.name}** вже виконує <@${state.activeUserId}>.`
        });
    }

    if (state?.status === 'cooldown' && state.cooldownUntil > now) {
        return await interaction.editReply({
            content:
                `🔒 Квест **${quest.name}** зараз на відкаті.\n` +
                `⏳ Залишилось: **${formatDuration(state.cooldownUntil - now)}**\n` +
                `✅ Доступний: **${getKyivDateTime(state.cooldownUntil)}**`
        });
    }

    const channel = await getQuestChannel();

    if (!channel) {
        return await interaction.editReply({
            content: '❌ Канал квестів не знайдено. Перевір QUEST_CHANNEL_ID.'
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

    return await interaction.editReply({
        content: `✅ Квест **${quest.name}** запущено.`
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
        // Одразу підтверджуємо interaction, щоб Discord не вважав кнопку завислою.
        await interaction.deferUpdate();

        const quest = await questDefinitions.findOne({ key });

        if (!quest) {
            return await interaction.followUp({
                content: '❌ Цей квест не знайдено в базі.',
                flags: MessageFlags.Ephemeral
            });
        }

        // Головний захист від задвоєння:
        // лише ПЕРШИЙ запит атомарно переводить running -> processing.
        // Усі повторні кліки отримають null і не дійдуть до нарахування.
        const state = await questStates.findOneAndUpdate(
            {
                key,
                status: 'running',
                messageId: interaction.message.id
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
            if (latestState?.status === 'running' && latestState.messageId === interaction.message.id) {
                await interaction.message.edit({
                    components: [createQuestButtons(key, latestState.activeUserId || starterId), createQuestAdminButtons(key, latestState.activeUserId || starterId)]
                }).catch(() => null);
            }

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

        let awardedLotteryTickets = 0;

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

            const lotteryAward = await addLotteryTicketsForQuest(participants, quest.name);
            awardedLotteryTickets = lotteryAward?.totalTickets || participants.length;
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
            `📌 Квест: **${quest.name}**\n👤 Учасник: <@${state.activeUserId || interaction.user.id}>\n💰 Нараховано: **${completed ? formatMoney(quest.reward) : '$0'}**\n🎟 Квитки: **${completed ? awardedLotteryTickets : 0}**\n🔒 Наступна доступність: **${getKyivDateTime(cooldownUntil)}**`,
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

        const errorReply = {
            content: '⚠️ Під час обробки сталася помилка. Повторне натискання заблоковано, щоб не задвоїти нагороду.',
            flags: MessageFlags.Ephemeral
        };

        if (!interaction.deferred && !interaction.replied) {
            await interaction.reply(errorReply).catch(() => null);
        } else {
            await interaction.followUp(errorReply).catch(() => null);
        }
    } finally {
        questProcessingLocks.delete(localLockKey);
    }
}

async function refreshQuestRunningMessage(quest, state) {
    const channel = await getQuestChannel();
    if (!channel) return { ok: false, message: 'Канал квестів не знайдено.' };

    const activeUserId = state.activeUserId;
    if (!activeUserId) return { ok: false, message: 'У стані квесту немає виконавця.' };

    const activeUserName = state.activeUserName || `User ${activeUserId}`;
    const participants = state.participants?.length
        ? state.participants
        : [{ id: activeUserId, mention: `<@${activeUserId}>`, name: activeUserName }];

    const payload = {
        embeds: [createQuestRunningEmbed(quest, activeUserId, activeUserName, state.note || '—', participants)],
        components: [createQuestButtons(quest.key, activeUserId), createQuestAdminButtons(quest.key, activeUserId)]
    };

    const message = state.messageId
        ? await channel.messages.fetch(state.messageId).catch(() => null)
        : null;

    if (message) {
        await message.edit(payload);
        return { ok: true, action: 'edited' };
    }

    const sent = await channel.send(payload);

    await questStates.updateOne(
        { key: quest.key, status: 'running' },
        { $set: { messageId: sent.id } }
    );

    return { ok: true, action: 'sent' };
}

async function repairQuest(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    if (!hasReviewAccess(interaction.member)) {
        return await interaction.editReply({
            content: '❌ Відновлювати завислі квести можуть тільки 9/10 ранг.'
        });
    }

    const questKey = interaction.options.getString('quest');
    const action = interaction.options.getString('action');

    const quest = await questDefinitions.findOne({ key: questKey });
    if (!quest) {
        return await interaction.editReply({
            content: '❌ Цей квест не знайдено в базі.'
        });
    }

    let state = await questStates.findOne({ key: quest.key });
    if (!state) {
        return await interaction.editReply({
            content: `❌ Стан квесту **${quest.name}** не знайдено.`
        });
    }

    if (action === 'reopen') {
        if (!['processing', 'processing_error'].includes(state.status)) {
            return await interaction.editReply({
                content: `ℹ️ Квест **${quest.name}** зараз має статус **${state.status || 'невідомо'}**. Повернення у виконання потрібне тільки для processing / processing_error.`
            });
        }

        state = await questStates.findOneAndUpdate(
            {
                key: quest.key,
                status: { $in: ['processing', 'processing_error'] }
            },
            {
                $set: {
                    status: 'running',
                    repairedAt: Date.now(),
                    repairedBy: interaction.user.id
                },
                $unset: {
                    processingInteractionId: '',
                    processingUserId: '',
                    processingStartedAt: '',
                    processingAction: '',
                    processingErrorAt: '',
                    processingError: ''
                }
            },
            {
                returnDocument: 'after'
            }
        );

        if (!state) {
            return await interaction.editReply({
                content: '⚠️ Квест уже змінив стан. Перевірте `/quest_status`.'
            });
        }
    } else if (action !== 'refresh') {
        return await interaction.editReply({
            content: '❌ Невідома дія відновлення.'
        });
    }

    if (state.status !== 'running') {
        return await interaction.editReply({
            content: `ℹ️ Квест **${quest.name}** зараз має статус **${state.status || 'невідомо'}**, тому кнопки не оновлювались.`
        });
    }

    const result = await refreshQuestRunningMessage(quest, state);
    if (!result.ok) {
        return await interaction.editReply({
            content: `⚠️ Не вдалося відновити квест **${quest.name}**: ${result.message}`
        });
    }

    await logAction(
        '🛠️ Квест відновлено',
        `📌 Квест: **${quest.name}**\n👤 Відновив: **${interaction.member?.displayName || interaction.user.username}**\n🔧 Дія: **${action}**`,
        0xffcc00
    );

    return await interaction.editReply({
        content: result.action === 'edited'
            ? `✅ Кнопки квесту **${quest.name}** оживлено.`
            : `✅ Старе повідомлення не знайдено, тому створено нове для квесту **${quest.name}**.`
    });
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

        if (state.status === 'processing' || state.status === 'processing_error') {
            text += `⚠️ **${quest.name}** — завис у **${state.status}**, використайте **/quest_repair**\n`;
            continue;
        }

        if (state.status === 'cooldown') {
            if (state.cooldownUntil <= now) {
                text += `✅ **${quest.name}** — доступний\n`;
            } else {
                text += `🔒 **${quest.name}** — доступний через **${formatDuration(state.cooldownUntil - now)}**\n`;
            }

            continue;
        }

        text += `⚠️ **${quest.name}** — невідомий статус **${state.status || '—'}**, використайте **/quest_repair** або перевірте базу\n`;
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

async function deleteQuest(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const questKey = interaction.options.getString('quest');
    const quest = await questDefinitions.findOne({ key: questKey });

    if (!quest) {
        return await interaction.editReply({
            content: '❌ Цей квест не знайдено в базі.'
        });
    }

    const state = await questStates.findOne({ key: quest.key });

    if (['running', 'processing', 'processing_error'].includes(state?.status)) {
        return await interaction.editReply({
            content: `⚠️ Квест **${quest.name}** зараз має статус **${state.status}**. Спочатку завершіть, скасуйте або відновіть його через **/quest_repair**, а потім видаліть.`
        });
    }

    await questDefinitions.deleteOne({ key: quest.key });
    await questStates.deleteOne({ key: quest.key });

    await logAction(
        '🗑️ Квест видалено',
        `📌 Квест: **${quest.name}**\n💰 Нагорода: **${formatMoney(quest.reward)}**\n🔒 КД: **${quest.cooldownHours} год.**\n👤 Видалив: **${interaction.member?.displayName || interaction.user.username}**`,
        0xff3333
    );

    return await interaction.editReply({
        content: `✅ Квест **${quest.name}** видалено.`
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

        Object.assign(ctx, {
            getQuestChannel,
            createQuestRunningEmbed,
            createQuestButtons,
            createQuestAdminButtons,
            createDisabledQuestButtons,
            startQuest,
            completeOrCancelQuest,
            openQuestTransferModal,
            handleQuestTransferModal,
            repairQuest,
            sendQuestStatus,
            addQuest,
            deleteQuest,
            checkQuestCooldowns,
            sendQuestAutocomplete
        });
    }
};
