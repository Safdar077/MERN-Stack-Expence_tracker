# Design Specification: Full-Stack MERN Expense Tracker Web App

- **Date**: 2026-11-19
- **Status**: Final (Reviewed & Aligned with User Feedback)
- **Target Audience**: Internship Project Evaluators & End Users
- **Primary Objectives**: Deliver a secure, responsive, full-stack personal finance web application with zero boilerplate confusion, strict multi-tenant isolation, rich analytics, recurring transaction alerts, budget threshold alerts, and complete test coverage.

---

## 1. Intent & Purpose

The objective of this project is to build an intuitive, robust, and production-ready Expense Management Web Application. It empowers individuals to track income and expenditures across multiple accounts/wallets (including a dedicated Savings pool), manage overall and category-specific budgets with proactive notifications, visualize spending habits through interactive charts, set savings goals, and receive in-app notifications for recurring due expenses.

The code must be production-grade, secure, and clean, while remaining thoroughly documented with beginner-friendly inline comments so any developer or evaluator can understand the architectural decisions and logic flows effortlessly.

---

## 2. Goals, Non-Goals & Anti-Goals

### 2.1 Goals
- **Full MERN Stack**: MongoDB (Mongoose), Express.js, React (Vite), and Node.js.
- **Strict Data Isolation**: User A cannot read, update, or delete any record belonging to User B, even by guessing ObjectIDs or manipulating API queries.
- **Intuitive UI/UX**: Mobile-first, responsive interface styled with Tailwind CSS and `react-icons`, featuring clear loading spinners, empty states, and descriptive error messages.
- **State Management via Pure Custom Hooks & Native Event Listeners**: Modular React custom hooks leveraging `useState`, `useEffect`, and native browser `window.addEventListener` / `window.dispatchEvent` (CustomEvent) for zero-boilerplate cross-component reactivity without Redux or Context API.
- **Independent Account & Savings Tracking**: Every transaction requires selecting the source Account/Wallet (Cash, Bank Account, Credit Card, Wallet, or Savings). An expense paid from "Savings" will strictly deduct from the Savings balance, ensuring primary wallet funds remain untouched.
- **Recurring Transactions & Notification Center**: Date-driven due date tracking using native JavaScript `Date` functions. When an expense is due, an in-app notification badge and alert panel notify the user with a 1-click "Mark as Paid" action to log the transaction.
- **Overall & Per-Category Budget Notifications**: Milestone alerts (50%, 75%, 90%, 100%, 100%+) shown on visual progress bars and dispatched to the In-App Notification Center when limits are approached or breached.
- **Robust Analytics**: Dynamic, calculated-on-the-fly financial insights (Net Savings, Category Breakdown Donut, Spending Trends Bar/Line across Week/Month/3 Months/Year) computed from real stored transactions.
- **Multi-Filter & Pagination**: Paginated transaction history table with combinable filters (Type, Category, Account, Date range, Amount range), search bar, and CSV export.
- **Zod Validation & Centralized Security**: Strict payload schema validation on all API write routes with Zod, rate limiting on authentication routes, NoSQL injection prevention, and CORS control.
- **Comprehensive Testing**: Automated backend unit/integration tests with Jest & Supertest, plus frontend component tests with React Testing Library.

### 2.2 Non-Goals
- Real-time WebSockets (In-app notification system running on API access / page load meets all requirements cleanly without persistent socket connection overhead).
- Third-party bank sync (e.g., Plaid API integration) — manual account/wallet entry is used.
- Multi-currency conversion via live exchange rate APIs (a unified default currency, e.g., USD `$`, is used across all accounts).

### 2.3 Anti-Goals
- **No Mock / In-Memory Data**: All data must persist in MongoDB.
- **No Hardcoded Analytics**: All charts and figures must be aggregated from live database transactions.
- **No Hardcoded Secrets**: Secrets (JWT secret, DB connection strings, port numbers) must never be committed to Git.
- **No Unprotected Routes**: Protected endpoints must enforce authentication on the backend, not rely merely on client-side route hiding.

