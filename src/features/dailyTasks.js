module.exports = function registerModule(ctx) {
    with (ctx) {
function getDifficultyLabel(difficulty) {
    if (difficulty === 'easy') return '🟢 Легке';
    if (difficulty === 'medium') return '🟡 Середнє';
    if (difficulty === 'hard') return '🔴 Складне';
    return difficulty;
}

function getDifficultyReward(difficulty) {
    if (difficulty === 'easy') return 1;
    if (difficulty === 'medium') return 2;
    if (difficulty === 'hard') return 3;
    return 1;
}

function getDailyTaskButtonId(difficulty) {
    return `daily_task_submit:${difficulty}`;
}

async function pickRandomDailyTask(difficulty) {
    const tasks = await dailyTasksPool.find({ difficulty, enabled: true }).toArray();

    if (!tasks.length) {
        return {
            key: `fallback_${difficulty}`,
            difficulty,
            rewardTickets: getDifficultyReward(difficulty),
            text: 'Завдання не знайдено. Додайте завдання у пул.'
        };
    }

    return tasks[Math.floor(Math.random() * tasks.length)];
}

async function getOrCreateDailySettings(forceNew = false) {
    const today = getKyivDate();
    let settings = await dailyTaskSettings.findOne({ name: 'daily_tasks' });

    if (!settings || forceNew || settings.currentDate !== today || !settings.activeTasks) {
        const easy = await pickRandomDailyTask('easy');
        const medium = await pickRandomDailyTask('medium');
        const hard = await pickRandomDailyTask('hard');

        const activeTasks = {
            easy: {
                key: easy.key,
                text: easy.text,
                difficulty: 'easy',
                rewardTickets: easy.rewardTickets || 1
            },
            medium: {
                key: medium.key,
                text: medium.text,
                difficulty: 'medium',
                rewardTickets: medium.rewardTickets || 2
            },
            hard: {
                key: hard.key,
                text: hard.text,
                difficulty: 'hard',
                rewardTickets: hard.rewardTickets || 3
            }
        };

        await dailyTaskSettings.updateOne(
            { name: 'daily_tasks' },
            {
                $set: {
                    name: 'daily_tasks',
                    currentDate: today,
                    activeTasks,
                    updatedAt: Date.now()
                },
                $setOnInsert: {
                    panelMessageId: null
                }
            },
            { upsert: true }
        );

        settings = await dailyTaskSettings.findOne({ name: 'daily_tasks' });
    }

    return settings;
}

async function getDailyTaskStats(date = getKyivDate()) {
    const approved = await dailyTaskSubmissions.find({ date, status: 'approved' }).toArray();
    const pending = await dailyTaskSubmissions.find({ date, status: 'pending' }).toArray();

    const approvedByDifficulty = {
        easy: approved.filter(item => item.difficulty === 'easy').length,
        medium: approved.filter(item => item.difficulty === 'medium').length,
        hard: approved.filter(item => item.difficulty === 'hard').length
    };

    return {
        approved,
        pending,
        approvedByDifficulty,
        approvedTotal: approved.length,
        pendingTotal: pending.length
    };
}

async function createDailyTasksPanelEmbed() {
    const settings = await getOrCreateDailySettings();
    const stats = await getDailyTaskStats(settings.currentDate);
    const tasks = settings.activeTasks;

    return new EmbedBuilder()
        .setColor(HOFFMAN_RED)
        .setTitle('HOFFMAN DAILY TASKS')
        .setDescription(
            `**Три завдання щодня — обирай своє та заробляй квитки.**\n` +
            `Після виконання натисни кнопку потрібного рівня. Доказ надсилається боту в особисті повідомлення.\n\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `**ЛЕГКЕ • +${tasks.easy.rewardTickets} КВИТОК**\n` +
            `${tasks.easy.text}\n` +
            `Схвалено сьогодні: **${stats.approvedByDifficulty.easy}**\n\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `**СЕРЕДНЄ • +${tasks.medium.rewardTickets} КВИТКИ**\n` +
            `${tasks.medium.text}\n` +
            `Схвалено сьогодні: **${stats.approvedByDifficulty.medium}**\n\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `**СКЛАДНЕ • +${tasks.hard.rewardTickets} КВИТКИ**\n` +
            `${tasks.hard.text}\n` +
            `Схвалено сьогодні: **${stats.approvedByDifficulty.hard}**\n\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `📅 Дата: **${settings.currentDate}**\n` +
            `⏳ На перевірці: **${stats.pendingTotal}**`
        )
        .setImage('https://cdn.discordapp.com/attachments/1510979053090242711/1517095366124900422/ChatGPT_Image_18_._2026_._11_57_33.png')
        .setFooter({ text: 'Hoffman Family • Daily Tasks' })
        .setTimestamp();
}

function createDailyTasksPanelButtons() {
    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(getDailyTaskButtonId('easy'))
            .setLabel('Виконати легке')
            .setStyle(ButtonStyle.Success)
            .setEmoji('🟢'),

        new ButtonBuilder()
            .setCustomId(getDailyTaskButtonId('medium'))
            .setLabel('Виконати середнє')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('🟡'),

        new ButtonBuilder()
            .setCustomId(getDailyTaskButtonId('hard'))
            .setLabel('Виконати складне')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('🔴')
    );

    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('daily_task_my_progress')
            .setLabel('Мої завдання')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('📊'),

        new ButtonBuilder()
            .setCustomId('daily_task_refresh')
            .setLabel('Оновити')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('🔁')
    );

    return [row1, row2];
}

