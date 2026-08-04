# Foundry API Specification

This document defines the API contracts for the **Foundry** system. It covers the communication between the React frontend and the Django REST API, as well as the real-time WebSocket protocol for agent streaming.

---

## Part A: Public REST API (Django → React)

### 1. Global Conventions
- **Base URL:** `http://localhost:8000/api/v1`
- **Auth Scheme:** JWT (JSON Web Token) / Bearer Token
- **Content Type:** `application/json`

### 2. Authentication (`/auth`)
| Path | Method | Description | Request Body | Response |
| :--- | :--- | :--- | :--- | :--- |
| `/register/` | `POST` | Create a new account | `{"email", "password", "name"}` | `201: {"token", "user"}` |
| `/login/` | `POST` | Authenticate user | `{"email", "password"}` | `200: {"token", "user"}` |

### 3. Blueprint Management (`/blueprints`)
| Path | Method | Description | Async? | Response |
| :--- | :--- | :--- | :--- | :--- |
| `/` | `GET` | List user's blueprints | No | `List<Blueprint>` |
| `/` | `POST` | **Submit Idea**: Trigger Strategy Room debate | **Yes** | `202: {"blueprint_id"}` |
| `/{id}/` | `GET` | Get full blueprint, sections list, and decisions log | No | `BlueprintDetail` |

### 4. Section & Versioning (`/sections`)
| Path | Method | Description | Async? | Response |
| :--- | :--- | :--- | :--- | :--- |
| `/{id}/` | `GET` | Get specific section details | No | `SectionDetail` |
| `/{id}/versions/` | `GET` | List version history for a section | No | `List<Version>` |
| `/{id}/regenerate/`| `POST`| **Consistency Edit**: Request targeted rewrite | **Yes** | `202: {"task_id", "status"}` |

### 5. Decision Memory Surface
*Decision log records are nested and serialized directly inside the `BlueprintDetail` payload returned by `GET /api/v1/blueprints/{id}/`.*

### 6. Data Export (`/exports`)
| Path | Method | Description | Response |
| :--- | :--- | :--- | :--- |
| `/{id}/trigger/` | `POST` | Compile blueprint sections to Markdown/PDF | `202: {"export_url"}` |
| `/{id}/download/`| `GET` | Retrieve the generated file binary stream | `File Binary (.md)` |

---

## Part B: Real-Time WebSocket API (Django Channels)

### 1. Connection Lifecycle
- **Endpoint:** `ws://localhost:8000/ws/strategy/{blueprint_id}/`
- **Auth:** Token passed via query string: `?token=<jwt_token>`
- **Scope:** One connection per blueprint session.

### 2. Event Contract
The WebSocket transport uses the canonical event names documented in [WebSocket_Protocol.md](WebSocket_Protocol.md). The frontend should treat the following as the authoritative event types:
- `JOB_CREATED`
- `NODE_STARTED`
- `NODE_COMPLETED`
- `NODE_FAILED`
- `TOKEN`
- `STATUS`
- `HEARTBEAT`
- `DEBUG`
- `COMPLETE`
- `ERROR`

---

## Part C: Key DTO Shapes

**`BlueprintDetail`**
```json
{
  "id": "UUID",
  "title": "Blueprint Title",
  "status": "READY",
  "idea_raw": "One paragraph startup concept...",
  "sections": [
    {
      "id": "UUID",
      "title": "Technical Architecture",
      "category": "TECH_STACK",
      "latest_content": "Markdown text...",
      "version_count": 2,
      "sort_order": 2
    }
  ],
  "decisions": [
    {
      "id": "UUID",
      "node_origin": "Tech_Lead",
      "decision_key": "database_engine",
      "choice_value": "PostgreSQL",
      "rationale": "ACID compliance and robust relational structure.",
      "priority": "P0",
      "is_active": true,
      "created_at": "ISO-8601"
    }
  ],
  "created_at": "ISO-8601"
}
```

**`DecisionLogEntry`**
```json
{
  "id": "UUID",
  "node_origin": "Tech_Lead",
  "decision_key": "database_engine",
  "choice_value": "PostgreSQL",
  "rationale": "ACID compliance and robust relational structure.",
  "priority": "P0",
  "is_active": true,
  "created_at": "ISO-8601"
}
```

