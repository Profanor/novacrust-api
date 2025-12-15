# Novacrust API Wallet Service

## Overview

This project implements a simple wallet service using **NestJS** and **Prisma**, supporting wallet creation, funding, transfers, withdrawals, and transaction history tracking.

The goal of this implementation is to demonstrate:
- Clear API structure
- Correct balance handling
- Meaningful error responses
- Safe retry handling via idempotency

The solution favors clarity and correctness over overengineering.

---

## Tech Stack

- **NestJS**
- **TypeScript**
- **Prisma ORM**
- **PostgreSQL** (can be replaced with SQLite or in-memory storage)
- **Redis** (optional, used to demonstrate idempotency handling)


---

## Features

### 1. Create Wallet
Creates a new wallet with:
- Currency (default: USD)
- Initial balance (default: 0)

---

### 2. Fund Wallet
- Adds a positive amount to a wallet balance
- Validates input
- Records a transaction entry
- Supports idempotency to prevent duplicate funding on retries

---

### 3. Transfer Between Wallets
- Transfers funds between two wallets
- Prevents negative balances
- Validates sender and recipient wallets
- Ensures currency consistency
- Records debit and credit ledger entries
- Supports idempotency

---

### 4. Withdraw Funds
- Deducts funds from a wallet
- Prevents overdrafts
- Records withdrawal transactions
- Supports idempotency to ensure safe retries

---

### 5. Fetch Wallet Details
- Returns wallet information
- Includes full transaction history

---

## Idempotency

Idempotency is implemented as an optional enhancement to demonstrate safe retry handling and is not required for core functionality.
- For demo convenience, the system auto-generates idempotency keys if not provided.

Each request includes an `idempotencyKey`:
- If the same request is retried with the same key, the cached response is returned
- Prevents duplicate balance mutations caused by network retries or client timeouts

Idempotency protects against duplicate requests, not against repeated user actions.
Users can perform the same operation multiple times as long as each request uses a new idempotency key.

---

## Error Handling

- Input validation errors return `400 Bad Request`
- Missing resources return `404 Not Found`
- Unexpected failures return `500 Internal Server Error`
- Prisma errors are mapped to appropriate HTTP responses
- Error handling is centralized for consistency across operations

---

## Setup Instructions

Clone the repository:

```bash
git clone <repository-url>
cd wallet-service
npm install
```

### Assumptions

- Wallets are standalone entities (no user model included)

- Currency conversion is out of scope

- Idempotency keys are provided by the client

- External payout or banking integrations are not implemented

### Scaling Notes (Brief)

* In a production environment, this system can be scaled by:

- Using Redis for distributed idempotency and request deduplication

- Applying database-level row locking or optimistic concurrency control

- Introducing background workers for external payout processing

- Adding structured logging, metrics, and tracing for observability


### API Documentation

A Postman collection is included with all available endpoints and example requests.
https://warped-meteor-419832.postman.co/workspace/My-Workspace~5e21a1a2-7d7c-42b1-8c0c-7d27eb3aa393/collection/31288774-302f6e92-7ec9-40bb-b261-378a9fbabbdd?action=share&creator=31288774

### Conclusion

- This implementation focuses on correctness, readability, and real-world safety concerns such as balance integrity and retry handling, while keeping the overall design simple and easy to reason about.