---

## 3. Technology Stack & Key Decisions

| Layer | Technology | Decision Rationale |
| :--- | :--- | :--- |
| **Frontend Framework** | React 18+ (Vite) | Lightning-fast development server and optimized production bundling. |
| **Styling** | Tailwind CSS | Utility-first, mobile-friendly responsive design without bloated CSS files. |
| **Icons** | `react-icons` (`Fa*`, `Md*`, `Hi*`) | User-preferred, highly recognizable icons for categories, wallets, and actions. |
| **State Management** | Pure Custom Hooks (`useState`, `useEffect`) + Native `addEventListener` | User requirement: Zero Redux, zero Context API. Uses native custom browser events (`window.dispatchEvent` / `window.addEventListener`) to notify components when transactions or balances update. |
| **Charts** | Recharts | Composable SVG-based chart library for responsive pie, bar, and area charts. |
| **Backend Runtime** | Node.js + Express.js | Standard MVC architecture (`models/`, `controllers/`, `routes/`, `middleware/`). |
| **Database & ODM** | MongoDB + Mongoose | Schema-backed document storage with validation, indexing, and cascade handling. |
| **API Validation** | Zod | Fast, TypeScript/JavaScript runtime schema validation for incoming request bodies/queries. |
| **Security** | `bcryptjs`, `jsonwebtoken`, `express-rate-limit`, `helmet`, `cors` | Password hashing (salt rounds: 10), stateless JWT tokens, brute-force protection on auth endpoints. |
| **Testing** | Jest + Supertest (Backend), Vitest + React Testing Library (Frontend) | Reliable testing suite for critical paths (Auth, CRUD, Isolation, Forms). |

---

## 4. Architectural Design & Folder Structure

```
expense-tracker/
├── package.json               # Root scripts (install both, dev, test)
├── README.md                  # Comprehensive setup, API documentation & architecture
├── .gitignore
├── server/                    # Node.js + Express Backend
│   ├── package.json
│   ├── .env.example
│   ├── src/
│   │   ├── config/            # DB connection, environment variables
│   │   │   └── db.js
│   │   ├── models/            # Mongoose schemas
│   │   │   ├── User.js
│   │   │   ├── Account.js
│   │   │   ├── Category.js
│   │   │   ├── Transaction.js
│   │   │   ├── Budget.js
│   │   │   ├── SavingsGoal.js
│   │   │   └── RecurringRule.js
│   │   ├── controllers/       # Business logic controllers
│   │   │   ├── authController.js
│   │   │   ├── accountController.js
│   │   │   ├── categoryController.js
│   │   │   ├── transactionController.js
│   │   │   ├── budgetController.js
│   │   │   ├── goalController.js
│   │   │   ├── recurringController.js
│   │   │   └── analyticsController.js
│   │   ├── routes/            # Express route definitions
│   │   │   ├── authRoutes.js
│   │   │   ├── accountRoutes.js
│   │   │   ├── categoryRoutes.js
│   │   │   ├── transactionRoutes.js
│   │   │   ├── budgetRoutes.js
│   │   │   ├── goalRoutes.js
│   │   │   ├── recurringRoutes.js
│   │   │   └── analyticsRoutes.js
│   │   ├── middleware/        # Auth verification, error handling, rate limits
│   │   │   ├── authMiddleware.js
│   │   │   ├── validateMiddleware.js
│   │   │   └── errorMiddleware.js
│   │   ├── validators/        # Zod validation schemas
│   │   │   ├── authValidator.js
│   │   │   ├── transactionValidator.js
│   │   │   ├── accountValidator.js
│   │   │   ├── budgetValidator.js
│   │   │   └── goalValidator.js
│   │   ├── utils/             # Helper utilities (date formatting, CSV generator)
│   │   ├── app.js             # Express app configuration
│   │   └── server.js          # Server entry point
│   └── tests/                 # Jest + Supertest test suites
│       ├── auth.test.js
│       ├── transactions.test.js
│       └── isolation.test.js
│
└── client/                    # React (Vite) Frontend
    ├── package.json
    ├── vite.config.js
    ├── tailwind.config.js
    ├── src/
    │   ├── api/               # Axios client with request/response interceptors
    │   │   └── axiosClient.js
    │   ├── utils/             # Native event dispatcher helper
    │   │   └── eventBus.js    # dispatches 'app:sync' via window.dispatchEvent
    │   ├── hooks/             # Custom state management hooks
    │   │   ├── useAuth.js
    │   │   ├── useTransactions.js
    │   │   ├── useAccounts.js
    │   │   ├── useBudgets.js
    │   │   ├── useGoals.js
    │   │   ├── useRecurring.js
    │   │   ├── useNotifications.js
    │   │   └── useAnalytics.js
    │   ├── components/        # Reusable UI components
    │   │   ├── layout/        # Navbar, Sidebar, Footer, NotificationBell
    │   │   ├── common/        # Button, Modal, Card, LoadingSpinner, EmptyState
    │   │   ├── transactions/  # TransactionTable, FilterBar, TransactionModal
    │   │   ├── accounts/      # AccountCard, AddAccountModal
    │   │   ├── budgets/       # BudgetProgressBar, BudgetModal
    │   │   ├── goals/         # GoalCard, AddGoalModal, ContributeGoalModal
    │   │   └── charts/        # IncomeExpenseChart, CategoryPieChart, TrendBarChart
    │   ├── pages/             # Route views
    │   │   ├── LoginPage.jsx
    │   │   ├── RegisterPage.jsx
    │   │   ├── DashboardPage.jsx
    │   │   ├── TransactionsPage.jsx
    │   │   ├── AccountsPage.jsx
    │   │   ├── BudgetsPage.jsx
    │   │   ├── GoalsPage.jsx
    │   │   └── AnalyticsPage.jsx
    │   ├── App.jsx            # Routing and protected route guards
    │   └── main.jsx
    └── tests/                 # React Testing Library test suites
        ├── LoginForm.test.jsx
        ├── TransactionForm.test.jsx
        └── TransactionList.test.jsx
```

