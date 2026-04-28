# Building Society Management System (BSMS)

A scalable, multi-tenant SaaS platform for managing residential buildings.

---

## Overview

BSMS digitizes core building operations including billing, maintenance, visitor tracking, and tenant management. The system replaces fragmented manual workflows (Excel, WhatsApp, paper logs) with a centralized, role-based platform.

The architecture is designed for **multi-building scalability**, enabling property managers to manage multiple buildings within a single system.

---

## Core Capabilities

* Role-based access control (Admin, Owner, Tenant, Guard)
* Automated billing and payment tracking
* Maintenance ticket lifecycle management
* Visitor logging with audit trail
* Real-time occupancy tracking
* Notification and communication system

---

## System Architecture

```text
Client (Next.js SPA)
        ↓
REST API (Laravel)
        ↓
PostgreSQL Database
```

### Design Principles

* **Separation of concerns**: Frontend (Next.js) and backend (Laravel API) are decoupled
* **Multi-tenancy**: All data is scoped using `building_id`
* **Stateless API design**: RESTful endpoints
* **Scalable infrastructure**: Designed for AWS deployment

---

## Tech Stack

| Layer    | Technology                       |
| -------- | -------------------------------- |
| Frontend | Next.js (App Router), TypeScript |
| Backend  | Laravel (PHP 8.2/8.3)            |
| Database | PostgreSQL                       |
| API      | REST                             |
| Auth     | Token-based (JWT/session)        |

---

## Key Engineering Decisions

### Multi-Tenant Data Isolation

All queries are scoped using `building_id` to prevent cross-building data leakage.

### Payment System Design

* Payment gateway integration abstracted at service layer
* No sensitive payment data stored (token-based approach)

### Modular Backend Structure

* Controllers → Request handling
* Services (extendable) → Business logic
* Models → Data layer

---

## Project Structure

```text
backend/   → Laravel API
bsms/      → Next.js frontend
```

---

## Getting Started

### Prerequisites

* PHP 8.2 or 8.3
* Composer
* Node.js 18+
* PostgreSQL

---

## Backend Setup

```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
```

Update `.env`:

```env
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=bsms_db
DB_USERNAME=postgres
DB_PASSWORD=your_password
```

Run:

```bash
php artisan migrate
php artisan serve
```

---

## Frontend Setup

```bash
cd bsms
npm install
```

Create `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000/api
```

Run:

```bash
npm run dev
```

---

## API Design (Example)

```http
POST   /api/login
GET    /api/flats
POST   /api/tenants
GET    /api/invoices
POST   /api/payments
```

---

## Security Considerations

* Role-based access control enforced at API level
* Password hashing using bcrypt
* HTTPS required for all API communication
* No payment data stored on server

---

## Performance Considerations

* Optimized DB queries with indexing
* API response target < 500ms
* Designed for horizontal scaling

---

## Future Enhancements

* AI-based maintenance classification
* Mobile app (iOS/Android)
* Advanced analytics dashboard
* Multi-language support (Bangla)

---


## Notes

This project is designed as a foundation for a production-grade SaaS platform and aligns with real-world system design principles.
