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

const { MongoClient } = require('mongodb');
const http = require('http');

const TOKEN = process.env.TOKEN;
const MONGODB_URI = process.env.MONGODB_URI;
const CLIENT_ID = '1501160094006771812';

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

let mongoClient;
let balances;

async function connectDB() {
    if (!MONGODB_URI) {
        throw new Error('MONGODB_URI не доданий у Render Environment');
    }

    mongoClient = new MongoClient(MONGODB_URI);
    await mongoClient.connect();

    const db = mongoClient.db('hoffman_bot');
    balances = db.collection('balances');

    await balances.updateOne(
        { name: 'safe' },
        { $setOnInsert: { name: 'safe', balance: 0 } },
        { upsert: true }
    );

    console.log('MongoDB підключено.');
}

async function getBalance() {
    const data = await balances.findOne({ name: 'safe' });
    return data?.balance || 0;
}

async function changeBalance(amount) {
    const result = await balances.findOneAndUpdate(
        { name: 'safe' },
        { $inc: { balance: amount } },
        {
            upsert: true,
            returnDocument: 'after'
        }
    );

    return result.balance;
}

const commands = [
    new SlashCommandBuilder()
        .setName('total_plus')
        .setDescription('Поповнення сейфу'),

    new SlashCommandBuilder()
        .setName('total_minus')
        .setDescription('Зняття коштів'),

    new SlashCommandBuilder()
        .setName('balance')
        .setDescription('Показати баланс сейфу')
].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);

client.once('ready', async () => {
    console.log(`Бот запущений: ${client.user.tag}`);

    try {
        await connectDB();

        await rest.put(
            Routes.applicationCommands(CLIENT_ID),
            { body: commands }
        );

        console.log('Команди зареєстровано.');
    } catch (error) {
        console.error('Помилка запуску:', error);
    }
});

client.on('interactionCreate', async interaction => {
    try {
        if (interaction.isChatInputCommand()) {
            if (interaction.commandName === 'balance') {
                const balance = await getBalance();

                const embed = new EmbedBuilder()
                    .setColor(0xffcc00)
                    .setTitle('💰 Баланс сейфу')
                    .setDescription(`**Поточний баланс:** $${balance.toLocaleString('en-US')}`)
                    .setTimestamp();

                return await interaction.reply({
                    embeds: [embed],
                    ephemeral: true
                });
            }

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
            const changeAmount = isPlus ? amount : -amount;
            const newBalance = await changeBalance(changeAmount);

            const member = interaction.member;
            const displayName = member?.displayName || interaction.user.username;

            const role = member.roles.cache
                .filter(r => r.name !== '@everyone')
                .sort((a, b) => b.position - a.position)
                .first()?.name || 'Без ролі';

            const embed = new EmbedBuilder()
                .setColor(isPlus ? 0x00ff00 : 0xff0000)
                .setTitle(isPlus ? 'Поповнення сейфу 📈' : 'Зняття коштів 📉')
                .setDescription(
                    `1. **Нік:** ${nick}\n\n` +
                    `2. **Сума:** $${amount.toLocaleString('en-US')}\n\n` +
                    `3. **Примітка:** ${note}\n\n` +
                    `💰 **Баланс сейфу:** $${newBalance.toLocaleString('en-US')}\n\n` +
                    `👤 **Дію виконав:** ${displayName}\n` +
                    `🎭 **Роль:** ${role}`
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
