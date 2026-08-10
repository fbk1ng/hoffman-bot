module.exports = function registerModule(ctx) {
    with (ctx) {
const commands = [
    new SlashCommandBuilder().setName('total_plus').setDescription('Поповнення сейфу'),
    new SlashCommandBuilder().setName('total_minus').setDescription('Зняття коштів'),
    new SlashCommandBuilder().setName('balance').setDescription('Показати баланс сейфу'),
    new SlashCommandBuilder().setName('report').setDescription('Відправити звіт вручну'),
    new SlashCommandBuilder().setName('apply').setDescription('Подати заявку до сімʼї Hoffman'),

    new SlashCommandBuilder()
        .setName('quests')
        .setDescription('Почати виконання квесту')
        .addStringOption(option =>
            option.setName('quest').setDescription('Оберіть квест').setRequired(true).setAutocomplete(true)
        )
        .addStringOption(option =>
            option.setName('note').setDescription('Примітка').setRequired(false)
        )
        .addUserOption(option =>
            option.setName('member1').setDescription('Співучасник 1').setRequired(false)
        )
        .addUserOption(option =>
            option.setName('member2').setDescription('Співучасник 2').setRequired(false)
        )
        .addUserOption(option =>
            option.setName('member3').setDescription('Співучасник 3').setRequired(false)
        )
        .addUserOption(option =>
            option.setName('member4').setDescription('Співучасник 4').setRequired(false)
        )
        .addUserOption(option =>
            option.setName('member5').setDescription('Співучасник 5').setRequired(false)
        )
        .addUserOption(option =>
            option.setName('member6').setDescription('Співучасник 6').setRequired(false)
        )
        .addUserOption(option =>
            option.setName('member7').setDescription('Співучасник 7').setRequired(false)
        )
        .addUserOption(option =>
            option.setName('member8').setDescription('Співучасник 8').setRequired(false)
        )
        .addUserOption(option =>
            option.setName('member9').setDescription('Співучасник 9').setRequired(false)
        )
        .addUserOption(option =>
            option.setName('member10').setDescription('Співучасник 10').setRequired(false)
        ),

    new SlashCommandBuilder().setName('quest_status').setDescription('Показати статус усіх квестів'),

    new SlashCommandBuilder()
        .setName('quest_repair')
        .setDescription('Відновити завислий квест')
        .addStringOption(option =>
            option.setName('quest').setDescription('Оберіть квест').setRequired(true).setAutocomplete(true)
        )
        .addStringOption(option =>
            option
                .setName('action')
                .setDescription('Що зробити із завислим квестом')
                .setRequired(true)
                .addChoices(
                    { name: 'Оживити кнопки', value: 'refresh' },
                    { name: 'Повернути у виконання', value: 'reopen' }
                )
        ),

    new SlashCommandBuilder()
        .setName('quest_add')
        .setDescription('Додати або оновити квест')
        .addStringOption(option =>
            option.setName('name').setDescription('Назва квесту').setRequired(true)
        )
        .addIntegerOption(option =>
            option.setName('reward').setDescription('Нагорода').setRequired(true)
        )
        .addIntegerOption(option =>
            option.setName('cooldown_hours').setDescription('КД у годинах').setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName('quest_delete')
        .setDescription('Видалити квест')
        .addStringOption(option =>
            option.setName('quest').setDescription('Оберіть квест').setRequired(true).setAutocomplete(true)
        ),

    new SlashCommandBuilder().setName('lock_bot').setDescription('Заблокувати Hoffman Bot'),
    new SlashCommandBuilder().setName('unlock_bot').setDescription('Розблокувати Hoffman Bot')
].map(command => command.toJSON());

        Object.assign(ctx, {
            commands
        });
    }
};
