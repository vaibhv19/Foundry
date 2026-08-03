# Custom User Model, JWT Authentication, & Redis-Backed Throttling

This document covers the architectural and implementation details for user session security and rate-limiting utilizing Django REST Framework, SimpleJWT, and Redis.

## Custom User Tiers

The user model has been customized via `users.models.CustomUser`, extending Django's `AbstractUser`.

### Key Enhancements

1.  **Unique Identifier (Email)**: Enforced email address as the unique identifier by setting `USERNAME_FIELD = 'email'` and removing the `username` field.
2.  **User Tier Classification**: A custom `tier` field utilizes the `UserTier` text choices to categorize users:
    -   `FREE`: Standard rate limits (default).
    -   `PREMIUM`: High-performance limits (assigned by default to superusers).

### Database Model Definition

```python
class UserTier(models.TextChoices):
    FREE = 'FREE', 'Free Tier'
    PREMIUM = 'PREMIUM', 'Premium Tier'

class CustomUser(AbstractUser):
    username = None
    email = models.EmailField('email address', unique=True)
    name = models.CharField(max_length=150, blank=True)
    tier = models.CharField(
        max_length=10,
        choices=UserTier.choices,
        default=UserTier.FREE,
    )
```

---

## JWT Authentication Configurations

JWT handling is managed using `djangorestframework-simplejwt`.

### Token Endpoint Paths

-   **Register**: `POST /api/v1/auth/register/` (returns JWT token payload + user details).
-   **Login**: `POST /api/v1/auth/login/` (subclassed `TokenObtainPairView` to return custom token + user details structure).

### Payload Response Structure

Upon successful registration or login, the API returns:

```json
{
  "token": {
    "access": "<access_token>",
    "refresh": "<refresh_token>"
  },
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "User Name",
    "tier": "FREE"
  }
}
```

---

## Redis Rate Throttling

To enforce utilization policies across user tiers, a custom Redis-backed throttling engine `TierBasedRateThrottle` has been implemented in `users/throttling.py` and registered globally in Django settings.

### Throttling Rules

-   **`FREE` Users**: Maximum **10 requests per minute**.
-   **`PREMIUM` Users**: Maximum **100 requests per minute**.

### Redis Keyspace Format

The cache keys are tracked per-minute to allow rolling buckets, using the format:

```text
throttle_<user_id>_<minute_timestamp>
```

-   `user_id`: Numeric identifier for authenticated users; IP-based ID (`anon_<ip_address>`) for anonymous requests (defaulted to `FREE` limits).
-   `minute_timestamp`: Evaluated as `int(time.time() // 60)` to represent a rolling 60-second window.

### Cache Backend

Throttling leverages Django 4.2's built-in Redis cache backend `django.core.cache.backends.redis.RedisCache` connecting directly to our Dockerized Redis instance.
