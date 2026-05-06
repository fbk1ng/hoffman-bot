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
    InteractionType,
    Events
} = require('discord.js');

const { MongoClient } = require('mongodb');
const http = require('http');

const TOKEN = process.env.TOKEN;
const MONGODB_URI = process.env.MONGODB_URI;
const REPORT_CHANNEL_ID = process.env.REPORT_CHANNEL_ID;

const CLIENT_ID = '1501160094006771812';

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

let mongoClient;
let balances;
let dailyStats;

function getDate() {
    return new Date().toISOString().split('T')[0];
}

async function connectDB() {
    mongoClient = new MongoClient(MONGODB_URI);
    await mongoClient.connect();

    const db = mongoClient.db('hoffman');

    balances = db.collection('balances');
    dailyStats = db.collection('stats');

    await balances.updateOne(
        { name: 'safe' },
        { $setOnInsert: { balance: 0 } },
        { upsert: true }
    );

    console.log('MongoDB підключено.');
}

async function getBalance() {
    const data = await balances.findOne({ name: 'safe' });
    return data?.balance || 0;
}

async function changeBalance(amount) {
    const res = await balances.findOneAndUpdate(
        { name: 'safe' },
        { $inc: { balance: amount } },
        { upsert: true, returnDocument: 'after' }
    );
    return res.balance;
}

async function addStat(type, amount) {
    const date = getDate();

    await dailyStats.updateOne(
        { date },
        {
            $inc: {
                plus: type === 'plus' ? amount : 0,
                minus: type === 'minus' ? amount : 0
            },
            $setOnInsert: { reportSent: false }
        },
        { upsert: true }
    );
}

async function sendReport() {
    const date = getDate();
    const stats = await dailyStats.findOne({ date });

    const plus = stats?.plus || 0;
    const minus = stats?.minus || 0;
    const balance = await getBalance();

    const channel = await client.channels.fetch(REPORT_CHANNEL_ID).catch(() => null);
    if (!channel) return;

    const embed = new EmbedBuilder()
        .setColor('#d4af37')
        .setTitle('🏦 Hoffman Bank — Звіт')
        .setDescription(
            `📈 Поповнення: +$${plus.toLocaleString()}\n` +
            `📉 Зняття: -$${minus.toLocaleString()}\n\n` +
            `━━━━━━━━━━━━━━\n` +
            `💰 Баланс: $${balance.toLocaleString()}\n\n` +
            `📅 ${date}`
        )
        .setTimestamp();

    await channel.send({ embeds: [embed] });

    await dailyStats.updateOne(
        { date },
        { $set: { reportSent: true } }
    );
}

const commands = [
    new SlashCommandBuilder().setName('total_plus').setDescription('Поповнення'),
    new SlashCommandBuilder().setName('total_minus').setDescription('Зняття'),
    new SlashCommandBuilder().setName('balance').setDescription('Баланс'),
    new SlashCommandBuilder().setName('report').setDescription('Зробити звіт')
].map(c => c.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);

client.once(Events.ClientReady, async () => {
    console.log(`Бот: ${client.user.tag}`);

    await connectDB();

    await rest.put(
        Routes.applicationCommands(CLIENT_ID),
        { body: commands }
    );

    console.log('Команди готові');

    setInterval(async () => {
        const now = new Date();
        if (now.getHours() === 23 && now.getMinutes() === 59) {
            await sendReport();
        }
    }, 60000);
});

client.on('interactionCreate', async interaction => {

    if (interaction.isChatInputCommand()) {

        if (interaction.commandName === 'balance') {
            const balance = await getBalance();

            const embed = new EmbedBuilder()
                .setColor('#d4af37')
                .setTitle('💰 Баланс сейфу')
                .setDescription(`$${balance.toLocaleString()}`);

            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        if (interaction.commandName === 'report') {
            await sendReport();
            return interaction.reply({ content: '✅ Звіт відправлено', ephemeral: true });
        }

        const isPlus = interaction.commandName === 'total_plus';

        const modal = new ModalBuilder()
            .setCustomId(isPlus ? 'plus' : 'minus')
            .setTitle(isPlus ? 'Поповнення' : 'Зняття');

        modal.addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('nick')
                    .setLabel('Нік')
                    .setStyle(TextInputStyle.Short)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('amount')
                    .setLabel('Сума')
                    .setStyle(TextInputStyle.Short)
            )
        );

        return interaction.showModal(modal);
    }

    if (interaction.type === InteractionType.ModalSubmit) {
        await interaction.deferReply();

        const nick = interaction.fields.getTextInputValue('nick');
        const amount = parseInt(interaction.fields.getTextInputValue('amount'));

        if (!amount) {
            return interaction.editReply('❌ Невірна сума');
        }

        const isPlus = interaction.customId === 'plus';

        const newBalance = await changeBalance(isPlus ? amount : -amount);

        await addStat(isPlus ? 'plus' : 'minus', amount);

        const embed = new EmbedBuilder()
            .setColor(isPlus ? '#00ff88' : '#ff3333')
            .setTitle(isPlus ? '🟢 Поповнення' : '🔴 Зняття')
            .setDescription(
                `👤 ${nick}\n` +
                `💵 $${amount.toLocaleString()}\n\n` +
                `💰 Баланс: $${newBalance.toLocaleString()}`
            )
            .setTimestamp();

        return interaction.editReply({ embeds: [embed] });
    }
});

client.login(TOKEN);

http.createServer((req, res) => {
    res.writeHead(200);
    res.end('OK');
}).listen(process.env.PORT || 3000);