---

## 5. Database Schema Specifications

### 5.1 User Schema (`users`)
- `_id`: ObjectId
- `name`: String (required, trimmed)
- `email`: String (required, unique, lowercase, trimmed)
- `password`: String (required, hashed via bcrypt)
- `currency`: String (default: `"USD"`)
- `createdAt`, `updatedAt`: Timestamps

### 5.2 Account / Wallet Schema (`accounts`)
- `_id`: ObjectId
- `userId`: ObjectId (ref: `'User'`, required, indexed)
- `name`: String (e.g. "Main Bank", "Cash Pocket", "Credit Card", "Emergency Savings")
- `type`: Enum `["Cash", "Bank Account", "Credit Card", "Wallet", "Savings"]`
- `balance`: Number (current balance, default: 0)
- `isDefault`: Boolean (default: false)
- `createdAt`, `updatedAt`: Timestamps

### 5.3 Category Schema (`categories`)
- `_id`: ObjectId
- `userId`: ObjectId (ref: `'User'`, null for default global categories, indexed)
- `name`: String (e.g., "Food", "Salary")
- `type`: Enum `["Income", "Expense"]`
- `icon`: String (icon identifier name for `react-icons`)
- `isCustom`: Boolean (default: false)

*Default Expense Categories*: Food, Travel, Shopping, Bills, Rent, Entertainment, Health, Education, Subscription, Other.  
*Default Income Categories*: Salary, Freelance, Business, Investment, Gift, Other.

### 5.4 Transaction Schema (`transactions`)
- `_id`: ObjectId
- `userId`: ObjectId (ref: `'User'`, required, indexed)
- `accountId`: ObjectId (ref: `'Account'`, required, indexed) — **User explicitly chooses whether this comes from Wallet, Bank, or Savings**
- `categoryId`: ObjectId (ref: `'Category'`, required, indexed)
- `type`: Enum `["Income", "Expense"]` (required, indexed)
- `amount`: Number (required, positive, minimum 0.01)
- `date`: Date (required, default: `Date.now`, indexed)
- `note`: String (optional, trimmed)
- `attachmentUrl`: String (optional, text/URL placeholder)
- `isRecurring`: Boolean (default: false)
- `recurringRuleId`: ObjectId (ref: `'RecurringRule'`, optional)
- `createdAt`, `updatedAt`: Timestamps

