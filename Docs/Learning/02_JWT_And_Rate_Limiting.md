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

---

## 4. Engineering Lessons & Troubleshooting Stories

### 4.1 SimpleJWT Custom Token Payload Subclassing
* **Problem**: Standard SimpleJWT views (`TokenObtainPairView`) return only the JSON string properties `access` and `refresh`. However, the frontend auth store requires the authenticated user details (`id`, `email`, `name`, `tier`) nested inside a unified payload to bind state instantly.
* **Solution**: Subclassed `TokenObtainPairView` inside `users/views.py`. We overridden the `post()` handler, fetched the target user profile via the validated email from the serializer context, and explicitly reshaped the response data dictionary:
  ```python
  response.data = {
      "token": {
          "access": str(token.access_token),
          "refresh": str(token)
      },
      "user": UserSerializer(user).data
  }
  ```
  This resolved the client DTO binding mismatch without adding secondary auth validation requests.

### 4.2 Avoiding Race Conditions in Rolling Throttle Buckets
* **Problem**: Under heavy parallel request stress tests, traditional get-then-set caching in custom rate limiters caused race conditions. Two concurrent requests reading the current minute bucket at value 9 could both allow the request before either updated the bucket to 10, thus bypassing limits.
* **Solution**: We implemented the throttle check inside `users/throttling.py` using atomic Redis keys. We utilize the Django cache backend's `.incr()` operation, which translates directly to the Redis `INCR` command. Since `INCR` is thread-safe and atomic in Redis, we increment first and check the result against the tier's limit. On the initial key creation, we call `.expire()` to set key expiration to 60 seconds, preventing old counters from leaking memory.