async function ensureDailyTasksPanel(forceNewTasks = false) {
    const channel = await client.channels.fetch(DAILY_TASKS_CHANNEL_ID).catch(() => null);
    if (!channel) {
        console.log('Канал щоденних завдань не знайдено.');
        return;
    }

    const settings = await getOrCreateDailySettings(forceNewTasks);
    const embed = await createDailyTasksPanelEmbed();
    const buttons = createDailyTasksPanelButtons();

    if (settings?.panelMessageId) {
        const oldMessage = await channel.messages.fetch(settings.panelMessageId).catch(() => null);

        if (oldMessage) {
            await oldMessage.edit({
                embeds: [embed],
                components: buttons
            });

            console.log('Панель щоденних завдань оновлено.');
            return;
        }
    }

    const message = await channel.send({
        embeds: [embed],
        components: buttons
    });

    await dailyTaskSettings.updateOne(
        { name: 'daily_tasks' },
        { $set: { panelMessageId: message.id } },
        { upsert: true }
    );

    console.log('Панель щоденних завдань створено.');
}

async function updateDailyTasksPanel() {
    await ensureDailyTasksPanel(false);
}

async function checkDailyTasksRefresh() {
    if (!dailyTaskSettings) return;

    const { hour } = getKyivTime();
    const today = getKyivDate();
    const settings = await dailyTaskSettings.findOne({ name: 'daily_tasks' });

    if (!settings || settings.currentDate !== today) {
        if (hour >= 9) {
            await ensureDailyTasksPanel(true);
        }
    }
}

async function openDailyTaskSubmitModal(interaction, difficulty) {
    if (!hasFamilyAccess(interaction.member)) {
        return await interaction.reply({
            content: '❌ Щоденні завдання доступні тільки учасникам Hoffman Family.',
            flags: MessageFlags.Ephemeral
        });
    }

    const settings = await getOrCreateDailySettings();
    const task = settings.activeTasks?.[difficulty];

    if (!task) {
        return await interaction.reply({
            content: '❌ Завдання цього рівня зараз не знайдено.',
            flags: MessageFlags.Ephemeral
        });
    }

    const existing = await dailyTaskSubmissions.findOne({
        date: settings.currentDate,
        userId: interaction.user.id,
        difficulty,
        status: { $in: ['pending', 'approved'] }
    });

    if (existing?.status === 'approved') {
        return await interaction.reply({
            content: '✅ Це завдання за сьогодні вже зараховано.',
            flags: MessageFlags.Ephemeral
        });
    }

    if (existing?.status === 'pending') {
        return await interaction.reply({
            content: '⏳ Це завдання вже на перевірці. Дочекайтесь рішення керівництва.',
            flags: MessageFlags.Ephemeral
        });
    }

    const modal = new ModalBuilder()
        .setCustomId(`daily_task_submit_modal:${difficulty}`)
        .setTitle(`${getDifficultyLabel(difficulty)} завдання`);

    const proofInput = new TextInputBuilder()
        .setCustomId('daily_task_proof')
        .setLabel('Доказ текстом або посиланням')
        .setPlaceholder('Залиш порожнім, щоб бот запросив скріншот у особистих повідомленнях')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(false);

    const commentInput = new TextInputBuilder()
        .setCustomId('daily_task_comment')
        .setLabel('Коментар')
        .setPlaceholder('Коротко опиши, що саме зробив')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(false);

    modal.addComponents(
        new ActionRowBuilder().addComponents(proofInput),
        new ActionRowBuilder().addComponents(commentInput)
    );

    return await interaction.showModal(modal);
}