*Indexing Strategy*: `{ userId: 1, date: -1 }`, `{ userId: 1, type: 1 }`, `{ userId: 1, accountId: 1 }`.

### 5.5 Budget Schema (`budgets`)
- `_id`: ObjectId
- `userId`: ObjectId (ref: `'User'`, required, indexed)
- `month`: Number (1–12, required)
- `year`: Number (e.g. 2026, required)
- `overallAmount`: Number (overall monthly limit, required)
- `categoryLimits`: Array of objects:
  - `categoryId`: ObjectId (ref: `'Category'`)
  - `amount`: Number (limit for this specific category)
- `createdAt`, `updatedAt`: Timestamps

### 5.6 Recurring Rule Schema (`recurring_rules`)
- `_id`: ObjectId
- `userId`: ObjectId (ref: `'User'`, required, indexed)
- `title`: String (e.g., "Monthly Apartment Rent")
- `amount`: Number (required)
- `type`: Enum `["Income", "Expense"]`
- `categoryId`: ObjectId (ref: `'Category'`, required)
- `accountId`: ObjectId (ref: `'Account'`, required)
- `frequency`: Enum `["Daily", "Weekly", "Monthly", "Yearly"]`
- `dueDay`: Number (1–31 for monthly recurrence)
- `nextDueDate`: Date (calculated next execution date)
- `isActive`: Boolean (default: true)
- `createdAt`, `updatedAt`: Timestamps

### 5.7 Savings Goal Schema (`savings_goals`)
- `_id`: ObjectId
- `userId`: ObjectId (ref: `'User'`, required, indexed)
- `title`: String (e.g. "New Laptop", "Emergency Fund")
- `targetAmount`: Number (required)
- `currentAmount`: Number (default: 0)
- `targetDate`: Date (required)
- `linkedAccountId`: ObjectId (ref: `'Account'`, optional, default to a Savings account)
- `isCompleted`: Boolean (default: false)
- `createdAt`, `updatedAt`: Timestamps

---

## 6. Business Logic & Feature Specifications

### 6.1 Authentication & Multi-Tenant Data Isolation
- **Registration**: Validates email format with Zod, checks for duplicates, hashes password using `bcryptjs.hash(password, 10)`, and automatically seeds default accounts ("Cash", "Main Bank", "Savings") for the new user.
- **Login**: Validates credentials and returns a signed JWT containing `{ id: user._id }` with a 7-day expiration.
- **Route Protection**: `authMiddleware.js` verifies the bearer token from the `Authorization` header, extracts `req.user`, and verifies active status.
- **Query Sandboxing**: Every single database query in every controller strictly includes `{ userId: req.user._id }`. Even if a malicious user passes another user's transaction ID in `PUT /api/transactions/:id`, the query returns 404, preventing cross-tenant leakage.

### 6.2 Transaction Balance Updates & Account Segregation
- When a transaction is created:
  - The user explicitly chooses which `Account` (e.g. Cash, Wallet, Bank, or Savings) funds the transaction.
  - If `Expense`: Decrement that chosen account's balance by `amount`.
  - If `Income`: Increment that chosen account's balance by `amount`.
- If an expense is paid from the **Savings** account, only the Savings account balance decreases; the Cash/Wallet balance remains completely unaffected.

