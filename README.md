# MerchantHub 💳

**A Full-Stack Merchant Payment Management Platform**

MerchantHub is a web-based payment management platform designed to help merchants create payment links, manage transactions, process refunds, and monitor revenue through a centralized dashboard.

The project demonstrates how a merchant-facing payment management system can be designed using a JavaScript frontend, Node.js backend, and PostgreSQL database.

> **Note:** This project currently uses simulated payments. It does not process real financial transactions or connect to the live PayPal payment gateway.

## ✨ Features

- **Merchant Authentication:** Register and securely log in to a merchant account.
- **Payment Link Generation:** Create payment links for specific amounts and descriptions.
- **Simulated Checkout:** Allow customers to complete a simulated payment through a public checkout page.
- **Transaction Management:** View and manage payment transactions.
- **Refund Management:** Support full and partial refunds.
- **Revenue Analytics:** Monitor payment activity and revenue through dashboard analytics.
- **CSV Export:** Export transaction information for reporting.
- **Idempotency:** Help prevent duplicate transaction processing.
- **Database Transactions:** Maintain consistency when performing important payment-related operations.

## 🛠️ Tech Stack

| Component | Technology |
|---|---|
| Frontend | HTML, CSS, JavaScript |
| Backend | Node.js, Express.js |
| Database | PostgreSQL |
| Database Management | pgAdmin |
| Authentication | JWT |
| Version Control | Git, GitHub |

## 🏗️ Project Structure

```text
MerchantHub/
│
├── database/       # Database schema
├── public/         # Frontend files
├── src/
│   ├── routes/     # API routes
│   └── ...         # Backend modules
│
├── server.js       # Application entry point
├── package.json    # Dependencies and scripts
├── .env.example    # Environment configuration template
├── .gitignore
└── README.md
```

## ⚙️ Installation and Setup

### Prerequisites

Make sure you have installed:

- Node.js and npm
- PostgreSQL
- pgAdmin (optional, for database management)
- Git

### 1. Clone the repository

```bash
git clone https://github.com/Gauri10s/MerchantHub.git
```

Navigate into the project:

```bash
cd MerchantHub
```

### 2. Install dependencies

```bash
npm install
```

### 3. Create the PostgreSQL database

Create a database named:

```sql
CREATE DATABASE merchanthub;
```

Open the `database` folder and execute the provided SQL schema in the `merchanthub` database using pgAdmin's Query Tool.

### 4. Configure environment variables

Create a `.env` file in the project root using `.env.example` as a template.

Configure the following variables:

```env
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/merchanthub
JWT_SECRET=your_long_random_secret
PORT=3000
```

Replace the placeholder values with your local configuration.

**Important:** Never upload your actual `.env` file or database credentials to GitHub.

### 5. Start the application

```bash
npm run dev
```

Open your browser and visit:

```text
http://localhost:3000
```

## 🔄 Application Workflow

1. A merchant registers and logs into MerchantHub.
2. The merchant creates a payment link with an amount and description.
3. A customer opens the generated public checkout link.
4. The customer completes the simulated checkout.
5. The transaction is recorded in PostgreSQL.
6. The merchant can view transaction details and revenue analytics.
7. The merchant can initiate full or partial refunds.

## 🔮 Future Improvements

- Integration with the PayPal Developer Sandbox.
- Webhook handling for payment status updates.
- Enhanced transaction reporting and filtering.
- Improved dashboard analytics.
- Automated backend and API testing.

## 👩‍💻 Author

**Gauri Singh**

B.Tech Computer Science and Engineering

[GitHub Profile](https://github.com/Gauri10s)

---

*Built as a full-stack software engineering project to explore merchant payment workflows, backend development, database management, and transaction processing.*