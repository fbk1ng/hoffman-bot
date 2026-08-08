# Hoffman Bot

Discord-бот для управления активностями Hoffman Family / Hoffman LTD: семейный банк, квесты, заявки, дни рождения, лотерея, ежедневные задания, карьерные заявки и CRM-панели для руководства.

## Что умеет бот

- Регистрирует slash-команды Discord для одного сервера.
- Ведет баланс сейфа: пополнения, снятия, категории операций и ежедневные отчеты.
- Управляет квестами: запуск, завершение, отмена, кулдауны, ремонт зависших квестов и автодополнение.
- Принимает заявки в Hoffman Family и Hoffman LTD через модальные формы.
- Ведет дни рождения и публикует поздравления.
- Поддерживает еженедельную лотерею с билетами, CRM-панелью, ручной настройкой призов и автопроведением.
- Выдает ежедневные задания, принимает скриншоты в DM, отправляет заявки на проверку и начисляет билеты за одобрение.
- Формирует Finance CRM, Personnel CRM и Career CRM панели с недельными отчетами.
- Поднимает простой HTTP health-check сервер на `PORT` или `3000`.

## Технологии

- Node.js
- CommonJS
- `discord.js` v14
- MongoDB через официальный драйвер `mongodb`
- Встроенный тест-раннер Node: `node --test`

## Быстрый старт

1. Установите зависимости:

```bash
npm install
```

2. Задайте переменные окружения:

```bash
TOKEN=discord_bot_token
MONGODB_URI=mongodb_connection_string
REPORT_CHANNEL_ID=discord_channel_id
QUEST_CHANNEL_ID=discord_channel_id
BANK_CHANNEL_ID=discord_channel_id
LOG_CHANNEL_ID=discord_channel_id
PORT=3000
```

В проекте нет загрузчика `.env`, поэтому переменные должны приходить из окружения хостинга, процесса или shell-сессии.

3. Запустите бота:

```bash
npm start
```

4. Запустите тесты:

```bash
npm test
```

## Основные команды Discord

- `/total_plus` - пополнение сейфа.
- `/total_minus` - снятие средств с подтверждением.
- `/balance` - текущий баланс сейфа.
- `/report` - ручная отправка дневного отчета.
- `/apply` - заявка в Hoffman Family.
- `/quests` - начать квест.
- `/quest_status` - статусы всех квестов.
- `/quest_repair` - восстановить зависший квест.
- `/quest_add` - добавить или обновить квест.
- `/lock_bot` и `/unlock_bot` - глобальная блокировка и разблокировка бота.

Часть действий доступна только пользователям с ролями руководства. Проверки ролей и каналов находятся в `src/features/core.js` и `src/shared.js`.

## Структура проекта

```text
index.js                      # входная точка, создание Discord client и общего ctx
src/config.js                 # env, ID каналов/ролей, дефолтные квесты и daily tasks
src/shared.js                 # общие форматтеры, даты Kyiv timezone, проверки ролей
src/db.js                     # подключение MongoDB, коллекции, индексы, bootstrap данных
src/commands.js               # описание slash-команд
src/events.js                 # регистрация обработчиков событий
src/events/ready.js           # запуск БД, регистрация команд, создание панелей, интервалы
src/events/interactionCreate.js # основной роутер команд, кнопок, селектов и модалок
src/events/messageCreate.js   # прием DM-скриншотов для daily tasks
src/features/                 # доменные модули
test/                         # unit-тесты на node:test с in-memory fake helpers
```

## Архитектурная модель

Проект построен вокруг общего объекта `ctx`. `index.js` создает `ctx`, добавляет туда классы Discord, MongoDB, HTTP, состояние в памяти и затем вызывает регистраторы модулей:

```js
registerShared(ctx);
registerDatabase(ctx);
registerFinance(ctx);
// ...
registerEvents(ctx);
```

Каждый модуль экспортирует функцию `registerModule(ctx)` или `registerEvent(ctx)` и через `Object.assign(ctx, { ... })` добавляет свои функции. Внутри модулей используется `with (ctx)`, поэтому функции из других модулей доступны как локальные имена. Порядок регистрации важен: сначала конфиг и shared helpers, затем база и фичи, затем команды и события.

## MongoDB

База называется `hoffman_bot`. При запуске бот создает или использует коллекции:

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

Bootstrap данных и индексы описаны в `src/db.js`.

## Важные замечания

- Временная зона бизнес-логики: `Europe/Kyiv`.
- Многие Discord channel ID и role ID сейчас зашиты в `src/config.js`, часть ID приходит из env.
- При изменении `DEFAULT_DAILY_TASKS` нужно увеличить `DAILY_TASKS_POOL_VERSION`, чтобы активный пул обновился в MongoDB.
- Для новых интеракций добавляйте `customId` в генератор UI нужной фичи и обработку в `src/events/interactionCreate.js`.
- Для тестов используйте helpers из `test/helpers.js`, чтобы не подключаться к Discord и MongoDB.
