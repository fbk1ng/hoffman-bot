module.exports = function registerModule(ctx) {
    with (ctx) {
async function connectDB() {
    if (!MONGODB_URI) throw new Error('MONGODB_URI не доданий у Environment Variables');

    const mongo = new MongoClient(MONGODB_URI);
    await mongo.connect();

    const db = mongo.db('hoffman_bot');

    balances = db.collection('balances');
    dailyStats = db.collection('daily_stats');
    botSettings = db.collection('bot_settings');
    questDefinitions = db.collection('quest_definitions');
    questStates = db.collection('quest_states');
    birthdays = db.collection('birthdays');
    lotteryTickets = db.collection('lottery_tickets');
    lotterySettings = db.collection('lottery_settings');
    lotteryHistory = db.collection('lottery_history');
    dailyTasksPool = db.collection('daily_tasks_pool');
    dailyTaskSubmissions = db.collection('daily_task_submissions');
    dailyTaskSettings = db.collection('daily_task_settings');
    bankOperations = db.collection('bank_operations');
    personnelActions = db.collection('personnel_actions');
    careerApplications = db.collection('career_applications');

    await birthdays.createIndex({ nameLower: 1 }, { unique: true });
    await lotteryTickets.createIndex({ userId: 1 }, { unique: true });
    await dailyTasksPool.createIndex({ key: 1 }, { unique: true });
    await dailyTaskSubmissions.createIndex({ date: 1, userId: 1, difficulty: 1 });
    await bankOperations.createIndex({ createdAt: -1 });
    await bankOperations.createIndex({ type: 1, category: 1, createdAt: -1 });
    await personnelActions.createIndex({ createdAt: -1 });
    await personnelActions.createIndex({ type: 1, createdAt: -1 });
    await careerApplications.createIndex({ createdAt: -1 });
    await careerApplications.createIndex({ type: 1, status: 1, createdAt: -1 });

    await lotterySettings.updateOne(
        { name: 'weekly_lottery' },
        {
            $setOnInsert: {
                name: 'weekly_lottery',
                enabled: true,
                minPrize: 500000,
                maxPrize: 1000000,
                prizeStep: 100000,
                prizeType: 'money',
                manualPrizeName: null,
                manualPrizeDescription: null,
                lastAutoDrawDate: null,
                lotteryPanelMessageId: null,
                lotteryCrmMessageId: null
            }
        },
        { upsert: true }
    );

    await balances.updateOne(
        { name: 'safe' },
        { $setOnInsert: { name: 'safe', balance: 0 } },
        { upsert: true }
    );

    await botSettings.updateOne(
        { name: 'bot_lock' },
        { $setOnInsert: { name: 'bot_lock', locked: false } },
        { upsert: true }
    );

    await botSettings.updateOne(
        { name: 'career_settings' },
        {
            $setOnInsert: {
                name: 'career_settings',
                promotionOpen: true,
                deputyOpen: true,
                publicPanelMessageId: null,
                crmPanelMessageId: null
            }
        },
        { upsert: true }
    );

    // Synchronize task texts, difficulty and rewards from code with MongoDB.
    // The enabled flag of existing tasks is preserved, so manual disabling is not overwritten.
    for (const task of DEFAULT_DAILY_TASKS) {
        await dailyTasksPool.updateOne(
            { key: task.key },
            {
                $set: {
                    difficulty: task.difficulty,
                    rewardTickets: task.rewardTickets,
                    text: task.text,
                    updatedAt: Date.now()
                },
                $setOnInsert: {
                    key: task.key,
                    enabled: true,
                    createdAt: Date.now()
                }
            },
            { upsert: true }
        );
    }

    await dailyTaskSettings.updateOne(
        { name: 'daily_tasks' },
        {
            $setOnInsert: {
                name: 'daily_tasks',
                panelMessageId: null,
                currentDate: null,
                activeTasks: null,
                poolVersion: 0
            }
        },
        { upsert: true }
    );

    const currentDailyTaskSettings = await dailyTaskSettings.findOne({ name: 'daily_tasks' });

    // Regenerate the active set only once when the pool version changes.
    // Regular bot restarts will not reshuffle the same day's tasks.
    if ((currentDailyTaskSettings?.poolVersion || 0) !== DAILY_TASKS_POOL_VERSION) {
        await dailyTaskSettings.updateOne(
            { name: 'daily_tasks' },
            {
                $set: {
                    currentDate: null,
                    activeTasks: null,
                    poolVersion: DAILY_TASKS_POOL_VERSION,
                    poolUpdatedAt: Date.now()
                }
            }
        );

        console.log(`Daily Tasks pool synchronized to version ${DAILY_TASKS_POOL_VERSION}.`);
    }

    for (const quest of DEFAULT_QUESTS) {
        await questDefinitions.updateOne(
            { key: quest.key },
            { $setOnInsert: quest },
            { upsert: true }
        );

        await questStates.updateOne(
            { key: quest.key },
            {
                $setOnInsert: {
                    key: quest.key,
                    status: 'available',
                    cooldownUntil: null,
                    activeUserId: null,
                    activeUserName: null,
                    messageId: null,
                    reminder2hSent: false,
                    availableSent: false
                }
            },
            { upsert: true }
        );
    }

    console.log('MongoDB підключено.');
}

async function isBotLocked() {
    const lock = await botSettings.findOne({ name: 'bot_lock' });
    return Boolean(lock?.locked);
}

async function setBotLock(locked, userName) {
    await botSettings.updateOne(
        { name: 'bot_lock' },
        {
            $set: {
                name: 'bot_lock',
                locked,
                changedBy: userName,
                changedAt: Date.now()
            }
        },
        { upsert: true }
    );
}

async function getBalance() {
    const data = await balances.findOne({ name: 'safe' });
    return data?.balance || 0;
}

async function changeBalance(amount) {
    const result = await balances.findOneAndUpdate(
        { name: 'safe' },
        { $inc: { balance: amount } },
        { upsert: true, returnDocument: 'after' }
    );

    return result.balance;
}

async function addDailyStat(type, amount) {
    const date = getKyivDate();

    await dailyStats.updateOne(
        { date },
        {
            $inc: {
                plus: type === 'plus' ? amount : 0,
                minus: type === 'minus' ? amount : 0
            },
            $setOnInsert: {
                date,
                reportSent: false
            }
        },
        { upsert: true }
    );
}

async function recordBankOperation({ type, amount, category = 'other', note = '—', userId = null, userName = 'System', displayName = 'System', role = 'System', balanceAfter = null, source = 'manual', operationKey = null }) {
    if (!bankOperations) return;

    const categoryLabel = getBankCategoryLabel(type, category);

    await bankOperations.insertOne({
        type,
        amount: Number(amount) || 0,
        category,
        categoryLabel,
        note: note || '—',
        userId,
        userName,
        displayName,
        role,
        balanceAfter,
        source,
        operationKey,
        date: getKyivDate(),
        createdAt: Date.now()
    });
}

        Object.assign(ctx, {
            connectDB,
            isBotLocked,
            setBotLock,
            getBalance,
            changeBalance,
            addDailyStat,
            recordBankOperation
        });
    }
};