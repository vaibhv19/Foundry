# Learning Deep-Dive 12: Testing and Security Audit

This deep-dive covers the validation strategy, end-to-end integration tests, security access controls, and rate-limiting safeguards implemented in Foundry.

---

## 1. End-to-End Integration Testing Strategy

We utilize Playwright E2E testing to simulate user browser sessions against live running Docker container instances. The E2E tests are configured in the `e2e/` monorepo workspace and cover three core user journeys:

### A. Initial Generation Flow
* **Path**: `e2e/specs/initial_generation.spec.js`
* **Workflow**: Registers a new user, inputs a startup idea, submits it, verifies redirection to the Strategy Room, and observes live tokens streaming to convergence.

### B. Consistency Conflict & Override Flow
* **Path**: `e2e/specs/conflict_resolution.spec.js`
* **Workflow**: Opens the interactive canvas, edits the Technical Architecture section block to request a database stack switch to "MongoDB", catches the published `DECISION_OVERRIDE_REQUIRED` WebSocket error, displays the Consistency Conflict warning banner, inputs an override rationale, and re-submits to resolve.

### C. Section Versioning & Rollback Flow
* **Path**: `e2e/specs/version_rollback.spec.js`
* **Workflow**: Modifies section cards to create active `v2` version branches, verifies the UI updates, clicks the `v1` selector pill to trigger a rollback, and asserts that contents revert back to the original `Postgres` datastore.

---

## 2. Rate Limiting Safeguards

To prevent Denial of Service (DoS) and API abuse, Foundry implements custom Django REST framework throttling middleware.

### Tier-Based Rate Limits
The rate limiting uses Redis cache hits to track requests per user ID or anonymous IP:
* **Free Tier Users**: Capped at **10 requests per minute**.
* **Premium Tier Users**: Capped at **100 requests per minute**.
* **Local Development / Pytest**: Configured at a bypass cap of **1000 requests per minute** to prevent blocking development cycles.

### Stresstest Verification
The stress script `e2e/scripts/rate_limit_test.py` validates that limits are correctly enforced:
1. Registers a test user under the `@throttle.com` domain.
2. The middleware automatically detects this domain and applies a strict limit of **1 request per minute** for testing.
3. Fire 5 parallel requests to the blueprints list API route.
4. Asserts that subsequent requests return `429 Too Many Requests` status codes.

---

## 3. Database Access Scoping & Ownership Security

Every API request is audited to enforce ownership scope bounds:
* **Object Ownership Enforcement**: Blueprint queryset evaluations filter objects strictly by the authenticated request user:
  ```python
  def get_queryset(self):
      return Blueprint.objects.filter(user=self.request.user)
  ```
* **Indirect Information Disclosures**: When User B attempts to access, delete, or modify a blueprint owned by User A, the view layer raises a `Http404` exception. Returning a `404 Not Found` response is a security best-practice that hides the existence of the resource, preventing malicious metadata scanning.
* **WebSocket Authentication Guard**: The ASGI socket consumer validates JWT tokens in connection query parameters and asserts ownership boundaries before accepting the handshake:
  ```python
  is_owner = await check_blueprint_ownership(self.blueprint_id, self.user)
  if not is_owner:
      await self.close(code=4003)
  ```
