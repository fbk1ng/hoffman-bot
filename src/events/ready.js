module.exports = function registerEvent(ctx) {
    with (ctx) {
const rest = new REST({ version: '10' }).setToken(TOKEN);

client.once(Events.ClientReady, async () => {
    console.log(`Бот запущений: ${client.user.tag}`);

    try {
        await connectDB();

        await rest.put(
            Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
            { body: commands }
        );

        console.log('Команди зареєстровано.');

        await ensureApplicationPanel();
        await ensureBirthdayPanel();
        await ensureLotteryPanel();
        await ensureLotteryCrmPanel();
        await ensureDailyTasksPanel();
        await ensureFinanceCrmPanel();
        await ensurePersonnelCrmPanel();
        await ensureCareerPublicPanel();
        await ensureCareerCrmPanel();

        setInterval(async () => {
            const { hour, minute } = getKyivTime();

            if (hour === 23 && minute === 59) {
                await sendReport(false);
            }
        }, 60000);

        setInterval(async () => {
            await checkQuestCooldowns();
        }, 60000);

        setInterval(async () => {
            await checkBirthdays();
        }, 60000);

        setInterval(async () => {
            await checkLotteryAutoDraw();
        }, 60000);

        setInterval(async () => {
            await checkDailyTasksRefresh();
        }, 60000);

    } catch (error) {
        console.error('Помилка запуску:', error);
    }
});
    }
};