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
- `npm run lint` — перевірка коду ESLint
- `npm run lint:fix` — автоматичне виправлення
- `npm run format` — форматування Prettier

## Структура проєкту

```
src/
├── controllers/   # тонкі контролери: req → service → response
├── db/            # підключення до MongoDB, seed-скрипт
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
| POST | `/api/auth/refresh` | Оновлення пари токенів | Public |
| POST | `/api/auth/logout` | Видалення поточної сесії | Private |

### Users

| Method | Endpoint | Description | Access |
|---|---|---|---|
| GET | `/api/users/me` | Поточний користувач | Private |
| PATCH | `/api/users/me` | Оновити ім'я | Private |
| PATCH | `/api/users/me/avatar` | Замінити аватар (Multer + Cloudinary) | Private |

### Categories

| Method | Endpoint | Description | Access |
|---|---|---|---|
| GET | `/api/categories` | Список категорій, фільтр `?group=` | Public |
| POST | `/api/categories` | Створити категорію | Admin |
| PATCH | `/api/categories/:id` | Оновити категорію | Admin |
| DELETE | `/api/categories/:id` | Видалити (409, якщо є рецепти) | Admin |

### Ingredients

| Method | Endpoint | Description | Access |
|---|---|---|---|
| GET | `/api/ingredients` | Список інгредієнтів, пошук `?search=` | Public |
| POST | `/api/ingredients` | Створити інгредієнт | Admin |
| PATCH | `/api/ingredients/:id` | Оновити інгредієнт | Admin |
| DELETE | `/api/ingredients/:id` | Видалити (409, якщо є рецепти) | Admin |

### Recipes

| Method | Endpoint | Description | Access |
|---|---|---|---|
| GET | `/api/recipes` | Список з фільтрами (`group`, `category`, `ingredient`, `search`) і пагінацією | Public |
| GET | `/api/recipes/own` | Власні рецепти, з пагінацією | Private |
| GET | `/api/recipes/favorites` | Обрані рецепти | Private |
| POST | `/api/recipes/favorites/:id` | Додати в обране | Private |
| DELETE | `/api/recipes/favorites/:id` | Прибрати з обраного | Private |
| GET | `/api/recipes/:id` | Деталі рецепта (populate category/ingredients/owner.name) | Public |
| POST | `/api/recipes` | Створити рецепт | Private |
| PATCH | `/api/recipes/:id` | Оновити рецепт | Owner/Admin |
| DELETE | `/api/recipes/:id` | Видалити рецепт | Owner/Admin |

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
| `CORS_ORIGIN` | Дозволені origin через кому |
| `EMAIL_FROM`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` | SMTP для листів підтвердження. Порт 587 деякі провайдери/роутери блокують — якщо лист не йде, спробуйте `465`. Найпростіший робочий варіант для розробки — Gmail з [App Password](https://myaccount.google.com/apppasswords) |
| `REQUIRE_EMAIL_VERIFICATION` | `true` — логін заблоковано без підтвердження email |
| `APP_URL` | URL **фронтенду** — використовується в посиланні листа підтвердження |

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
