module.exports = function registerModule(ctx) {
    with (ctx) {
function formatMoney(amount) {
    return `$${Number(amount).toLocaleString('en-US')}`;
}

const BANK_PLUS_CATEGORIES = {
    family_income: '💼 Заробіток сімʼї',
    donation: '🤝 Добровільний внесок',
    quest: '🧩 Квест',
    daily_task: '📅 Daily Task',
    compensation: '🎁 Повернення / компенсація',
    other: '📦 Інше'
};

const BANK_MINUS_CATEGORIES = {
    salary: '💵 Зарплата',
    lottery: '🎰 Лотерея',
    supply: '📦 Забезпечення',
    transport: '🚗 Транспорт / ремонт',
    bonus: '🎁 Премія',
    other: '📦 Інше'
};

function getBankCategoryLabel(type, value) {
    const categories = type === 'plus' ? BANK_PLUS_CATEGORIES : BANK_MINUS_CATEGORIES;
    return categories[value] || '📦 Інше';
}

function createBankCategorySelect(type) {
    const isPlus = type === 'plus';
    const categories = isPlus ? BANK_PLUS_CATEGORIES : BANK_MINUS_CATEGORIES;

    return new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId(`bank_category:${type}`)
            .setPlaceholder(isPlus ? 'Оберіть категорію поповнення' : 'Оберіть категорію зняття')
            .addOptions(
                Object.entries(categories).map(([value, label]) => ({
                    label: label.replace(/^[^\s]+\s/, ''),
                    value,
                    emoji: label.split(' ')[0]
                }))
            )
    );
}

function getKyivDate() {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Europe/Kyiv',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).format(new Date());
}

function getKyivDateTime(timestamp) {
    return new Intl.DateTimeFormat('uk-UA', {
        timeZone: 'Europe/Kyiv',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    }).format(new Date(timestamp));
}

function getKyivTime() {
    const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Europe/Kyiv',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    }).formatToParts(new Date());

    return {
        hour: Number(parts.find(p => p.type === 'hour').value),
        minute: Number(parts.find(p => p.type === 'minute').value)
    };
}

function formatDuration(ms) {
    if (ms <= 0) return '00:00:00';

    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function makeQuestKey(name) {
    return name
        .toLowerCase()
        .trim()
        .replace(/[^\p{L}\p{N}]+/gu, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 40);
}

function hasRole(member, roleId) {
    return member?.roles?.cache?.has(roleId);
}

function hasReviewAccess(member) {
    return REVIEW_ROLE_IDS.some(roleId => hasRole(member, roleId));
}

function hasFamilyAccess(member) {
    return FAMILY_ROLE_IDS.some(roleId => hasRole(member, roleId));
}

function hasLeaderAccess(member) {
    return hasRole(member, RANK_10_ROLE_ID);
}

function isBankCommand(commandName) {
    return ['total_plus', 'total_minus', 'balance', 'report'].includes(commandName);
}

function isQuestCommand(commandName) {
    return ['quests', 'quest_status', 'quest_repair', 'quest_add'].includes(commandName);
}

function isStaffCommand(commandName) {
    return ['total_plus', 'total_minus', 'report', 'quest_repair', 'quest_add'].includes(commandName);
}

function isFamilyCommand(commandName) {
    return ['balance', 'quests', 'quest_status'].includes(commandName);
}

        Object.assign(ctx, {
            formatMoney,
            BANK_PLUS_CATEGORIES,
            BANK_MINUS_CATEGORIES,
            getBankCategoryLabel,
            createBankCategorySelect,
            getKyivDate,
            getKyivDateTime,
            getKyivTime,
            formatDuration,
            makeQuestKey,
            hasRole,
            hasReviewAccess,
            hasFamilyAccess,
            hasLeaderAccess,
            isBankCommand,
            isQuestCommand,
            isStaffCommand,
            isFamilyCommand
        });
    }
};
