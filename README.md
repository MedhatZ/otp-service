# OTP Authentication System (Twilio Verify)

A production-ready OTP authentication system built with Node.js, Express, Twilio Verify, Redis, and PostgreSQL.

## 🚀 Features

* OTP authentication using Twilio Verify (SMS)
* Send OTP / Verify OTP / Resend OTP
* Automatic user creation (phone-based identity)
* JWT-based authentication (no passwords)
* Unified authentication for web and mobile apps
* PostgreSQL user storage (persistent)
* Redis rate limiting and resend cooldown
* Protected routes using JWT middleware
* Clean and structured API responses
* Production-ready error handling and logging

---

## 🧱 Tech Stack

* Node.js + Express
* Twilio Verify API
* PostgreSQL
* Redis
* JWT (jsonwebtoken)
* Joi (validation)
* Pino (logging)

---

## 📦 API Endpoints

### 🔐 OTP

#### Send OTP

POST `/api/otp/send`

```json
{
  "phoneNumber": "+201XXXXXXXXX"
}
```

---

#### Verify OTP (Login / Register)

POST `/api/otp/verify`

```json
{
  "phoneNumber": "+201XXXXXXXXX",
  "code": "123456"
}
```

Response:

```json
{
  "success": true,
  "message": "User authenticated",
  "data": {
    "token": "JWT_TOKEN",
    "user": {
      "id": "uuid",
      "phoneNumber": "+201XXXXXXXXX"
    }
  }
}
```

---

#### Resend OTP

POST `/api/otp/resend`

---

### 👤 Auth

#### Get Current User

GET `/api/me`

Headers:

```
Authorization: Bearer <JWT_TOKEN>
```

---

#### Logout (stateless)

POST `/api/logout`

---

## 🗄️ Database Schema

### Users Table

* id (UUID, primary key)
* phone_number (unique)
* created_at (timestamp)

---

## ⚙️ Environment Variables

Create a `.env` file:

```
PORT=3000

REDIS_HOST=127.0.0.1
REDIS_PORT=6380

DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=otp_db

TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
TWILIO_VERIFY_SERVICE_SID=your_verify_service_sid

JWT_SECRET=your_secret
JWT_EXPIRES_IN=7d
```

---

## ▶️ Run the Project

```bash
npm install
npm run dev
```

---

## 🧪 Testing

Use Postman or any API client:

1. Send OTP
2. Verify OTP → get JWT
3. Use JWT in `/api/me`

---

## 🔐 Security Notes

* No password system (phone-based authentication only)
* OTP handled securely by Twilio Verify (no local storage)
* Rate limiting via Redis
* JWT-based protected routes

---

## 📱 Use Case

This system supports:

* Mobile apps
* Web platforms
* Unified authentication (same user across all platforms)

---

## 📌 Status

✅ Production-ready (Milestone 1 completed)

---

## 👨‍💻 Author

Medhat Mohamed