async function createDailyTaskReviewSubmission({ userId, userName, difficulty, task, date, proof, comment, imageUrl = null }) {
    const submission = {
        date,
        userId,
        userName,
        difficulty,
        taskKey: task.key,
        taskText: task.text,
        rewardTickets: task.rewardTickets,
        proof: proof || '—',
        comment: comment || '—',
        imageUrl,
        status: 'pending',
        createdAt: Date.now()
    };

    const insertResult = await dailyTaskSubmissions.insertOne(submission);
    const submissionId = insertResult.insertedId.toString();

    const reviewChannel = await client.channels.fetch(DAILY_TASKS_REVIEW_CHANNEL_ID).catch(() => null);
    if (!reviewChannel) {
        throw new Error('Канал перевірки щоденних завдань не знайдено.');
    }

    const proofText = imageUrl
        ? `🖼 **Скріншот:** ${imageUrl}\n${proof && proof !== '—' ? `📎 **Текстовий доказ:**\n${proof}` : ''}`
        : `${proof || '—'}`;

    const embed = new EmbedBuilder()
        .setColor(0xffcc00)
        .setTitle('📋 Daily Task — на перевірку')
        .setDescription(
            `👤 **Учасник:** <@${userId}>\n` +
            `📅 **Дата:** ${date}\n\n` +
            `${getDifficultyLabel(difficulty)}\n` +
            `📌 **Завдання:** ${task.text}\n` +
            `🎟 **Нагорода:** +${task.rewardTickets} ticket(s)\n\n` +
            `📎 **Доказ:**\n${proofText}\n\n` +
            `📝 **Коментар:** ${comment || '—'}`
        )
        .setFooter({ text: `Submission ID: ${submissionId}` })
        .setTimestamp();

    if (imageUrl) {
        embed.setImage(imageUrl);
    }

    const buttons = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`daily_task_approve:${submissionId}`)
            .setLabel('Схвалити')
            .setStyle(ButtonStyle.Success)
            .setEmoji('✅'),

        new ButtonBuilder()
            .setCustomId(`daily_task_reject:${submissionId}`)
            .setLabel('Відхилити')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('❌')
    );

    await reviewChannel.send({
        content: `<@&${RANK_9_ROLE_ID}> <@&${RANK_10_ROLE_ID}>`,
        embeds: [embed],
        components: [buttons]
    });

    await logAction(
        '📋 Daily task подано',
        `👤 Учасник: <@${userId}>\n${getDifficultyLabel(difficulty)}\n📌 Завдання: **${task.text}**\n🎟 Нагорода: **+${task.rewardTickets}**`,
        0xffcc00
    );

    await updateDailyTasksPanel();

    return submissionId;
}

async function handleDailyTaskSubmitModal(interaction, difficulty) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    if (!hasFamilyAccess(interaction.member)) {
        return await interaction.editReply({
            content: '❌ Щоденні завдання доступні тільки учасникам Hoffman Family.'
        });
    }

    const settings = await getOrCreateDailySettings();
    const task = settings.activeTasks?.[difficulty];

    if (!task) {
        return await interaction.editReply({
            content: '❌ Завдання цього рівня зараз не знайдено.'
        });
    }

    const existing = await dailyTaskSubmissions.findOne({
        date: settings.currentDate,
        userId: interaction.user.id,
        difficulty,
        status: { $in: ['pending', 'approved'] }
    });

    if (existing?.status === 'approved') {
        return await interaction.editReply({
            content: '✅ Це завдання за сьогодні вже зараховано.'
        });
    }

    if (existing?.status === 'pending') {
        return await interaction.editReply({
            content: '⏳ Це завдання вже на перевірці.'
        });
    }

    const proof = interaction.fields.getTextInputValue('daily_task_proof')?.trim() || '';
    const comment = interaction.fields.getTextInputValue('daily_task_comment')?.trim() || '—';

    if (!proof) {
        const dmEmbed = new EmbedBuilder()
            .setColor(0xd4af37)
            .setTitle('📸 Надсилання доказу Daily Task')
            .setDescription(
                `${getDifficultyLabel(difficulty)}\n\n` +
                `📌 **Завдання:** ${task.text}\n` +
                `🎟 **Нагорода:** +${task.rewardTickets} ticket(s)\n\n` +
                `━━━━━━━━━━━━━━━━━━━━\n\n` +
                `Надішли **один скріншот у цей особистий чат** протягом 10 хвилин.\n` +
                `Після отримання бот автоматично передасть його керівництву на перевірку.`
            )
            .setFooter({ text: 'Hoffman Family • Daily Tasks' })
            .setTimestamp();

        const dmMessage = await interaction.user.send({ embeds: [dmEmbed] }).catch(() => null);

        if (!dmMessage) {
            return await interaction.editReply({
                content:
                    '❌ Не вдалося написати тобі в особисті повідомлення.\n' +
                    'Дозволь особисті повідомлення від учасників сервера та спробуй ще раз.\n\n' +
                    'Або повторно відкрий форму й встав доказ текстом чи посиланням.'
            });
        }

        pendingDailyTaskUploads.set(interaction.user.id, {
            dmChannelId: dmMessage.channelId,
            date: settings.currentDate,
            difficulty,
            task,
            comment,
            expiresAt: Date.now() + 10 * 60 * 1000
        });

        setTimeout(() => {
            const pending = pendingDailyTaskUploads.get(interaction.user.id);
            if (pending && pending.expiresAt <= Date.now()) {
                pendingDailyTaskUploads.delete(interaction.user.id);
                interaction.user.send('⌛ Час очікування скріншота минув. Для здачі завдання натисни кнопку ще раз.').catch(() => null);
            }
        }, 10 * 60 * 1000 + 1000);

        return await interaction.editReply({
            content: '✅ Я написав тобі в особисті повідомлення. Надішли скріншот боту протягом 10 хвилин.'
        });
    }

    try {
        await createDailyTaskReviewSubmission({
            userId: interaction.user.id,
            userName: interaction.member?.displayName || interaction.user.username,
            difficulty,
            task,
            date: settings.currentDate,
            proof,
            comment
        });
    } catch (error) {
        console.error('Daily task submit error:', error);
        return await interaction.editReply({
            content: '❌ Не вдалося відправити завдання на перевірку. Перевір канал перевірки.'
        });
    }

    return await interaction.editReply({
        content: '✅ Завдання відправлено на перевірку керівництву.'
    });
}

