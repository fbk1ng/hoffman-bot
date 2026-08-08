# AGENTS.md

Коротка пам'ятка для агентів, які швидко входять у `hoffman-bot`.

## Призначення

Це Discord-бот Hoffman Family / Hoffman LTD. Він керує банком, квестами, заявками, днями народження, лотереєю, daily tasks, кар'єрними заявками та CRM-панелями.

## Команди для перевірки

```bash
npm test
```

```bash
npm start
```

`npm start` потребує реальні `TOKEN` і `MONGODB_URI`. В unit-тестах використовуються fake builders і in-memory колекції з `test/helpers.js`.

## Головна архітектура

- Вхідна точка: `index.js`.
- Усі модулі отримують спільний об'єкт `ctx`.
- Модулі додають функції в `ctx` через `Object.assign(ctx, { ... })`.
- Усередині модулів використовується `with (ctx)`, тому порядок реєстрації в `index.js` важливий.
- Спочатку йдуть config/shared/db/features/commands, потім `src/events.js`.

Не перетворюйте локальний стиль на класи або DI-контейнер без окремої задачі. Для маленьких змін дотримуйтеся наявного патерну `registerModule(ctx)`.

## Де шукати логіку

- `src/config.js` - env, channel ID, role ID, дефолтні квести, daily tasks, кольори.
- `src/shared.js` - гроші, дати Kyiv timezone, ролі, категорії банку, перевірки типів команд.
- `src/db.js` - MongoDB колекції, індекси, початкові документи, синхронізація daily tasks.
- `src/commands.js` - slash-команди.
- `src/events/ready.js` - підключення БД, реєстрація команд, ensure-панелі, інтервали.
- `src/events/interactionCreate.js` - центральний роутер slash-команд, кнопок, select menu і modal submit.
- `src/events/messageCreate.js` - приймання скриншотів daily tasks у DM.
- `src/features/core.js` - логи, глобальна безпека, щоденний звіт.
- `src/features/quests.js` - квести, кулдауни, repair, transfer, autocomplete.
- `src/features/lottery.js` - квитки, щотижневий розіграш, CRM лотереї.
- `src/features/dailyTasks.js` - щоденні завдання, надсилання на перевірку, approve/reject.
- `src/features/applications.js` - панелі та модалки заявок Family/LTD.
- `src/features/birthdays.js` - панель днів народження та щоденна перевірка.
- `src/features/finance.js` - Finance CRM і тижневі фінансові звіти.
- `src/features/personnel.js` - Personnel CRM і кадрові події.
- `src/features/career.js` - кар'єрна публічна панель, CRM і розгляд заявок.

## Практичні правила

- Не чіпайте чужі незакомічені зміни.
- Для пошуку використовуйте `rg`.
- Для ручних правок використовуйте `apply_patch`.
- Не запускайте бота без розуміння, що він підключиться до Discord і MongoDB.
- Не змінюйте hard-coded Discord IDs у `src/config.js` без явної причини.
- Якщо змінюєте `DEFAULT_DAILY_TASKS`, збільште `DAILY_TASKS_POOL_VERSION`.
- Якщо додаєте нову кнопку/модалку/select, перевірте `customId` і додайте обробку в `src/events/interactionCreate.js`.
- Якщо додаєте нову slash-команду, оновіть `src/commands.js` і обробник chat input у `src/events/interactionCreate.js`.
- Якщо додаєте MongoDB-колекцію або індекс, оновіть `src/db.js` і тестовий `createBaseCtx` за потреби.

## Тести

Тести лежать у `test/*.test.js` і запускаються вбудованим runner Node. Вони реєструють потрібні модулі на fake `ctx`, тому нову чисту функцію краще експортувати через `Object.assign(ctx, ...)`, якщо її потрібно тестувати напряму.

Поточні зони покриття:

- security/cooldown у core;
- helpers і ролі в shared;
- тижнева агрегація Finance CRM;
- статистика Personnel CRM;
- lottery helpers, квитки, weighted winner;
- daily tasks rewards, fallback tasks, статистика;
- quests flow і статуси.

## Часті точки ризику

- `with (ctx)` приховує залежності. Перед зміною функції перевірте, звідки приходять використані імена.
- `interactionCreate.js` великий і маршрутизує багато різних `customId`; шукайте точну назву через `rg`.
- Часова зона звітів і щоденних процесів: `Europe/Kyiv`.
- Деякі рядки в проєкті можуть виглядати як зламане кодування в терміналі Windows, але логіка не має змінюватися через відображення.
- `findOneAndUpdate` у тестовій in-memory колекції повертає спрощений об'єкт, не повноцінний MongoDB response.
