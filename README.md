# MerchantHub

MerchantHub is a learning project: a merchant-facing payment management dashboard built with **HTML, CSS, vanilla JavaScript, Node.js, Express and PostgreSQL**.

It demonstrates authentication, REST APIs, relational data modelling, payment state transitions, refunds, database transactions, idempotency keys, analytics and CSV export.

> **Important:** This is a simulation only. It does not connect to banks, card networks or a real payment processor. Never enter real card details or use it to handle real money.

## Features

- Merchant registration and login (bcrypt password hashing, JWT sessions)
- Merchant-specific dashboard and payment records
- Create payment requests and share demo checkout links
- Simulate successful and failed payments (no card details collected)
- Search, status filtering, pagination and CSV export
- Full and partial refunds with validation
- Revenue and transaction analytics
- Idempotency key on payment creation
- PostgreSQL transactions and row locking during checkout/refunds
- Parameterized SQL queries and basic rate limiting

## Requirements

- Node.js 18+
- PostgreSQL 14+
- npm

## Setup (Windows)

### 1. Create the database

Open pgAdmin or SQL Shell (psql), then create a database named `merchanthub`.

In psql:

```sql
CREATE DATABASE merchanthub;
```

### 2. Configure environment variables

In the project root, copy `.env.example` to `.env`.

Update `DATABASE_URL` with your PostgreSQL username and password. Replace `JWT_SECRET` with a long random secret.

Example:

```env
PORT=3000
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/merchanthub
JWT_SECRET=use_a_long_random_secret_here
NODE_ENV=development
```

### 3. Install dependencies

Open a terminal in the MerchantHub folder:

```bash
npm install
```

### 4. Create database tables

Run:

```bash
psql -U postgres -d merchanthub -f database/schema.sql
```

If `psql` is not recognized, open pgAdmin, select the `merchanthub` database, open Query Tool, and run the contents of `database/schema.sql`.

### 5. Start the application

```bash
npm start
```

Open:

http://localhost:3000

The health endpoint is:

http://localhost:3000/api/health

## Suggested demo flow

1. Register a merchant account.
2. Create a payment request for a test customer and amount.
3. Copy/open the generated demo checkout link.
4. Click **Simulate successful payment**.
5. Return to the merchant dashboard and see the payment status/revenue update.
6. Open Payments and issue a partial or full refund.
7. Check Refunds and Analytics.
8. Export the payment list as CSV.

To test a failed payment, create another payment request and choose **Simulate failed payment** on its checkout page.

## API overview

All `/api` routes except registration, login, health and the public checkout endpoints require:

`Authorization: Bearer <JWT>`

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/auth/register` | Register merchant |
| POST | `/api/auth/login` | Login |
| GET | `/api/me` | Current merchant |
| POST | `/api/payments` | Create payment request |
| GET | `/api/payments` | List/search/filter payments |
| GET | `/api/payments/:code` | Payment details |
| GET | `/api/public/checkout/:code` | Public demo checkout details |
| POST | `/api/public/checkout/:code/pay` | Simulate payment result |
| POST | `/api/payments/:code/refunds` | Create full/partial refund |
| GET | `/api/refunds` | List refunds |
| GET | `/api/analytics` | Dashboard metrics |
| GET | `/api/export/payments.csv` | Download CSV |

### Create payment example

```json
{
  "customerName": "Aarav Sharma",
  "customerEmail": "aarav@example.com",
  "description": "Website design invoice",
  "amount": 2500,
  "idempotencyKey": "invoice-104-payment"
}
```

The amount is accepted in rupees at the API boundary and stored as an integer number of paise. The idempotency key is unique per merchant.

## Database design

- `merchants`: merchant account and password hash
- `payments`: payment requests, customer details, amount and status
- `refunds`: refund records linked to payment and merchant

Amounts are stored as integer paise to avoid floating-point currency errors.

The demo checkout locks a payment row with `SELECT ... FOR UPDATE` and only transitions a `PENDING` payment once. Refund processing also locks the payment row, checks the remaining refundable amount, inserts the refund and updates payment status within one database transaction.

## Current limitations / next improvements

This is a portfolio MVP, not production payment infrastructure. Before any real-world deployment, it would need a real payment provider integration, webhook signature verification, CSRF/origin protections appropriate to the chosen auth design, stronger session/token lifecycle management, audit logging, automated tests, migrations, secrets management, monitoring and a security review.

Potential portfolio extensions:
- Unit and integration tests (Jest or Vitest + Supertest)
- Payment provider sandbox integration (never handle raw card data)
- Webhook simulator and signature verification
- Role-based staff accounts
- Downloadable invoices
- Docker Compose for reproducible setup

## Project structure

```text
MerchantHub/
├── database/
│   └── schema.sql
├── public/
│   ├── app.js
│   ├── checkout.html
│   ├── checkout.js
│   ├── index.html
│   └── style.css
├── src/
│   ├── middleware/
│   │   └── auth.js
│   ├── routes/
│   │   ├── analytics.js
│   │   ├── auth.js
│   │   └── payments.js
│   └── utils/
│       └── format.js
├── .env.example
├── .gitignore
├── package.json
└── server.js
```