async function approveDailyTask(interaction, submissionId) {
    if (!hasReviewAccess(interaction.member)) {
        return await interaction.reply({
            content: '❌ Схвалювати daily tasks можуть тільки 9/10 ранг.',
            flags: MessageFlags.Ephemeral
        });
    }

    await interaction.deferUpdate();

    const submission = await dailyTaskSubmissions.findOne({ _id: new ObjectId(submissionId) });

    if (!submission) {
        return await interaction.followUp({
            content: '❌ Заявку на завдання не знайдено.',
            flags: MessageFlags.Ephemeral
        });
    }

    if (submission.status !== 'pending') {
        return await interaction.followUp({
            content: `ℹ️ Це завдання вже оброблено. Статус: **${submission.status}**.`,
            flags: MessageFlags.Ephemeral
        });
    }

    await dailyTaskSubmissions.updateOne(
        { _id: submission._id },
        {
            $set: {
                status: 'approved',
                reviewedBy: interaction.member.displayName,
                reviewedAt: Date.now()
            }
        }
    );

    await addLotteryTicket(
        submission.userId,
        submission.userName,
        `Daily task: ${submission.taskText}`,
        submission.rewardTickets
    );

    await updateLotteryPanels();
    await updateDailyTasksPanel();

    await logAction(
        '✅ Daily task схвалено',
        `👤 Учасник: <@${submission.userId}>\n📌 Завдання: **${submission.taskText}**\n🎟 Видано: **+${submission.rewardTickets}**\n🛡 Схвалив: **${interaction.member.displayName}**`,
        0x00ff88
    );

    const taskUser = await client.users.fetch(submission.userId).catch(() => null);
    if (taskUser) {
        const ticketData = await lotteryTickets.findOne({ userId: submission.userId });
        await taskUser.send(
            `🎉 **Завдання схвалено!**\n\n` +
            `📌 ${submission.taskText}\n` +
            `🎟 Нараховано: **+${submission.rewardTickets}**\n` +
            `🎫 Квитків цього тижня: **${ticketData?.weeklyTickets || 0}**\n\n` +
            `Перевірив: **${interaction.member.displayName}**`
        ).catch(() => null);
    }

    const oldEmbed = interaction.message.embeds[0];
    const newEmbed = EmbedBuilder.from(oldEmbed)
        .setColor(0x00ff88)
        .setTitle('✅ Daily Task — схвалено')
        .addFields({
            name: '✅ Статус',
            value: `СХВАЛЕНО\nПеревірив: ${interaction.member.displayName}\n🎟 Видано: +${submission.rewardTickets} ticket(s)`
        })
        .setFooter({ text: 'Hoffman Family • Daily Task Approved' })
        .setTimestamp();

    await interaction.message.edit({
        embeds: [newEmbed],
        components: []
    });
}

