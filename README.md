# Hoffman Bot

Discord-бот для керування активностями Hoffman Family / Hoffman LTD: сімейний банк, квести, заявки, дні народження, лотерея, щоденні завдання, кар'єрні заявки та CRM-панелі для керівництва.

## Що вміє бот

- Реєструє slash-команди Discord для одного сервера.
- Веде баланс сейфа: поповнення, зняття, категорії операцій і щоденні звіти.
- Керує квестами: запуск, завершення, скасування, кулдауни, відновлення завислих квестів і автодоповнення.
- Приймає заявки в Hoffman Family і Hoffman LTD через модальні форми.
- Веде дні народження та публікує привітання.
- Підтримує щотижневу лотерею з квитками, CRM-панеллю, ручним налаштуванням призів і автоматичним проведенням.
- Видає щоденні завдання, приймає скриншоти в DM, надсилає заявки на перевірку та нараховує квитки за схвалення.
- Формує Finance CRM, Personnel CRM і Career CRM панелі з тижневими звітами.
- Підіймає простий HTTP health-check сервер на `PORT` або `3000`.

## Технології

- Node.js
- CommonJS
- `discord.js` v14
- MongoDB через офіційний драйвер `mongodb`
- Вбудований тест-ранер Node: `node --test`

## Швидкий старт

1. Встановіть залежності:

```bash
npm install
```

2. Задайте змінні середовища:

```bash
TOKEN=discord_bot_token
MONGODB_URI=mongodb_connection_string
REPORT_CHANNEL_ID=discord_channel_id
QUEST_CHANNEL_ID=discord_channel_id
BANK_CHANNEL_ID=discord_channel_id
LOG_CHANNEL_ID=discord_channel_id
PORT=3000
```

У проєкті немає завантажувача `.env`, тому змінні мають надходити із середовища хостингу, процесу або shell-сесії.

3. Запустіть бота:

```bash
npm start
```

4. Запустіть тести:

```bash
npm test
```

## Основні команди Discord

- `/total_plus` - поповнення сейфа.
- `/total_minus` - зняття коштів із підтвердженням.
- `/balance` - поточний баланс сейфа.
- `/report` - ручне надсилання щоденного звіту.
- `/apply` - заявка в Hoffman Family.
- `/quests` - почати квест.
- `/quest_status` - статуси всіх квестів.
- `/quest_repair` - відновити завислий квест.
- `/quest_add` - додати або оновити квест.
- `/lock_bot` і `/unlock_bot` - глобальне блокування та розблокування бота.

Частина дій доступна лише користувачам із ролями керівництва. Перевірки ролей і каналів розташовані в `src/features/core.js` і `src/shared.js`.

## Структура проєкту

```text
index.js                        # вхідна точка, створення Discord client і спільного ctx
src/config.js                   # env, ID каналів/ролей, дефолтні квести та daily tasks
src/shared.js                   # спільні форматери, дати Kyiv timezone, перевірки ролей
src/db.js                       # підключення MongoDB, колекції, індекси, bootstrap-дані
src/commands.js                 # опис slash-команд
src/events.js                   # реєстрація обробників подій
src/events/ready.js             # запуск БД, реєстрація команд, створення панелей, інтервали
src/events/interactionCreate.js # основний роутер команд, кнопок, select menu і модалок
src/events/messageCreate.js     # приймання DM-скриншотів для daily tasks
src/features/                   # доменні модулі
test/                           # unit-тести на node:test з in-memory fake helpers
```

## Архітектурна модель

Проєкт побудований навколо спільного об'єкта `ctx`. `index.js` створює `ctx`, додає туди класи Discord, MongoDB, HTTP, стан у пам'яті, а потім викликає реєстратори модулів:

```js
registerShared(ctx);
registerDatabase(ctx);
registerFinance(ctx);
// ...
registerEvents(ctx);
```

Кожен модуль експортує функцію `registerModule(ctx)` або `registerEvent(ctx)` і через `Object.assign(ctx, { ... })` додає власні функції. Усередині модулів використовується `with (ctx)`, тому функції з інших модулів доступні як локальні імена. Порядок реєстрації важливий: спочатку config і shared helpers, потім база й фічі, потім команди та події.

## MongoDB

База називається `hoffman_bot`. Під час запуску бот створює або використовує колекції:

- `balances`
- `daily_stats`
- `bot_settings`
- `quest_definitions`
- `quest_states`
- `birthdays`
- `lottery_tickets`
- `lottery_settings`
- `lottery_history`
- `daily_tasks_pool`
- `daily_task_submissions`
- `daily_task_settings`
- `bank_operations`
- `personnel_actions`
- `career_applications`

Bootstrap-дані та індекси описані в `src/db.js`.

## Важливі примітки

- Часова зона бізнес-логіки: `Europe/Kyiv`.
- Багато Discord channel ID і role ID зараз зашиті в `src/config.js`, частина ID надходить із env.
- Якщо змінюєте `DEFAULT_DAILY_TASKS`, потрібно збільшити `DAILY_TASKS_POOL_VERSION`, щоб активний пул оновився в MongoDB.
- Для нових інтеракцій додавайте `customId` у генератор UI потрібної фічі та обробку в `src/events/interactionCreate.js`.
- Для тестів використовуйте helpers із `test/helpers.js`, щоб не підключатися до Discord і MongoDB.
