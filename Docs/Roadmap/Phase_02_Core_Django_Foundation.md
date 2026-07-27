# Phase 02 — Core Django Foundation

## Phase Goal
The objective of this phase is to establish the core user model, security protocols, and traffic limits for the Django application. We will implement a custom user model supporting distinct tiers (`FREE` and `PREMIUM`), set up JWT (JSON Web Token) authentication, and build a custom Redis-backed rate-limiting mechanism to enforce tier-based utilization policies.

---

## Folder Structure

```text
backend/
├── requirements.txt           # Updated with JWT and Redis dependencies
└── foundry_backend/
    ├── settings.py            # SimpleJWT and DRF config
    ├── urls.py                # Mount auth paths
    └── users/                 # Django App for User Domain
        ├── __init__.py
        ├── models.py          # CustomUser model
        ├── serializers.py     # Auth serializers
        ├── views.py           # Register and Login controllers
        ├── urls.py
        ├── permissions.py     # User-tier permissions
        ├── throttling.py      # Custom Redis-backed throttle engine
        └── tests/
            ├── __init__.py
            ├── test_models.py
            ├── test_auth.py
            └── test_throttle.py
```

---

## Module Definitions

### 1. User Identity Module
* **Purpose**: Extends Django's standard auth system to support multi-tier identities.
* **Responsibilities**: Creating users, validating emails, hashing passwords, and storing user subscription states.
* **Dependencies**: PostgreSQL.
* **Inputs**: User registration payload `{"email", "password", "name"}`.
* **Outputs**: User database records.
* **Public Interfaces**: `CustomUser` model, `/api/v1/auth/register/` and `/api/v1/auth/login/` REST endpoints.

### 2. JWT Authentication Layer
* **Purpose**: Generates and validates cryptographic session tokens.
* **Responsibilities**: Issuing access/refresh token pairs, reading bearer headers, and populating `request.user` during REST actions.
* **Dependencies**: `djangorestframework-simplejwt`.
* **Public Interfaces**: SimpleJWT request validation filters.

### 3. Redis Tier Throttle Middleware
* **Purpose**: Protects downstream AI endpoints and enforces rate policies.
* **Responsibilities**: Checking request count in Redis key-value stores, comparing counts against user tier maximums, and rejecting requests exceeding limits.
* **Dependencies**: Redis.
* **Inputs**: Incoming HTTP request metadata (IP, authenticated user, request path).
* **Outputs**: HTTP 429 Too Many Requests response if bounds are breached.
* **Public Interfaces**: Custom throttle class `TierBasedRateThrottle` loaded into DRF settings.

---

## Shared Components & Configurations
* **User Tiers Enum**:
  ```python
  class UserTier(models.TextChoices):
      FREE = 'FREE', 'Free Tier'
      PREMIUM = 'PREMIUM', 'Premium Tier'
  ```
* **Throttle Configuration**:
  ```python
  REST_FRAMEWORK = {
      'DEFAULT_AUTHENTICATION_CLASSES': (
          'rest_framework_simplejwt.authentication.JWTAuthentication',
      ),
      'DEFAULT_THROTTLE_CLASSES': (
          'foundry_backend.users.throttling.TierBasedRateThrottle',
      ),
  }
  ```

---

## Atomic Implementation Tasks

### Task 2.1: Add Dependencies
* **Size**: S
* **Risk**: Low
* **Prerequisites**: Task 1.3
* **Description**: Add `djangorestframework-simplejwt` and `redis` to `requirements.txt`. Install inside virtualenv or rebuild docker backend container.
* **Definition of Done**: Dependencies install without conflict.

### Task 2.2: Implement Custom User Model
* **Size**: S
* **Risk**: Low
* **Prerequisites**: Task 2.1
* **Description**: Create django app `users` (`python manage.py startapp users`). Define `CustomUser` inheriting from `AbstractUser`. Remove standard username field (optional, enforce email as unique identifier) or keep it standard. Add `tier` text choices field (`FREE` / `PREMIUM`), defaulting to `FREE`. Register in `settings.py` via `AUTH_USER_MODEL = 'users.CustomUser'`.
* **Definition of Done**: 
  - `CustomUser` defined in `users/models.py`.
  - Settings configured.

### Task 2.3: Generate and Run User Migrations
* **Size**: S
* **Risk**: Low
* **Prerequisites**: Task 2.2
* **Description**: Run `python manage.py makemigrations users` and `python manage.py migrate` to create database schema.
* **Definition of Done**: Migrations run successfully, creating `users_customuser` table in Postgres.

### Task 2.4: Implement Authentication Serializers and Views
* **Size**: S
* **Risk**: Low
* **Prerequisites**: Task 2.3
* **Description**: Create `RegisterSerializer` extracting `email`, `password`, `name`. Create views for registration and mount SimpleJWT `/auth/login/` token endpoints.
* **Definition of Done**:
  - Endpoint `POST /api/v1/auth/register/` creates user and returns token.
  - Endpoint `POST /api/v1/auth/login/` validates and returns token.

### Task 2.5: Implement Redis Tier-Based Throttling Class
* **Size**: M
* **Risk**: Medium
* **Prerequisites**: Task 2.4, Task 1.2 (Redis active)
* **Description**: Write custom throttle class inheriting from DRF `BaseThrottle` or `SimpleRateThrottle`. Read incoming `request.user.tier`. Determine rate boundaries:
  - `FREE`: 10 requests per minute.
  - `PREMIUM`: 100 requests per minute.
  Use Redis server to track hits via cache keys formatted as `throttle_<user_id>_<minute_timestamp>`.
* **Definition of Done**:
  - Class `TierBasedRateThrottle` implemented in `users/throttling.py`.
  - Registered in `settings.py`.

### Task 2.6: Write Authentication and Throttling Unit Tests
* **Size**: M
* **Risk**: Low
* **Prerequisites**: Task 2.5
* **Description**: Write pytest unit tests:
  - Create user, obtain JWT, request protected route.
  - Simulate multiple rapid requests to confirm a Free user hits a 429 after 10 requests, and Premium user proceeds. Mock Redis interface using `django.core.cache` mock configs.
* **Definition of Done**:
  - `pytest backend/` runs and passes all auth and throttle tests.

---

## Milestone Verification Checkpoint (Milestone 01-B)
* **Status**: Running suite.
* **Behavior**: Verify that user registrations succeed, login issues JWT tokens, and requesting api paths validates JWTs and blocks when hitting limit.
* **Incomplete Features**: No blueprint database models, no Celery tasks.

---

## Suggested Git Commits
- `feat/backend/custom-user`: Custom user model, choices, migration script.
- `feat/backend/jwt-auth`: SimpleJWT integration, register serializer & view.
- `feat/backend/redis-throttle`: Redis-backed throttling rules per user tier.
- `test/backend/auth-throttle`: Unit tests verifying auth token lifecycle and 429 exceptions.

---

## Suggested GitHub Issues
* **Issue #1.2**: Implement Custom User Model, Tier Enums, and simple JWT authentication views.
* **Issue #1.3**: Develop Redis-backed user/tier rate-limiting middleware.

---

## Expected Docs/Learning Deep-Dives
* **`Docs/Learning/02_JWT_And_Rate_Limiting.md`**: Detail SimpleJWT configurations, custom user managers, and the Redis keyspace setup used for tier throttles.
