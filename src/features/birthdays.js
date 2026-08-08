module.exports = function registerModule(ctx) {
    with (ctx) {
function normalizeBirthday(value) {
    const cleaned = value.trim().replace(/\s/g, '');
    const match = cleaned.match(/^(\d{1,2})[./-](\d{1,2})$/);

    if (!match) return null;

    const day = Number(match[1]);
    const month = Number(match[2]);

    if (month < 1 || month > 12) return null;

    const daysInMonth = {
        1: 31,
        2: 29,
        3: 31,
        4: 30,
        5: 31,
        6: 30,
        7: 31,
        8: 31,
        9: 30,
        10: 31,
        11: 30,
        12: 31
    };

    if (day < 1 || day > daysInMonth[month]) return null;

    return `${String(day).padStart(2, '0')}.${String(month).padStart(2, '0')}`;
}

function getKyivDayMonthYear() {
    const parts = new Intl.DateTimeFormat('uk-UA', {
        timeZone: 'Europe/Kyiv',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    }).formatToParts(new Date());

    return {
        day: parts.find(p => p.type === 'day').value,
        month: parts.find(p => p.type === 'month').value,
        year: parts.find(p => p.type === 'year').value
    };
}

async function createBirthdayPanelEmbed() {
    const list = await birthdays.find({}).sort({ birthdaySort: 1, name: 1 }).toArray();

    let text = '';

    if (!list.length) {
        text = 'Поки що список днів народження порожній.';
    } else {
        text = list
            .map(item => `🎂 **${item.birthday}** — ${item.name}`)
            .join('\n');
    }

    return new EmbedBuilder()
        .setColor(HOFFMAN_RED)
        .setTitle('HOFFMAN BIRTHDAY CENTER')
        .setDescription(
            `**Памʼятаємо важливі дати кожного учасника сімʼї.**\n\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `⚪ **КАЛЕНДАР ДНІВ НАРОДЖЕННЯ**\n\n` +
            `${text}\n\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `🔴 Всього записів: **${list.length}**\n\n` +
            `➕ **Додати** — внести день народження\n` +
            `➖ **Видалити** — прибрати запис`
        )
        .setImage('https://cdn.discordapp.com/attachments/1510979053090242711/1517095364862414930/ChatGPT_Image_18_._2026_._12_14_48.png')
        .setFooter({ text: 'Hoffman Family • Birthday Center' })
        .setTimestamp();
}

function createBirthdayButtons() {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('birthday_add')
            .setLabel('Додати')
            .setStyle(ButtonStyle.Success)
            .setEmoji('➕'),

        new ButtonBuilder()
            .setCustomId('birthday_remove')
            .setLabel('Видалити')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('➖')
    );
}

async function ensureBirthdayPanel() {
    const channel = await client.channels.fetch(BIRTHDAY_CHANNEL_ID).catch(() => null);

    if (!channel) {
        console.log('Канал днів народження не знайдено.');
        return;
    }

    const settings = await botSettings.findOne({ name: 'birthday_panel' });
    const embed = await createBirthdayPanelEmbed();
    const buttons = createBirthdayButtons();

    if (settings?.messageId) {
        const oldMessage = await channel.messages.fetch(settings.messageId).catch(() => null);

        if (oldMessage) {
            await oldMessage.edit({
                embeds: [embed],
                components: [buttons]
            });

            console.log('Панель днів народження оновлено.');
            return;
        }
    }

    const message = await channel.send({
        embeds: [embed],
        components: [buttons]
    });

    await botSettings.updateOne(
        { name: 'birthday_panel' },
        { $set: { name: 'birthday_panel', messageId: message.id } },
        { upsert: true }
    );

    console.log('Панель днів народження створено.');
}

async function updateBirthdayPanel() {
    await ensureBirthdayPanel();
}

async function openBirthdayAddModal(interaction) {
    if (!hasReviewAccess(interaction.member)) {
        return await interaction.reply({
            content: '❌ Додавати дні народження можуть тільки 9/10 ранг.',
            flags: MessageFlags.Ephemeral
        });
    }

    const modal = new ModalBuilder()
        .setCustomId('birthday_add_modal')
        .setTitle('Додати день народження');

    const nameInput = new TextInputBuilder()
        .setCustomId('birthday_name')
        .setLabel('Імʼя / Nick')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Наприклад: Hans Hoffman')
        .setRequired(true);

    const dateInput = new TextInputBuilder()
        .setCustomId('birthday_date')
        .setLabel('Дата народження')
        .setPlaceholder('Наприклад: 02.05')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    modal.addComponents(
        new ActionRowBuilder().addComponents(nameInput),
        new ActionRowBuilder().addComponents(dateInput)
    );

    return await interaction.showModal(modal);
}

async function openBirthdayRemoveModal(interaction) {
    if (!hasReviewAccess(interaction.member)) {
        return await interaction.reply({
            content: '❌ Видаляти дні народження можуть тільки 9/10 ранг.',
            flags: MessageFlags.Ephemeral
        });
    }

    const modal = new ModalBuilder()
        .setCustomId('birthday_remove_modal')
        .setTitle('Видалити день народження');

    const nameInput = new TextInputBuilder()
        .setCustomId('birthday_remove_name')
        .setLabel('Імʼя / Nick для видалення')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Наприклад: Hans Hoffman')
        .setRequired(true);

    modal.addComponents(
        new ActionRowBuilder().addComponents(nameInput)
    );

    return await interaction.showModal(modal);
}

async function checkBirthdays() {
    if (!birthdays) return;

    const { day, month, year } = getKyivDayMonthYear();
    const { hour, minute } = getKyivTime();

    if (hour !== 9 || minute > 10) return;

    const today = `${day}.${month}`;
    const list = await birthdays.find({ birthday: today }).toArray();

    if (!list.length) return;

    const newsChannel = await client.channels.fetch(BIRTHDAY_NEWS_CHANNEL_ID).catch(() => null);
    if (!newsChannel) return;

    for (const person of list) {
        if (person.lastCongratulatedYear === year) continue;

        const embed = new EmbedBuilder()
            .setColor(0xd4af37)
            .setTitle('🎉 Hoffman Family вітає з днем народження!')
            .setDescription(
                `Сьогодні день народження у **${person.name}**! 🎂\n\n` +
                `Бажаємо міцного здоровʼя, гарного настрою, успіхів, великих перемог та тільки приємних моментів у грі й житті.\n\n` +
                `🏛 **Hoffman Family**\n` +
                `Luxury • Loyalty • Respect`
            )
            .setFooter({ text: 'Hoffman Family • Birthday Notification' })
            .setTimestamp();

        await newsChannel.send({ embeds: [embed] });

        await birthdays.updateOne(
            { _id: person._id },
            { $set: { lastCongratulatedYear: year } }
        );

        await logAction(
            '🎂 Автопривітання',
            `Бот привітав **${person.name}** з днем народження.`,
            0xd4af37
        );
    }
}

        Object.assign(ctx, {
            normalizeBirthday,
            getKyivDayMonthYear,
            createBirthdayPanelEmbed,
            createBirthdayButtons,
            ensureBirthdayPanel,
            updateBirthdayPanel,
            openBirthdayAddModal,
            openBirthdayRemoveModal,
            checkBirthdays
        });
    }
};