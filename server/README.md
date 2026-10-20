# Ходімо — API

Next.js 16 (лише Route Handlers) + zod + Drizzle ORM + Postgres. Вхід — Telegram Mini App `initData`.

## Запуск

```bash
cp server/.env.example server/.env   # один раз
```

**Розробка** (база в Docker, API локально з hot reload):

```bash
docker compose up -d db                          # з кореня репозиторію
cd server
npm run db:migrate && npm run db:categories      # перший раз
npm run dev                                      # http://localhost:5000
```

**Усе в Docker:** `docker compose up --build -d` — `db` (Postgres 17, порт 5432),
`migrate` (міграції + стартові категорії) і `server` (порт 5000).
Не запускай одночасно з `npm run dev` — обидва хочуть порт 5000.

## Ролі

| Хто               | Як стає                                    | Що може                                                       |
| ----------------- | ------------------------------------------ | ------------------------------------------------------------- |
| Гість             | без заголовка `Authorization`              | дивитися схвалені події й категорії                           |
| Користувач        | відкрив Mini App у Telegram                | записуватись; пропонувати події (на модерацію); керувати **своїми** |
| Адмін             | Telegram ID у `ADMIN_TELEGRAM_IDS` або призначив інший адмін | модерувати; керувати будь-якими подіями, категоріями й користувачами |
| Заблокований      | заблокував адмін                           | нічого (екран блокування)                                     |

Список учасників бачать лише автор події й адміни.

## Модерація й життєвий цикл події

- **pending** — подію створив користувач: бачать лише автор і адміни, записатися не можна.
- **approved** — схвалив адмін (події адмінів схвалюються одразу): бачать усі.
- **rejected** — відхилив адмін (з причиною або без): лишається лише в історії автора.
  Автор виправляє її — і вона знову стає `pending`. Правки схваленої події статус не змінюють.
- **Завершена** — час старту минув: зникає зі стрічки, з нею нічого не можна зробити,
  але вона назавжди лишається в історії профілю.

Авторизація: `Authorization: tma <initData>` (сирий `Telegram.WebApp.initData`).
Сервер перевіряє підпис токеном бота й свіжість, потім створює/оновлює користувача.

Без Telegram: `npm run -s tg:init-data -- --id 900001 --name Андрій` друкує підписані initData,
а при `DEV_LOGIN=true` їх видає `POST /api/dev/init-data` (цим користується сторінка `/dev` фронту).

## Ендпоінти

| Метод    | Шлях                       | Хто                 | Опис                                                        |
| -------- | -------------------------- | ------------------- | ----------------------------------------------------------- |
| `GET`    | `/api/health`              | усі                 | пінг бази                                                   |
| `GET`    | `/api/me`                  | користувач          | профіль із роллю                                            |
| `GET`    | `/api/categories`          | усі                 | активні категорії; адмін із `?all=1` — і архівні            |
| `POST`   | `/api/categories`          | адмін               | `{ name, emoji }`                                           |
| `PATCH`  | `/api/categories/:id`      | адмін               | `{ name?, emoji?, isArchived? }`                            |
| `DELETE` | `/api/categories/:id`      | адмін               | лише порожню; з подіями — 409, архівуй                    |
| `PUT`    | `/api/categories/order`    | адмін               | `{ ids }` — новий порядок (перетягування в адмінці)         |
| `GET`    | `/api/meetups`             | усі                 | схвалені майбутні: `?date=today\|weekend&category=<id>&city=…`; `?when=past` — завершені; `?when=all` — майбутні, під ними завершені; `?organizer=<id>` — події людини (своя історія — з усіма статусами); `?joined=me`; адмін: `?status=pending\|rejected` |
| `POST`   | `/api/meetups`             | користувач          | створити: користувачу — на розгляд, адміну — одразу       |
| `GET`    | `/api/meetups/:id`         | усі                 | деталі (непідтверджену — лише автору й адміну); `participants` — усім для активної, інакше автору й адміну |
| `PATCH`  | `/api/meetups/:id`         | автор / адмін       | змінити поля (відхилену — знову на розгляд)                |
| `DELETE` | `/api/meetups/:id`         | автор / адмін       | видалити                                                    |
| `POST`   | `/api/meetups/:id/join`    | користувач          | записатися (лише на схвалену; 409, якщо місць немає)        |
| `DELETE` | `/api/meetups/:id/join`    | користувач          | відписатися                                                 |
| `POST`   | `/api/meetups/:id/approve` | адмін               | схвалити                                                    |
| `POST`   | `/api/meetups/:id/reject`  | адмін               | `{ reason? }` — відхилити                                   |
| `GET`    | `/api/admin/summary`       | адмін               | `{ pendingMeetups }` — лічильник черги                      |
| `GET`    | `/api/admin/users`         | адмін               | `?q=` ім'я, @username або Telegram ID                       |
| `PATCH`  | `/api/admin/users/:id`     | адмін               | `{ role?: "user"\|"admin", isBlocked? }`; себе — не можна   |

Тіло `POST /api/meetups` (`description` необов'язковий):

```json
{
  "title": "Кава в центрі",
  "categoryId": "<uuid>",
  "startsAt": "2026-10-20T17:00:00Z",
  "capacity": 6,
  "city": "Познань",
  "place": "Stary Rynek",
  "description": ""
}
```

Помилки: `{ "error": { "code", "message", "details?" } }`; для `validation_error` у `details` —
список `{ path, message }`.

## Схема бази

Опис у `src/db/schema.ts`. Після змін: `npm run db:generate`, потім `npm run db:migrate`.

## Прод (Vercel + Supabase)

`DATABASE_URL` (Transaction pooler, порт 6543), `TELEGRAM_BOT_TOKEN` (справжній),
`ADMIN_TELEGRAM_IDS`, `DEV_LOGIN=false`, `DB_POOL_MAX=1`. Міграції: `npm run db:migrate && npm run db:categories`.
