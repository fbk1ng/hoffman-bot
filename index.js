const {
    Client,
    GatewayIntentBits,
    SlashCommandBuilder,
    Routes,
    REST,
    EmbedBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
    InteractionType
} = require('discord.js');

const http = require('http');

const TOKEN = process.env.TOKEN;
const CLIENT_ID = '1501160094006771812';

let safeBalance = 0;

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

const commands = [
    new SlashCommandBuilder()
        .setName('total_plus')
        .setDescription('Поповнення сейфу'),

    new SlashCommandBuilder()
        .setName('total_minus')
        .setDescription('Зняття коштів')
].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);

client.once('ready', async () => {
    console.log(`Бот запущений: ${client.user.tag}`);

    try {
        await rest.put(
            Routes.applicationCommands(CLIENT_ID),
            { body: commands }
        );

        console.log('Команди зареєстровано.');
    } catch (error) {
        console.error('Помилка реєстрації команд:', error);
    }
});

client.on('interactionCreate', async interaction => {
    try {
        if (interaction.isChatInputCommand()) {
            const isPlus = interaction.commandName === 'total_plus';

            const modal = new ModalBuilder()
                .setCustomId(isPlus ? 'modal_plus' : 'modal_minus')
                .setTitle(isPlus ? 'Поповнення сейфу' : 'Зняття коштів');

            const nickInput = new TextInputBuilder()
                .setCustomId('nick')
                .setLabel('Нік')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            const amountInput = new TextInputBuilder()
                .setCustomId('amount')
                .setLabel('Сума')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('Наприклад: 2000000')
                .setRequired(true);

            const noteInput = new TextInputBuilder()
                .setCustomId('note')
                .setLabel('Примітка')
                .setStyle(TextInputStyle.Paragraph)
                .setPlaceholder('Наприклад: На розкрутку')
                .setRequired(false);

            modal.addComponents(
                new ActionRowBuilder().addComponents(nickInput),
                new ActionRowBuilder().addComponents(amountInput),
                new ActionRowBuilder().addComponents(noteInput)
            );

            return await interaction.showModal(modal);
        }

        if (interaction.type === InteractionType.ModalSubmit) {
            const nick = interaction.fields.getTextInputValue('nick');
            const amountText = interaction.fields.getTextInputValue('amount');
            const note = interaction.fields.getTextInputValue('note') || '—';

            const amount = parseInt(amountText.replace(/\D/g, ''));

            if (!amount || isNaN(amount)) {
                return await interaction.reply({
                    content: '❌ Сума має бути числом!',
                    ephemeral: true
                });
            }

            const isPlus = interaction.customId === 'modal_plus';

            if (isPlus) {
                safeBalance += amount;
            } else {
                safeBalance -= amount;
            }

            const embed = new EmbedBuilder()
                .setColor(isPlus ? 0x00ff00 : 0xff0000)
                .setTitle(isPlus ? 'Поповнення сейфу 📈' : 'Зняття коштів 📉')
                .setDescription(
                    `1. **Нік:** ${nick}\n\n` +
                    `2. **Сума:** $${amount.toLocaleString('en-US')}\n\n` +
                    `3. **Примітка:** ${note}\n\n` +
                    `💰 **Баланс сейфу:** $${safeBalance.toLocaleString('en-US')}\n\n` +
                    `👤 **Дію виконав:** ${interaction.member?.displayName || interaction.user.username}`
                )
                .setTimestamp();

            return await interaction.reply({
                embeds: [embed]
            });
        }
    } catch (error) {
        console.error('Помилка interactionCreate:', error);

        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content: '❌ Сталась помилка при виконанні команди.',
                ephemeral: true
            });
        }
    }
});

client.login(TOKEN);

http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Bot is running');
}).listen(process.env.PORT || 3000, () => {
    console.log('Web server запущений для Render');
});
