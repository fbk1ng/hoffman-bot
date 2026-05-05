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
]
.map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
    try {
        await rest.put(
            Routes.applicationCommands(CLIENT_ID),
            { body: commands }
        );

        console.log('Команди зареєстровано.');
    } catch (error) {
        console.error(error);
    }
})();

client.once('ready', () => {
    console.log(`Бот запущений: ${client.user.tag}`);
});

client.on('interactionCreate', async interaction => {

    if (interaction.isChatInputCommand()) {

        const modal = new ModalBuilder()
            .setCustomId(interaction.commandName)
            .setTitle(
                interaction.commandName === 'total_plus'
                    ? 'Поповнення сейфу'
                    : 'Зняття коштів'
            );

        const nickInput = new TextInputBuilder()
            .setCustomId('nick')
            .setLabel('Нік')
            .setStyle(TextInputStyle.Short);

        const amountInput = new TextInputBuilder()
            .setCustomId('amount')
            .setLabel('Сума')
            .setStyle(TextInputStyle.Short);

        const noteInput = new TextInputBuilder()
            .setCustomId('note')
            .setLabel('Примітка')
            .setStyle(TextInputStyle.Paragraph);

        modal.addComponents(
            new ActionRowBuilder().addComponents(nickInput),
            new ActionRowBuilder().addComponents(amountInput),
            new ActionRowBuilder().addComponents(noteInput)
        );

        await interaction.showModal(modal);
    }

    if (interaction.type === InteractionType.ModalSubmit) {

        const nick = interaction.fields.getTextInputValue('nick');
        const amount = parseInt(
            interaction.fields.getTextInputValue('amount')
        );
        const note = interaction.fields.getTextInputValue('note');

        const isPlus = interaction.customId === 'total_plus';

        if (isPlus) {
            safeBalance += amount;
        } else {
            safeBalance -= amount;
        }

        const embed = new EmbedBuilder()
            .setColor(isPlus ? 0x00ff00 : 0xff0000)
            .setTitle(
                isPlus
                    ? 'Поповнення сейфу 📈'
                    : 'Зняття коштів 📉'
            )
            .setDescription(
                `1. **Нік:** ${nick}\n\n` +
                `2. **Сума:** $${amount.toLocaleString()}\n\n` +
                `3. **Примітка:** ${note}\n\n` +
                `💰 **Баланс сейфу:** $${safeBalance.toLocaleString()}\n\n` +
                `👤 Дію виконав: ${interaction.user.username}`
            );

        await interaction.reply({
            embeds: [embed]
        });
    }
});

client.login(TOKEN);
