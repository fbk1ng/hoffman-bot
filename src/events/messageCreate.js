module.exports = function registerEvent(ctx) {
    with (ctx) {
client.on('messageCreate', async message => {
    try {
        if (message.author.bot || message.guild) return;

        const pending = pendingDailyTaskUploads.get(message.author.id);
        if (!pending) return;

        if (pending.expiresAt <= Date.now()) {
            pendingDailyTaskUploads.delete(message.author.id);
            await message.reply('⌛ Час очікування скріншота минув. Натисни кнопку здачі завдання ще раз.').catch(() => null);
            return;
        }

        if (message.channelId !== pending.dmChannelId) return;

        const attachment = message.attachments.find(file =>
            file.contentType?.startsWith('image/') || /\.(png|jpe?g|webp|gif)$/i.test(file.name || '')
        );

        if (!attachment) {
            await message.reply('📎 Надішли саме зображення або скріншот файлом.').catch(() => null);
            return;
        }

        const existing = await dailyTaskSubmissions.findOne({
            date: pending.date,
            userId: message.author.id,
            difficulty: pending.difficulty,
            status: { $in: ['pending', 'approved'] }
        });

        if (existing) {
            pendingDailyTaskUploads.delete(message.author.id);
            await message.reply('⏳ Це завдання вже подано або зараховано.').catch(() => null);
            return;
        }

        const guild = await client.guilds.fetch(GUILD_ID).catch(() => null);
        const member = guild ? await guild.members.fetch(message.author.id).catch(() => null) : null;

        await createDailyTaskReviewSubmission({
            userId: message.author.id,
            userName: member?.displayName || message.author.username,
            difficulty: pending.difficulty,
            task: pending.task,
            date: pending.date,
            proof: 'Скріншот надіслано боту в особистих повідомленнях',
            comment: pending.comment,
            imageUrl: attachment.url
        });

        pendingDailyTaskUploads.delete(message.author.id);

        await message.reply(
            '✅ **Скріншот отримано.**\n\n' +
            '⏳ Завдання передано керівництву на перевірку. Результат також надійде сюди в особисті повідомлення.'
        ).catch(() => null);
    } catch (error) {
        console.error('Daily task DM attachment error:', error);
        await message.reply('❌ Не вдалося обробити скріншот. Спробуй повторно здати завдання.').catch(() => null);
    }
});
    }
};