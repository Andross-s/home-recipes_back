# Home Recipes — Backend

REST API для pet-проєкту **Home Recipes** — сайту з рецептами та консервацією.

## Стек

- **Node.js** + **Express**
- **TypeScript** (strict mode)
- **MongoDB** + **Mongoose**
- **Joi** — валідація тіла запитів
- **JWT** (access + refresh токени, сесії в БД) — авторизація
- **Multer** + **Cloudinary** — завантаження зображень
- **Nodemailer / Resend** — листи (підтвердження email)
- **Swagger UI Express** — документація API
- Деплой — **Render** (Web Service)

## Формат помилок

API не локалізує повідомлення для користувача. Помилки повертаються у вигляді:

```json
{
  "status": 400,
  "errorCode": "EMAIL_ALREADY_EXISTS",
  "message": "User with this email already exists"
}
```

`errorCode` — стабільний машинний код, за яким фронтенд підбирає локалізований текст.
`message` — англійський опис, призначений для логів і Swagger, не для показу користувачу.

## Запуск проєкту

1. Встановити залежності:

   ```bash
   npm install
   ```

2. Скопіювати `.env.example` у `.env` і заповнити значення:

   ```bash
   cp .env.example .env
   ```

3. Запустити у режимі розробки (автоперезапуск через `tsx watch`):

   ```bash
   npm run dev
   ```

4. Зібрати production-версію та запустити:

   ```bash
   npm run build
   npm start
   ```

## Інші команди

- `npm run lint` — перевірка коду ESLint
- `npm run lint:fix` — автоматичне виправлення
- `npm run format` — форматування Prettier

## Структура проєкту

```
src/
├── controllers/   # тонкі контролери: req → service → response
├── db/            # підключення до MongoDB
├── middlewares/   # валідація (Joi), авторизація, обробка помилок
├── models/        # Mongoose-моделі
├── routes/        # Express-роутери
├── services/      # бізнес-логіка та звернення до БД
├── types/         # спільні TypeScript-типи (напр. розширення Express.Request)
├── utils/         # допоміжні утиліти (HttpError тощо)
├── app.ts         # конфігурація Express-застосунку
└── index.ts       # точка входу, підключення до БД, запуск сервера
```

## Змінні середовища

Див. [.env.example](.env.example) — усі змінні, необхідні для запуску (порт, MongoDB,
JWT-секрети, Cloudinary, CORS origin, налаштування пошти, URL застосунку для листів).
