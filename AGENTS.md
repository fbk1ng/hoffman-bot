# AGENTS.md

Короткая памятка для агентов, которые быстро входят в `hoffman-bot`.

## Назначение

Это Discord-бот Hoffman Family / Hoffman LTD. Он управляет банком, квестами, заявками, днями рождения, лотереей, daily tasks, карьерными заявками и CRM-панелями.

## Команды для проверки

```bash
npm test
```

```bash
npm start
```

`npm start` требует реальные `TOKEN` и `MONGODB_URI`. В unit-тестах используются fake builders и in-memory коллекции из `test/helpers.js`.

## Главная архитектура

- Входная точка: `index.js`.
- Все модули получают общий объект `ctx`.
- Модули добавляют функции в `ctx` через `Object.assign(ctx, { ... })`.
- Внутри модулей используется `with (ctx)`, поэтому порядок регистрации в `index.js` важен.
- Сначала идут config/shared/db/features/commands, затем `src/events.js`.

Не превращайте локальный стиль в классы или DI-контейнер без отдельной задачи. Для маленьких изменений следуйте существующему паттерну `registerModule(ctx)`.

## Где искать логику

- `src/config.js` - env, channel ID, role ID, дефолтные квесты, daily tasks, цвета.
- `src/shared.js` - деньги, даты Kyiv timezone, роли, категории банка, проверки типов команд.
- `src/db.js` - MongoDB коллекции, индексы, начальные документы, синхронизация daily tasks.
- `src/commands.js` - slash-команды.
- `src/events/ready.js` - подключение БД, регистрация команд, ensure-панели, интервалы.
- `src/events/interactionCreate.js` - центральный роутер slash-команд, кнопок, select menu и modal submit.
- `src/events/messageCreate.js` - прием скриншотов daily tasks в DM.
- `src/features/core.js` - логи, глобальная безопасность, дневной отчет.
- `src/features/quests.js` - квесты, кулдауны, repair, transfer, autocomplete.
- `src/features/lottery.js` - билеты, еженедельный розыгрыш, CRM лотереи.
- `src/features/dailyTasks.js` - ежедневные задания, отправка на проверку, approve/reject.
- `src/features/applications.js` - панели и модалки заявок Family/LTD.
- `src/features/birthdays.js` - панель дней рождения и ежедневная проверка.
- `src/features/finance.js` - Finance CRM и недельные финансовые отчеты.
- `src/features/personnel.js` - Personnel CRM и кадровые события.
- `src/features/career.js` - карьерная публичная панель, CRM и рассмотрение заявок.

## Практические правила

- Не трогайте чужие незакоммиченные изменения.
- Для поиска используйте `rg`.
- Для ручных правок используйте `apply_patch`.
- Не запускайте бота без понимания, что он подключится к Discord и MongoDB.
- Не меняйте hard-coded Discord IDs в `src/config.js` без явной причины.
- Если меняете `DEFAULT_DAILY_TASKS`, увеличьте `DAILY_TASKS_POOL_VERSION`.
- Если добавляете новую кнопку/модалку/select, проверьте `customId` и добавьте обработку в `src/events/interactionCreate.js`.
- Если добавляете новую slash-команду, обновите `src/commands.js` и обработчик chat input в `src/events/interactionCreate.js`.
- Если добавляете MongoDB-коллекцию или индекс, обновите `src/db.js` и тестовый `createBaseCtx` при необходимости.

## Тесты

Тесты лежат в `test/*.test.js` и запускаются встроенным runner Node. Они регистрируют нужные модули на fake `ctx`, поэтому новую чистую функцию лучше экспортировать через `Object.assign(ctx, ...)`, если ее нужно тестировать напрямую.

Текущие зоны покрытия:

- security/cooldown в core;
- helpers и роли в shared;
- недельная агрегация Finance CRM;
- статистика Personnel CRM;
- lottery helpers, билеты, weighted winner;
- daily tasks rewards, fallback tasks, статистика;
- quests flow и статусы.

## Частые точки риска

- `with (ctx)` скрывает зависимости. Перед изменением функции проверьте, откуда приходят используемые имена.
- `interactionCreate.js` большой и маршрутизирует много разных `customId`; ищите точное имя через `rg`.
- Временная зона отчетов и ежедневных процессов: `Europe/Kyiv`.
- Некоторые строки в проекте могут выглядеть битой кодировкой в терминале Windows, но логика не должна меняться из-за отображения.
- `findOneAndUpdate` в тестовой in-memory коллекции возвращает упрощенный объект, не полноценный MongoDB response.