**`SectionRegenerateRequest`**
```json
{
  "user_note": "Can we switch to a serverless architecture?",
  "enforce_previous_decisions": true
}
```

---

## Part D: Real-Time WebSocket Events

The WebSocket protocol is explicitly typed so the frontend can render a deterministic mission-control experience.

### 1. Event Envelope
Every message includes a `type` field and a payload object.
```json
{
  "type": "JOB_CREATED",
  "payload": {}
}
```

### 2. Event Catalog
| Event | Direction | Purpose | Payload |
| :--- | :--- | :--- | :--- |
| `JOB_CREATED` | Server → Client | A new generation job has been accepted. | `{"blueprint_id": "UUID", "job_id": "UUID"}` |
| `NODE_STARTED` | Server → Client | A specific graph node has started. | `{"node": "Investor", "iteration": 1}` |
| `NODE_COMPLETED` | Server → Client | A node finished successfully. | `{"node": "Tech_Lead", "iteration": 2}` |
| `NODE_FAILED` | Server → Client | A node failed and the graph may recover or stop. | `{"node": "Product_Manager", "error_code": "TIMEOUT"}` |
| `TOKEN` | Server → Client | Incremental streaming chunk from the active node. | `{"node": "Investor", "content": "...", "is_final": false}` |
| `STATUS` | Server → Client | Human-readable job progress or lifecycle transition. | `{"status": "GENERATING", "message": "Investor is evaluating market viability"}` |
| `HEARTBEAT` | Server → Client | Keeps the connection alive during long operations. | `{"ts": "ISO-8601"}` |
| `DEBUG` | Server → Client | Internal diagnostics for development builds. | `{"node": "Consistency_Check", "details": {}}` |
| `COMPLETE` | Server → Client | The entire generation flow completed. | `{"blueprint_id": "UUID", "status": "READY"}` |
| `ERROR` | Server → Client | Terminal or recoverable runtime error. | `{"code": "LLM_TIMEOUT", "message": "..."}` |

### 3. Client → Server Commands
The client may also send control messages over the same WebSocket channel.
- `resume_generation`: Continue a previously interrupted run.
- `cancel_generation`: Stop the active run.
- `request_state`: Request the latest blueprint snapshot.

## Part E: Additional REST Endpoints

| Path | Method | Description | Request Body / Query Params | Response |
| :--- | :--- | :--- | :--- | :--- |
| `/blueprints/{id}/` | `DELETE` | Soft-delete a blueprint. | None | `200: {"deleted": true}` |
| `/blueprints/{id}/rename/` | `PATCH` | Rename the blueprint title. | `{"title"}` | `200: BlueprintDetail` |
| `/blueprints/{id}/duplicate/` | `POST` | Duplicate a blueprint as a new draft. | None | `201: {"blueprint_id"}` |
| `/blueprints/{id}/override_decision/` | `POST` | Apply manual override for a constraint. | `{"decision_id", "choice_value", "rationale"}` | `200: BlueprintDetail` |
| `/versions/{id}/restore/` | `POST` | Restore a prior section version. | None | `200: Version` |

## Part F: Error Handling
Foundry uses standard HTTP codes:
- `400 Bad Request`: Validation errors or missing fields.
- `401 Unauthorized`: Missing or expired JWT credentials.
- `403 Forbidden`: Authenticated user attempting to modify another user's blueprint.
- `404 Not Found`: Hides resource existence or missing IDs.
- `409 Conflict`: Attempting to regenerate a section while the blueprint is still generating.

---

## Part G: Implementation Notes & Deviations

* **Nest Decisions Log**: The standalone `/decisions/blueprint/{id}/` endpoint specified in Part A, Section 5 was merged directly into `BlueprintDetail` returned by `GET /api/v1/blueprints/{id}/`.
* **Decision Override Endpoint**: The manual override is implemented under `/api/v1/blueprints/{id}/override_decision/` rather than `/decisions/{id}/override/`, returning the fully updated `BlueprintDetail` payload.
* **WebSocket Client-to-Server Commands**: Control commands (like `resume_generation` and `request_state`) are deferred in v1, with status tracking driven entirely by REST endpoints and websocket server-to-client broadcasts.