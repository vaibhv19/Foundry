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
| `/` | `GET` | List user's blueprints (supports `?search=`) | No | `List<Blueprint>` |
| `/` | `POST` | **Submit Idea**: Trigger Strategy Room | **Yes** | `202: {"blueprint_id"}` |
| `/{id}/` | `GET` | Get full blueprint + latest sections | No | `BlueprintDetail` |
| `/{id}/status/` | `GET` | Poll for job state | No | `{"status": "READY"}` |

### 4. Section & Versioning (`/sections`)
| Path | Method | Description | Async? | Response |
| :--- | :--- | :--- | :--- | :--- |
| `/{id}/` | `GET` | Get specific section text/metadata | No | `SectionDetail` |
| `/{id}/versions/` | `GET` | List version history for a section | No | `List<Version>` |
| `/{id}/regenerate/`| `POST`| **Consistency Edit**: Request rewrite | **Yes** | `202: {"task_id"}` |

### 5. Decision Memory Surface (`/decisions`)
*Per PRD Success Criteria: The decision log must be human-inspectable.*
| Path | Method | Description | Response |
| :--- | :--- | :--- | :--- |
| `/blueprint/{id}/`| `GET` | List all stored decisions for a blueprint | `List<DecisionLogEntry>` |

### 6. Data Export (`/exports`)
| Path | Method | Description | Response |
| :--- | :--- | :--- | :--- |
| `/{id}/trigger/` | `POST` | Compile blueprint to Markdown/PDF | `202: {"export_url"}` |
| `/{id}/download/`| `GET` | Retrieve the generated file | `File Binary` |

---

## Part B: Real-Time WebSocket API (Django Channels)

### 1. Connection Lifecycle
- **Endpoint:** `ws://localhost:8000/ws/strategy/{blueprint_id}/`
- **Auth:** Token passed via query string: `?token=<jwt_token>`
- **Scope:** One connection per blueprint session.

### 2. Message Schemas (Server → Client)

#### Type: `status_update`
Sent when the Celery worker transitions the job state.
```json
{
  "type": "status_update",
  "status": "QUEUED | GENERATING | READY",
  "message": "Investor is analyzing market viability..."
}
```

#### Type: `token_stream`
Real-time, letter-by-letter generation from the active LangGraph node.
```json
{
  "type": "token_stream",
  "node": "Investor | Product_Manager | Tech_Lead",
  "content": "string", // The incremental token text
  "is_final": boolean
}
```

#### Type: `error`
Sent if the LLM or graph execution fails.
```json
{
  "type": "error",
  "code": "LLM_TIMEOUT | CONSISTENCY_VIOLATION",
  "message": "The Tech Lead could not reconcile the budget with the feature set."
}
```

---

## Part C: Key DTO Shapes

**`BlueprintDetail`**
```json
{
  "id": "UUID",
  "idea_raw": "One paragraph idea...",
  "status": "READY",
  "sections": [
    {
      "id": "UUID",
      "title": "Technical Architecture",
      "latest_content": "Markdown text...",
      "version_count": 2
    }
  ],
  "created_at": "ISO-8601"
}
```

**`DecisionLogEntry`**
```json
{
  "id": "UUID",
  "origin_node": "Tech_Lead",
  "decision": "Relational DB (PostgreSQL)",
  "reasoning": "Data model requires strict ACID compliance.",
  "timestamp": "ISO-8601"
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

## Part D: Error Handling
Foundry uses standard HTTP codes:
- `403 Forbidden`: User attempting to access a blueprint they do not own.
- `409 Conflict`: Attempting to regenerate a section while the blueprint is still in a `GENERATING` state.
- `422 Unprocessable Entity`: The AI could not find a consistent path forward (used for the Consistency Engine's stretch goal).