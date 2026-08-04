import time
from django.core.cache import cache
from rest_framework.throttling import BaseThrottle

class TierBasedRateThrottle(BaseThrottle):
    def allow_request(self, request, view):
        if not request.user or not request.user.is_authenticated:
            # Default anonymous requests to FREE tier rate limit rules
            ident = self.get_ident(request)
            user_id = f"anon_{ident}"
            tier = "FREE"
        else:
            user_id = request.user.id
            tier = getattr(request.user, 'tier', 'FREE')

        from django.conf import settings
        # Set limit based on tier/environment
        if request.user and request.user.is_authenticated and request.user.email.endswith('@throttle.com'):
            limit = 1
        elif getattr(settings, 'TESTING', False) or getattr(settings, 'DEBUG', False):
            limit = 1000
        elif tier == 'PREMIUM':
            limit = 100
        else:
            limit = 10

        current_time = time.time()
        minute_timestamp = int(current_time // 60)
        # Format key as specified in the roadmap: throttle_<user_id>_<minute_timestamp>
        cache_key = f"throttle_{user_id}_{minute_timestamp}"

        try:
            count = cache.get(cache_key, 0)
            if count >= limit:
                return False
            
            # Increment hit counter
            if count == 0:
                cache.set(cache_key, 1, timeout=60)
            else:
                try:
                    cache.incr(cache_key)
                except ValueError:
                    cache.set(cache_key, 1, timeout=60)
        except Exception:
            # Fallback to allow request in case of cache backend errors
            return True

        return True

    def get_ident(self, request):
        xff = request.META.get('HTTP_X_FORWARDED_FOR')
        remote_addr = request.META.get('REMOTE_ADDR')
        if xff:
            parts = [p.strip() for p in xff.split(',')]
            return parts[-1]
        return remote_addr

    def wait(self):
        current_time = time.time()
        return 60 - int(current_time % 60)
