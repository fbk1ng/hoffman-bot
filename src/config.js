module.exports = function registerModule(ctx) {
    with (ctx) {
const TOKEN = process.env.TOKEN;
const MONGODB_URI = process.env.MONGODB_URI;
const REPORT_CHANNEL_ID = process.env.REPORT_CHANNEL_ID;
const QUEST_CHANNEL_ID = process.env.QUEST_CHANNEL_ID;
const BANK_CHANNEL_ID = process.env.BANK_CHANNEL_ID;
const LOG_CHANNEL_ID = process.env.LOG_CHANNEL_ID;

const BIRTHDAY_CHANNEL_ID = '1495990457904140428';
const BIRTHDAY_NEWS_CHANNEL_ID = '1495989840930672721';

const LOTTERY_CHANNEL_ID = '1513486880488816640';
const LOTTERY_RESULTS_CHANNEL_ID = '1515961352684830770';
const LOTTERY_CRM_CHANNEL_ID = '1513487657190166538';

const DAILY_TASKS_CHANNEL_ID = '1515963037306060881';
const DAILY_TASKS_REVIEW_CHANNEL_ID = '1515963471550746664';

const FINANCE_CRM_CHANNEL_ID = '1518883718561792093';
const FINANCE_REPORT_CHANNEL_ID = '1516042141665722421';

const PERSONNEL_CRM_CHANNEL_ID = '1518910316463919184';
const PERSONNEL_REPORT_CHANNEL_ID = '1516042141665722421';

const CAREER_PUBLIC_CHANNEL_ID = '1521157102142492813';
const CAREER_REVIEW_CHANNEL_ID = '1501498789188341851';
const CAREER_CRM_CHANNEL_ID = '1521158107294597140';
const CAREER_PANEL_IMAGE_URL = 'https://media.discordapp.net/attachments/1510979053090242711/1521154302788243607/ChatGPT_Image_29_._2026_._17_03_34.png?ex=6a43ccd7&is=6a427b57&hm=e3c41f9c3c817747ce0009e71d82e44ab71ba7824a50e8285028e55a2614488a&=&format=webp&quality=lossless&width=967&height=544';

const CLIENT_ID = '1501160094006771812';
const GUILD_ID = '1495987963887227031';

const APPLICATION_PUBLIC_CHANNEL_ID = '1495989924938383490';
const APPLICATION_REVIEW_CHANNEL_ID = '1501498789188341851';

const GUEST_ROLE_ID = '1496709652866666586';
const ACCEPTED_ROLE_ID = '1496709001356771429';
const COMPANY_ROLE_ID = '1531942632710996098';
const RANK_9_ROLE_ID = '1495997440333971507';
const RANK_10_ROLE_ID = '1495997048669863966';

const REVIEW_ROLE_IDS = [RANK_9_ROLE_ID, RANK_10_ROLE_ID];
const FAMILY_ROLE_IDS = [ACCEPTED_ROLE_ID, RANK_9_ROLE_ID, RANK_10_ROLE_ID];

const COOLDOWN_MS = 10 * 1000;

// Hoffman visual style and Daily Tasks pool version.
// Increase DAILY_TASKS_POOL_VERSION whenever DEFAULT_DAILY_TASKS is changed.
const HOFFMAN_RED = 0x8B0000;
const HOFFMAN_GRAY = 0x4A4D52;
const DAILY_TASKS_POOL_VERSION = 2;

const DEFAULT_QUESTS = [
    { key: 'tovarnyi_vybukh', name: 'Товарний вибух', reward: 1000000, cooldownHours: 24 },
    { key: 'dopomoha_hromadianam', name: 'Допомога громадянам', reward: 1000000, cooldownHours: 24 },
    { key: 'myslyvskyi_sezon', name: 'Мисливський сезон', reward: 500000, cooldownHours: 24 }
];

const DEFAULT_DAILY_TASKS = [
    // Easy tasks — +1 ticket
    { key: 'easy_advertise_family', difficulty: 'easy', rewardTickets: 1, text: 'Зробити рекламу сімʼї будь-яким чином (оголошення у грі або на Discord-сервері Quant)' },
    { key: 'easy_invite_person', difficulty: 'easy', rewardTickets: 1, text: 'Виконати два рейси у компанії сімʼї (Hoffman LTD)' },
    { key: 'easy_help_member', difficulty: 'easy', rewardTickets: 1, text: 'Допомогти учаснику сімʼї виконати квест або БП' },
    { key: 'easy_repair_vehicle', difficulty: 'easy', rewardTickets: 1, text: 'Відремонтувати всі вузли на одному автомобілі' },
    { key: 'easy_chip_to_safe', difficulty: 'easy', rewardTickets: 1, text: 'Покласти одну із частин мікросхеми/мікросхему до сейфу сім`ї' },
    { key: 'easy_help_newbie_join', difficulty: 'easy', rewardTickets: 1, text: 'Допомогти новачку та запропонувати приєднатись до сімʼї' },
    { key: 'easy_family_screenshot', difficulty: 'easy', rewardTickets: 1, text: 'Зробити гарний скріншот із сімʼєю або членом сімʼї у грі' },
    { key: 'easy_join_activity', difficulty: 'easy', rewardTickets: 1, text: 'Взяти участь у будь-якій активності сімʼї' },
    { key: 'easy_complete_family_quest', difficulty: 'easy', rewardTickets: 1, text: 'Взяти участь у сімейному квесті' },
    { key: 'easy_evening_online', difficulty: 'easy', rewardTickets: 1, text: 'Виконати один рейс у компанії сімʼї (Hoffman LTD)' },
    { key: 'easy_house_photo', difficulty: 'easy', rewardTickets: 1, text: 'Зробити гарне фото на фоні сімейного будинку або подвірʼя і виставити його в галерею' },
    { key: 'easy_hug_member', difficulty: 'easy', rewardTickets: 1, text: 'Зробити вклад в сімʼю від 15.000$' },
    { key: 'easy_family_contribution_10k', difficulty: 'easy', rewardTickets: 1, text: 'Зробити вклад в сімʼю від 10.000$' },

    // Medium tasks — +2 tickets
    { key: 'medium_two_quests_day', difficulty: 'medium', rewardTickets: 2, text: 'Взяти участь у двох квестах за день' },
    { key: 'medium_help_recruitment', difficulty: 'medium', rewardTickets: 2, text: 'Допомогти провести набір у сімʼю' },
    { key: 'medium_active_recruit', difficulty: 'medium', rewardTickets: 2, text: 'Виконати пʼять рейсів у компанії сімʼї (Hoffman LTD)' },
    { key: 'medium_small_activity', difficulty: 'medium', rewardTickets: 2, text: 'Виконати сім рейсів у компанії сімʼї (Hoffman LTD)' },
    { key: 'medium_transport_logistics', difficulty: 'medium', rewardTickets: 2, text: 'Зробити дві реклами сімʼї будь-яким чином (оголошення у грі або на Discord-сервері Quant)' },
    { key: 'medium_two_hours_online', difficulty: 'medium', rewardTickets: 2, text: 'Провести мінімум 2 години онлайн із сімʼєю' },
    { key: 'medium_team_hard_quest', difficulty: 'medium', rewardTickets: 2, text: 'Допомогти виконати складний квест разом із сімʼєю' },
    { key: 'medium_ad_series', difficulty: 'medium', rewardTickets: 2, text: 'Зробити вклад в сімʼю від 40.000$' },
    { key: 'medium_family_contribution_20k', difficulty: 'medium', rewardTickets: 2, text: 'Зробити вклад в сімʼю від 20.000$' },
    { key: 'medium_group_trip', difficulty: 'medium', rewardTickets: 2, text: 'Організувати спільний виїзд або захід' },
    { key: 'medium_leadership_task', difficulty: 'medium', rewardTickets: 2, text: 'Виконати РП завдання від керівництва (писати 9-10 рангу)' },

    // Hard tasks — +3 tickets
    { key: 'hard_full_recruitment', difficulty: 'hard', rewardTickets: 3, text: 'Провести повноцінний набір у сімʼю через оголошення в новини: “Сім`я Hoffman шукає далеких родичів. Очікуємо біля будинку №347.”' },
    { key: 'hard_family_contribution_50k', difficulty: 'hard', rewardTickets: 3, text: 'Зробити вклад в сімʼю від 70.000$' },
    { key: 'hard_convoy_trip', difficulty: 'hard', rewardTickets: 3, text: 'Виконати 10 рейсів у компанії сімʼї (Hoffman LTD)' },
    { key: 'hard_multiple_quests', difficulty: 'hard', rewardTickets: 3, text: 'Виконати 15 рейсів у компанії сімʼї (Hoffman LTD)' },
    { key: 'hard_full_staff_activity', difficulty: 'hard', rewardTickets: 3, text: 'Провести вечірку на території будинку "На території будинку №347 проходить запальна вечірка. Запрошуємо всіх охочих!"' },
    { key: 'hard_important_help', difficulty: 'hard', rewardTickets: 3, text: 'Ти виграв щасливий білет! Просто натисни "Виконати" завдання і отримуй 3 квитки! Вітаю!' },
    { key: 'hard_big_rp_team', difficulty: 'hard', rewardTickets: 3, text: 'Заправити всі транспортні засоби сімʼї' },
    { key: 'hard_newbie_adaptation', difficulty: 'hard', rewardTickets: 3, text: 'Замовити до будинку 10 одиниць їжі одного виду (піца, бургери тощо)' },
    { key: 'hard_leadership_order', difficulty: 'hard', rewardTickets: 3, text: 'Зробити вклад в сімʼю від 100.000$' },
    { key: 'hard_evening_activity', difficulty: 'hard', rewardTickets: 3, text: 'Зробити дві реклами сімʼї будь-яким чином (оголошення у грі або на Discord-сервері Quant)' },
    { key: 'hard_complex_rp', difficulty: 'hard', rewardTickets: 3, text: 'Виконати 20 рейсів у компанії сімʼї (Hoffman LTD)' }
];

        Object.assign(ctx, {
            TOKEN,
            MONGODB_URI,
            REPORT_CHANNEL_ID,
            QUEST_CHANNEL_ID,
            BANK_CHANNEL_ID,
            LOG_CHANNEL_ID,
            BIRTHDAY_CHANNEL_ID,
            BIRTHDAY_NEWS_CHANNEL_ID,
            LOTTERY_CHANNEL_ID,
            LOTTERY_RESULTS_CHANNEL_ID,
            LOTTERY_CRM_CHANNEL_ID,
            DAILY_TASKS_CHANNEL_ID,
            DAILY_TASKS_REVIEW_CHANNEL_ID,
            FINANCE_CRM_CHANNEL_ID,
            FINANCE_REPORT_CHANNEL_ID,
            PERSONNEL_CRM_CHANNEL_ID,
            PERSONNEL_REPORT_CHANNEL_ID,
            CAREER_PUBLIC_CHANNEL_ID,
            CAREER_REVIEW_CHANNEL_ID,
            CAREER_CRM_CHANNEL_ID,
            CAREER_PANEL_IMAGE_URL,
            CLIENT_ID,
            GUILD_ID,
            APPLICATION_PUBLIC_CHANNEL_ID,
            APPLICATION_REVIEW_CHANNEL_ID,
            GUEST_ROLE_ID,
            ACCEPTED_ROLE_ID,
            COMPANY_ROLE_ID,
            RANK_9_ROLE_ID,
            RANK_10_ROLE_ID,
            REVIEW_ROLE_IDS,
            FAMILY_ROLE_IDS,
            COOLDOWN_MS,
            HOFFMAN_RED,
            HOFFMAN_GRAY,
            DAILY_TASKS_POOL_VERSION,
            DEFAULT_QUESTS,
            DEFAULT_DAILY_TASKS
        });
    }
};