### 6.3 Live Component Synchronization via Native `addEventListener`
- To maintain reactive, real-time synchronization across sibling components without Redux or Context API:
  - A clean helper `src/utils/eventBus.js` exposes:
    ```javascript
    export const emitSync = (type) => window.dispatchEvent(new CustomEvent('app:sync', { detail: { type } }));
    export const onSync = (callback) => {
      const handler = (e) => callback(e.detail);
      window.addEventListener('app:sync', handler);
      return () => window.removeEventListener('app:sync', handler);
    };
    ```
  - When a transaction is added, updated, or marked as paid, `emitSync('transactions')` is called.
  - Custom hooks (`useAccounts`, `useTransactions`, `useBudgets`, `useNotifications`) subscribe via `useEffect` with `onSync`, automatically re-fetching and updating local state seamlessly.

### 6.4 Due Date Tracking & In-App Notification Center
- **Tracking Mechanism**: The backend compares current date `new Date()` with `RecurringRule.nextDueDate`.
- **In-App Bell Indicator**:
  - The notification bell displays the count of items where `nextDueDate <= today` or due within the next 48 hours.
  - Clicking the bell opens a panel listing due items with their name, amount, category, and due date.
- **Action**: Clicking **"Mark as Paid"**:
  1. Creates an actual transaction record for that account and category.
  2. Updates the `nextDueDate` of the recurring rule to the next cycle (e.g., adding 1 month using JavaScript `Date.setMonth(date.getMonth() + 1)`).
  3. Updates account balance immediately, triggers `emitSync()`, and removes the active alert badge.

### 6.5 Overall & Per-Category Budget Warnings
- **Calculation**: Monthly spending is aggregated:
  - Overall: `totalExpense = sum(all transactions in current month and year)`.
  - Per-Category: `categoryExpense = sum(transactions for specific category in current month)`.
- **Warning Triggers & Notifications**:
  - `50%`: Informational badge & notification ("You have reached 50% of your budget").
  - `90%`: High alert badge & notification ("Warning: You have used 90% of your budget").
  - `100%`: Limit reached alert ("You have reached 100% of your budget").
  - `> 100%`: Critical over-budget alert ("Budget exceeded by $X!").
- These warnings appear directly in the `BudgetProgressBar` on the Dashboard and Budgets page, and are pushed into the In-App Notification dropdown.

### 6.6 Analytics & Chart Aggregations
- Endpoints compute dynamic metrics using MongoDB Aggregation Pipelines or indexed date ranges:
  - **Net Savings**: `Total Income - Total Expenses`.
  - **Category Breakdown**: Group by `category` and sum `amount` for Donut/Pie charts.
  - **Spending Trends**: Group by Day/Week/Month according to selected timeframe (`Week`, `Month`, `3 Months`, `Year`).

### 6.7 CSV Export
- GET `/api/transactions/export?type=...&category=...&startDate=...&endDate=...`
- Reads filtered transactions and returns CSV with standard headers: `Date,Type,Category,Account,Amount,Note`.

---

## 7. Testing Strategy

1. **Backend Testing (Jest + Supertest)**:
   - `auth.test.js`: Register, login with invalid/valid passwords, token verification.
   - `transactions.test.js`: Create, read, update, delete transaction, balance consistency.
   - `isolation.test.js`: Create two users (User A and User B). Assert that User B receives a 404 when attempting to read, update, or delete User A's transaction.
2. **Frontend Testing (React Testing Library)**:
   - `LoginForm.test.jsx`: Renders email/password inputs, validates empty inputs, submits form.
   - `TransactionModal.test.jsx`: Renders all fields (Amount, Type, Category, Account), validates amount > 0.
   - `TransactionTable.test.jsx`: Renders transactions list, empty state when no items match filters.

---

## 8. Deployment Plan

- **Backend**: Render or Railway with production environment variables (`PORT`, `MONGO_URI`, `JWT_SECRET`, `CLIENT_URL`).
- **Frontend**: Vercel or Netlify configured with `VITE_API_URL` pointing to the deployed backend URL.
- **Database**: MongoDB Atlas free M0 cluster with Network Access configured (allow access from anywhere `0.0.0.0/0` for cloud deployment).
- **Documentation**: Comprehensive `README.md` containing architecture diagram, setup instructions, complete API endpoint list, environment variables guide, and testing commands.
