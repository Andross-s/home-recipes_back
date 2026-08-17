# Home Recipes — Backend

REST API для pet-проєкту **Home Recipes** — сайту з рецептами та консервацією.

## Стек

- **Node.js** + **Express**
- **TypeScript** (strict mode)
- **MongoDB** + **Mongoose**
- **Joi** — валідація тіла запитів
- **JWT** (access + refresh токени, сесії в БД) — авторизація
- **Multer** + **Cloudinary** — завантаження зображень
- **Nodemailer** — листи (підтвердження email); обраний замість Resend/SendGrid,
  бо їх безкоштовний режим шле листи лише на верифікований домен/адресу власника
  акаунту (див. коментар у [src/services/email.service.ts](src/services/email.service.ts))
- **helmet** — базові security-заголовки
- **express-rate-limit** — обмеження частоти запитів на `/api/auth/*`
- **express-mongo-sanitize** — прибирає `$`/`.`-ключі з вхідних даних (захист від NoSQL-ін'єкцій)
- **Swagger UI Express** — документація API, доступна на `/api-docs`
- Деплой — **Render** (Web Service)

## Формат відповідей

Успішні відповіді:

```json
{ "status": 200, "data": { "...": "..." } }
```

Помилки — API не локалізує повідомлення для користувача:

```json
{
  "status": 400,
  "errorCode": "EMAIL_ALREADY_EXISTS",
  "message": "User with this email already exists",
  "data": null
}
```

`errorCode` — стабільний машинний код, за яким фронтенд підбирає локалізований текст.
`message` — англійський опис, призначений для логів і Swagger, не для показу користувачу.

## Запуск проєкту

1. Встановити залежності:

   ```bash
   npm install
   ```

2. Скопіювати `.env.example` у `.env` і заповнити значення (див. розділ
   [Змінні середовища](#змінні-середовища) нижче):

   ```bash
   cp .env.example .env
   ```

3. Запустити у режимі розробки (автоперезапуск через `tsx watch`):

   ```bash
   npm run dev
   ```

4. (Опційно) наповнити базу стартовими категоріями та інгредієнтами:

   ```bash
   npm run seed
   ```

5. Зібрати production-версію та запустити:

   ```bash
   npm run build
   npm start
   ```

Після запуску документація API доступна на `http://localhost:3000/api-docs`.

## Інші команди

- `npm run seed` — наповнити базу стартовими категоріями/інгредієнтами (ідемпотентно,
  безпечно запускати повторно)
- `npm run migrate:recipe-images` — одноразова міграція (див. [Міграції](#міграції))
- `npm run lint` — перевірка коду ESLint
- `npm run lint:fix` — автоматичне виправлення
- `npm run format` — форматування Prettier

## Міграції

Одноразові скрипти в `src/db/`, безпечні для повторного запуску (пропускають
уже мігровані документи):

- **`migrate-recipe-images.ts`** (`npm run migrate:recipe-images`) — переносить
  старе поле `imageUrl: String` у нове `images: [{ url, publicId: null }]` і
  видаляє `imageUrl`. `publicId` виставляється в `null`, бо для вже завантажених
  зображень (деякі — навіть не через наш Cloudinary-акаунт) реальний
  Cloudinary `public_id` невідомий.

## Структура проєкту

```
src/
├── controllers/   # тонкі контролери: req → service → response
├── db/            # підключення до MongoDB, seed- та міграційні скрипти
├── docs/          # Swagger/OpenAPI специфікація
├── middlewares/   # валідація (Joi), авторизація, rate-limit, обробка помилок
├── models/        # Mongoose-моделі + Joi-схеми
├── routes/        # Express-роутери
├── services/      # бізнес-логіка та звернення до БД
├── types/         # спільні TypeScript-типи (напр. розширення Express.Request)
├── utils/         # допоміжні утиліти (HttpError, JWT, ctrlWrapper тощо)
├── app.ts         # конфігурація Express-застосунку
└── index.ts       # точка входу, підключення до БД, запуск сервера
```

## Ендпоінти API

Повна інтерактивна документація з тілами запитів/відповідей — на `/api-docs`
(Swagger UI). Нижче — короткий огляд.

`Access`: **Public** — без токена; **Private** — потрібен `Authorization: Bearer <accessToken>`;
**Admin** — Private + роль `admin`; **Owner/Admin** — власник ресурсу або admin.

### Auth

| Method | Endpoint | Description | Access |
|---|---|---|---|
| POST | `/api/auth/register` | Реєстрація, лист підтвердження email | Public |
| GET | `/api/auth/verify-email/:token` | Підтвердження email за токеном | Public |
| POST | `/api/auth/resend-verification` | Повторна відправка листа підтвердження (1 раз/60с на email) | Public |
| POST | `/api/auth/login` | Логін, видає access/refresh токени | Public |
| POST | `/api/auth/oauth/google` | Вхід/реєстрація через Google (`{ idToken }`, верифікується через `google-auth-library`) | Public |
| POST | `/api/auth/refresh` | Оновлення пари токенів | Public |
| POST | `/api/auth/logout` | Видалення поточної сесії | Private |

**Google-вхід**: `authProvider` на User — `'email'` або `'google'`. Якщо `googleId`
не знайдено, але email вже зареєстрований (будь-яким провайдером) — акаунти
**не** лінкуються автоматично (ризик захоплення чужого акаунта), повертається
`409 EMAIL_REGISTERED_WITH_PASSWORD`. Новий google-акаунт одразу `isVerified: true`
(Google вже підтвердив email) і без `password`. Потрібна змінна `GOOGLE_CLIENT_ID`
(OAuth 2.0 Client ID з [Google Cloud Console](https://console.cloud.google.com/apis/credentials)).

### Users

| Method | Endpoint | Description | Access |
|---|---|---|---|
| GET | `/api/users/me` | Поточний користувач | Private |
| PATCH | `/api/users/me` | Оновити ім'я | Private |
| PATCH | `/api/users/me/avatar` | Замінити аватар (Multer + Cloudinary) | Private |

### Categories

Категорії — курований довідник (керує лише admin), тому `name` — мультимовний
об'єкт `{ uk, en?, ka? }`: `uk` обов'язковий (базова мова-фолбек), `en`/`ka`
опційні, поки адмін не переклав. `GET` завжди повертає всі три мови одразу —
фронт сам обирає локаль і фолбечить на `uk`, якщо потрібної мови немає.

| Method | Endpoint | Description | Access |
|---|---|---|---|
| GET | `/api/categories` | Список категорій, фільтр `?group=` | Public |
| POST | `/api/categories` | Створити категорію, тіло `{ name: { uk, en?, ka? }, group }` | Admin |
| PATCH | `/api/categories/:id` | Часткове оновлення (напр. лише `name.ka`, без зміни uk/en) | Admin |
| DELETE | `/api/categories/:id` | Видалити (409, якщо є рецепти) | Admin |

### Ingredients

Той самий мультимовний `name`, що й у категорій. Унікальність перевіряється
саме по `name.uk`.

| Method | Endpoint | Description | Access |
|---|---|---|---|
| GET | `/api/ingredients` | Список, пошук `?search=&lang=uk\|en\|ka` (шукає в `name[lang]`, дефолт `uk`) | Public |
| POST | `/api/ingredients` | Створити, тіло `{ name: { uk, en?, ka? } }` | Admin |
| PATCH | `/api/ingredients/:id` | Часткове оновлення `name.*` | Admin |
| DELETE | `/api/ingredients/:id` | Видалити (409, якщо є рецепти) | Admin |

> При завантаженні зображення (`multipart/form-data`) поле `name` передається
> як JSON-рядок в тому ж полі форми (як і `ingredients`/`steps` у рецептах) —
> див. приклади в Swagger UI (`/api-docs`).

### Recipes

Рецепт має `images: [{ url, publicId }]` — до 6 фото, перше в масиві вважається
головним (показується на картці в каталозі). `publicId` потрібен лише бекенду
для видалення з Cloudinary; для рецептів, змігрованих зі старого `imageUrl`
(див. [Міграції](#міграції) нижче), `publicId` буде `null` — такі фото можна
показати, але не можна видалити через API (невідомий Cloudinary-акаунт джерела).

| Method | Endpoint | Description | Access |
|---|---|---|---|
| GET | `/api/recipes` | Список з фільтрами (`group`, `category`, `ingredient`, `search`) і пагінацією | Public |
| GET | `/api/recipes/own` | Власні рецепти, з пагінацією | Private |
| GET | `/api/recipes/favorites` | Обрані рецепти | Private |
| POST | `/api/recipes/favorites/:id` | Додати в обране | Private |
| DELETE | `/api/recipes/favorites/:id` | Прибрати з обраного | Private |
| GET | `/api/recipes/:id` | Деталі рецепта (populate category/ingredients/owner.name) | Public |
| POST | `/api/recipes` | Створити рецепт, до 6 фото через `images` (multipart), фото не обов'язкове | Private |
| PATCH | `/api/recipes/:id` | Оновити; підтримує `imagesToDelete: [publicId]`, `imageOrder: [publicId]`, нові файли `images` додаються в кінець | Owner/Admin |
| DELETE | `/api/recipes/:id` | Видалити рецепт (+ усі його фото з Cloudinary) | Owner/Admin |

### Admin

| Method | Endpoint | Description | Access |
|---|---|---|---|
| GET | `/api/admin/users` | Список користувачів, фільтр `role`/`search`, пагінація | Admin |
| PATCH | `/api/admin/users/:id/role` | Змінити роль (заборонено понижувати останнього admin) | Admin |
| PATCH | `/api/admin/users/:id/block` | Заблокувати/розблокувати | Admin |
| DELETE | `/api/admin/users/:id` | Видалити користувача (каскадно видаляє його рецепти) | Admin |

## Змінні середовища

Див. [.env.example](.env.example). Коротко:

| Змінна | Призначення |
|---|---|
| `PORT` | Порт сервера (за замовчуванням 3000) |
| `MONGODB_URI` | Рядок підключення MongoDB Atlas — **обов'язково з назвою бази** в шляху (`.../home-recipes?...`), інакше драйвер мовчки піде в базу `test` |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` | Секрети для підпису токенів |
| `JWT_ACCESS_TTL_SECONDS`, `JWT_REFRESH_TTL_SECONDS` | Час життя токенів у секундах (опційно, є дефолти) |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Завантаження зображень |
| `CORS_ORIGIN` | Дозволені origin через кому, напр. `http://localhost:5173,https://home-recipes-front.vercel.app` (лише схема+хост, без шляху типу `/uk`) |
| `EMAIL_FROM`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` | SMTP для листів підтвердження. Порт 587 деякі провайдери/роутери блокують — якщо лист не йде, спробуйте `465`. Найпростіший робочий варіант для розробки — Gmail з [App Password](https://myaccount.google.com/apppasswords) |
| `REQUIRE_EMAIL_VERIFICATION` | `true` — логін заблоковано без підтвердження email |
| `APP_URL` | URL **фронтенду** — використовується в посиланні листа підтвердження. Локально `http://localhost:5173`, на проді — `https://home-recipes-front.vercel.app` |

## Деплой на Render

1. **New → Web Service**, підключити цей репозиторій.
2. **Build Command**:

   ```
   npm install && npm run build
   ```

   (просто `npm install` **недостатньо** — проєкт на TypeScript, без кроку `build`
   не з'явиться `dist/`, і `npm start` впаде з `Cannot find module '.../dist/index.js'`)
3. **Start Command**:

   ```
   npm start
   ```
4. У **Environment** додати всі змінні з `.env.example` (значення з локального
   `.env` — Render не читає `.env`-файл із репозиторію, він у `.gitignore`).
5. У MongoDB Atlas → **Network Access** дозволити підключення з будь-якого IP
   (`0.0.0.0/0`) — Render на безкоштовному плані не має статичних вихідних IP.
6. Після першого успішного деплою можна одноразово прогнати `npm run seed`
   локально проти продакшн-`MONGODB_URI`, щоб наповнити категорії/інгредієнти.
7. **Регіон**: при створенні Web Service на Render та кластера в MongoDB Atlas
   обирайте однаковий (або географічно найближчий) регіон — напр. Render `Frankfurt`
   і Atlas AWS `eu-central-1`. Якщо вони в різних частинах світу, кожен запит до
   БД додатково платить мережевою затримкою (50–150+ мс) поверх часу самого запиту.

## Продуктивність

### "Холодний старт" на Render free tier

Безкоштовний Web Service на Render засинає після ~15 хв без запитів і "прокидається"
10–50+ секунд на перший запит після простою — перший відвідувач після паузи чекає
довго. Рішення (обрати одне):

- **Keep-alive пінг** (безкоштовно): зовнішній сервіс на кшталт
  [cron-job.org](https://cron-job.org) б'є `GET /health` кожні 10–14 хвилин —
  цього достатньо, щоб Render не вважав сервіс неактивним, і він не засинає.
  `/health` навмисно не звертається до БД (`src/app.ts`), щоб відповідати миттєво
  навіть у прикордонному стані.
- **Платний тариф Render** — прибирає сон повністю, найнадійніший варіант для
  продакшену з реальними користувачами.

### Інші оптимізації в цьому репозиторії

- **gzip-компресія** відповідей (`compression`, з Задачі 1).
- **Індекси Mongoose**: `Recipe` — складений `{ group: 1, category: 1 }` (під
  фільтри списку) + текстовий на `title`; `Category` — `{ group: 1 }`;
  `User.email` — унікальний (створюється автоматично з `unique: true`).
- **Ліміт `perPage`** у списках (`/api/recipes`, `/api/recipes/own`,
  `/api/admin/users`) — максимум 50, щоб не можна було одним запитом
  витягнути всю колекцію.
- **`.lean()`** на read-only запитах (списки, `GET /:id`, `authenticate`
  middleware) — Mongoose повертає прості об'єкти замість повноцінних документів,
  швидше і менше пам'яті. Запити, які потім `.save()`-яться або де явно
  вибирається `password` для відповіді клієнту, свідомо залишені без `.lean()`
  (коментарі в коді пояснюють чому — зокрема, `.lean()` обходить
  `toJSON`-трансформацію, яка приховує `password`).
- **Cache-Control** (`public, max-age=60`) на `GET /api/categories` і
  `GET /api/ingredients` — ці колекції адмін змінює рідко.

## Security checklist

Стан на після аудиту безпеки бекенду (див. нижче список перевіреного/виправленого).

- [x] **IDOR / контроль доступу** — `PATCH`/`DELETE /api/recipes/:id` перевіряють
  `owner === req.user.id || role === 'admin'` ([recipe.service.ts](src/services/recipe.service.ts));
  `/api/recipes/own`, `/api/recipes/favorites` беруть користувача лише з токена
  (`req.user!.id`), не з параметрів запиту; усі `/api/admin/*` проходять і
  `authenticate`, і `isAdmin` ([admin.routes.ts](src/routes/admin.routes.ts));
  `PATCH /api/users/me` приймає лише `{ name }` — `role` не можна підвищити
  собі через цей ендпоінт (whitelist на рівні Joi-схеми й контролера).
- [x] **Токени** — access 15 хв / refresh 30 днів, окремі секрети
  ([jwt.ts](src/utils/jwt.ts)); паролі — bcrypt, 10 salt rounds; `password`/
  `verificationToken` ніколи не серіалізуються клієнту (`select: false` +
  `toJSON`-transform, [user.ts](src/models/user.ts)); refresh token одноразовий —
  сесія видаляється при рефреші, видається нова пара ([session.service.ts](src/services/session.service.ts));
  `express-rate-limit` на всіх `/api/auth/*` (30 запитів/15 хв на IP).
- [x] **Валідація вхідних даних** — Joi зі `stripUnknown: true` на кожному
  POST/PATCH; `express-mongo-sanitize` прибирає `$`/`.`-ключі з
  body/query/params (захист від NoSQL-ін'єкцій); `isValidId` на всіх `:id`
  route-параметрах; глобальний обробник помилок конвертує Mongoose
  `CastError` (невалідний ObjectId у query-фільтрах на кшталт `?category=`)
  у чистий `400 INVALID_ID` замість `500`; пошукові `$regex`-запити
  (`recipes?search=`, `ingredients?search=`, `admin/users?search=`)
  екранують спецсимволи ([escapeRegex.ts](src/utils/escapeRegex.ts)) — захист
  від ReDoS через довільний regex-патерн від клієнта.
- [x] **Файли (Multer + Cloudinary)** — ліміт 5 МБ, білий список mimetype
  (jpeg/png/webp) на бекенді ([imageUpload.ts](src/middlewares/imageUpload.ts));
  завантаження йде через автентифікований Cloudinary SDK (не unsigned preset),
  Cloudinary додатково відхиляє вміст, що не є валідним зображенням.
- [x] **Загальний захист** — `helmet()` (усуває і `X-Powered-By`); CORS —
  явний allowlist з `CORS_ORIGIN`, без `origin: "*"`, зі `credentials: true`;
  `.env`/`atlas-credentials.env` у `.gitignore` й ніколи не потрапляли в git-історію;
  обробник помилок у production не повертає stack trace чи внутрішній
  текст помилки клієнту — тільки `status`/`errorCode`/дженерик-`message`,
  повна помилка йде в `console.error` для логів; `npm audit` — 0 вразливостей
  на момент аудиту.

**Відомий компроміс:** access/refresh токени повертаються в тілі відповіді
`/api/auth/login` і `/api/auth/refresh`, а не в `httpOnly`-cookie — фронтенд
(Vercel) і бекенд (Render) на різних доменах, тому cookie-based refresh
вимагав би додаткової інфраструктурної роботи (спільний домен або коректний
`SameSite=None; Secure` + CORS `credentials`). Задокументовано тут навмисно,
щоб рішення приймалось явно, а не за замовчуванням.