async function rejectDailyTask(interaction, submissionId) {
    if (!hasReviewAccess(interaction.member)) {
        return await interaction.reply({
            content: '❌ Відхиляти daily tasks можуть тільки 9/10 ранг.',
            flags: MessageFlags.Ephemeral
        });
    }

    await interaction.deferUpdate();

    const submission = await dailyTaskSubmissions.findOne({ _id: new ObjectId(submissionId) });

    if (!submission) {
        return await interaction.followUp({
            content: '❌ Заявку на завдання не знайдено.',
            flags: MessageFlags.Ephemeral
        });
    }

    if (submission.status !== 'pending') {
        return await interaction.followUp({
            content: `ℹ️ Це завдання вже оброблено. Статус: **${submission.status}**.`,
            flags: MessageFlags.Ephemeral
        });
    }

    await dailyTaskSubmissions.updateOne(
        { _id: submission._id },
        {
            $set: {
                status: 'rejected',
                reviewedBy: interaction.member.displayName,
                reviewedAt: Date.now()
            }
        }
    );

    await updateDailyTasksPanel();

    await logAction(
        '❌ Daily task відхилено',
        `👤 Учасник: <@${submission.userId}>\n📌 Завдання: **${submission.taskText}**\n🛡 Відхилив: **${interaction.member.displayName}**`,
        0xff3333
    );

    const taskUser = await client.users.fetch(submission.userId).catch(() => null);
    if (taskUser) {
        await taskUser.send(
            `❌ **Завдання відхилено.**\n\n` +
            `📌 ${submission.taskText}\n\n` +
            `Перевірив: **${interaction.member.displayName}**\n` +
            `Ти можеш повторно подати завдання, якщо воно ще актуальне.`
        ).catch(() => null);
    }

    const oldEmbed = interaction.message.embeds[0];
    const newEmbed = EmbedBuilder.from(oldEmbed)
        .setColor(0xff3333)
        .setTitle('❌ Daily Task — відхилено')
        .addFields({
            name: '❌ Статус',
            value: `ВІДХИЛЕНО\nПеревірив: ${interaction.member.displayName}`
        })
        .setFooter({ text: 'Hoffman Family • Daily Task Rejected' })
        .setTimestamp();

    await interaction.message.edit({
        embeds: [newEmbed],
        components: []
    });
}

async function showMyDailyTasks(interaction) {
    if (!hasFamilyAccess(interaction.member)) {
        return await interaction.reply({
            content: '❌ Щоденні завдання доступні тільки учасникам Hoffman Family.',
            flags: MessageFlags.Ephemeral
        });
    }

    const settings = await getOrCreateDailySettings();
    const submissions = await dailyTaskSubmissions.find({
        date: settings.currentDate,
        userId: interaction.user.id
    }).toArray();

    const statusByDifficulty = {
        easy: 'Не подано',
        medium: 'Не подано',
        hard: 'Не подано'
    };

    for (const item of submissions) {
        if (item.status === 'approved') statusByDifficulty[item.difficulty] = '✅ Схвалено';
        if (item.status === 'pending') statusByDifficulty[item.difficulty] = '⏳ На перевірці';
        if (item.status === 'rejected') statusByDifficulty[item.difficulty] = '❌ Відхилено';
    }

    return await interaction.reply({
        embeds: [new EmbedBuilder()
            .setColor(0xd4af37)
            .setTitle('📊 Мої Daily Tasks')
            .setDescription(
                `📅 **Дата:** ${settings.currentDate}\n\n` +
                `🟢 Легке: **${statusByDifficulty.easy}**\n` +
                `🟡 Середнє: **${statusByDifficulty.medium}**\n` +
                `🔴 Складне: **${statusByDifficulty.hard}**\n\n` +
                `Після схвалення квитки автоматично додаються до Hoffman Weekly Lottery.`
            )
            .setFooter({ text: 'Hoffman Family • Daily Tasks' })
            .setTimestamp()],
        flags: MessageFlags.Ephemeral
    });
}

        Object.assign(ctx, {
            getDifficultyLabel,
            getDifficultyReward,
            getDailyTaskButtonId,
            pickRandomDailyTask,
            getOrCreateDailySettings,
            getDailyTaskStats,
            createDailyTasksPanelEmbed,
            createDailyTasksPanelButtons,
            ensureDailyTasksPanel,
            updateDailyTasksPanel,
            checkDailyTasksRefresh,
            openDailyTaskSubmitModal,
            createDailyTaskReviewSubmission,
            handleDailyTaskSubmitModal,
            approveDailyTask,
            rejectDailyTask,
            showMyDailyTasks
        });
    }
};