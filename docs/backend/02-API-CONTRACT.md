# FamilyHub API Contract

> **Version:** 1.0.0
> **Base URL:** `/api`
> **Content-Type:** `application/json`

---

## Overview

This document defines the API contract between the FamilyHub frontend and backend. The frontend already implements these interfaces through mock handlers. The backend must implement them **exactly** to ensure seamless integration.

### Design Principles

1. **RESTful**: Resources as nouns, HTTP verbs for actions
2. **Consistent**: Same response envelope across all endpoints
3. **Predictable**: Standardized error responses
4. **Idempotent**: Safe retry behavior for mutations

---

## Authentication

All endpoints (except `/api/auth/*` and `/api/health`) require authentication.

### Headers
```http
Authorization: Bearer <jwt_token>
```

### Token Payload
```json
{
  "sub": "user-uuid",
  "familyId": "family-uuid",
  "memberId": "member-uuid",
  "role": "admin|member",
  "exp": 1735689600,
  "iat": 1735603200
}
```

---

## Response Envelopes

### Success Response
```typescript
interface ApiResponse<T> {
  data: T;
  message?: string;       // Human-readable success/info message
}
```

> **Note:** All endpoints (queries and mutations) use the same `ApiResponse<T>` envelope.
> The `message` field is optional and used for success confirmations on mutations.

### Error Response
```typescript
interface ErrorResponse {
  code: ApiErrorCode;     // Machine-readable error code
  message: string;        // Human-readable message
  status: number;         // HTTP status code
  details?: Record<string, unknown>;  // Additional context
  field?: string;         // For validation errors
}
```

### Error Codes
```typescript
const ApiErrorCode = {
  NETWORK_ERROR: "NETWORK_ERROR",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  CONFLICT: "CONFLICT",
  SERVER_ERROR: "SERVER_ERROR",
  TIMEOUT: "TIMEOUT",
}
```

---

## Family API

### Data Types

```typescript
type FamilyColor = "coral" | "teal" | "green" | "purple" | "yellow" | "pink" | "orange";

interface FamilyMember {
  id: string;             // UUID
  name: string;           // Display name (1-50 chars)
  color: FamilyColor;     // Unique within family
  avatarUrl?: string;     // URL to avatar image
  email?: string;         // For notifications
}

interface FamilyData {
  id: string;             // UUID
  name: string;           // Family name (1-100 chars)
  members: FamilyMember[];
  createdAt: string;      // ISO 8601 datetime
  setupComplete: boolean; // True after onboarding
}
```

---

### GET /api/family

Get the current user's family data.

**Response (200 OK)** - Family exists:
```json
{
  "data": {
    "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "name": "The Johnsons",
    "members": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "name": "Sarah",
        "color": "coral",
        "avatarUrl": null,
        "email": "sarah@example.com"
      },
      {
        "id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
        "name": "Mike",
        "color": "teal",
        "avatarUrl": null,
        "email": null
      }
    ],
    "createdAt": "2026-01-01T00:00:00.000Z",
    "setupComplete": true
  },
  "meta": {
    "timestamp": 1735689600000,
    "requestId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
  }
}
```

**Response (200 OK)** - No family (triggers onboarding):
```json
{
  "data": null,
  "meta": {
    "timestamp": 1735689600000,
    "requestId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
  }
}
```

---

### POST /api/family

Create a new family (during onboarding).

**Request:**
```typescript
interface CreateFamilyRequest {
  name: string;                           // 1-100 chars
  members: Array<Omit<FamilyMember, "id">>; // 1-7 members
}
```

**Example:**
```json
{
  "name": "The Johnsons",
  "members": [
    { "name": "Sarah", "color": "coral", "email": "sarah@example.com" },
    { "name": "Mike", "color": "teal" },
    { "name": "Emma", "color": "purple" }
  ]
}
```

**Response (201 Created):**
```json
{
  "data": {
    "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "name": "The Johnsons",
    "members": [
      { "id": "uuid-1", "name": "Sarah", "color": "coral", "email": "sarah@example.com" },
      { "id": "uuid-2", "name": "Mike", "color": "teal" },
      { "id": "uuid-3", "name": "Emma", "color": "purple" }
    ],
    "createdAt": "2026-01-08T12:00:00.000Z",
    "setupComplete": true
  },
  "message": "Family created successfully"
}
```

**Error (409 Conflict)** - Family already exists:
```json
{
  "code": "CONFLICT",
  "message": "Family already exists. Use updateFamily to modify.",
  "status": 409
}
```

**Validation Rules:**
- `name`: Required, 1-100 characters
- `members`: Required, 1-7 items
- `members[].name`: Required, 1-50 characters
- `members[].color`: Required, must be valid FamilyColor
- `members[].color`: Must be unique within request

---

### PATCH /api/family

Update family properties.

**Request:**
```typescript
interface UpdateFamilyRequest {
  name?: string;  // 1-100 chars
}
```

**Response (200 OK):**
```json
{
  "data": {
    "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "name": "The Johnson-Smiths",
    "members": [...],
    "createdAt": "2026-01-01T00:00:00.000Z",
    "setupComplete": true
  },
  "message": "Family updated successfully"
}
```

**Error (404 Not Found):**
```json
{
  "code": "NOT_FOUND",
  "message": "No family exists. Create one first.",
  "status": 404
}
```

---

### DELETE /api/family

Delete/reset the family (dangerous operation).

**Response (204 No Content)**

---

### POST /api/family/members

Add a new member to the family.

**Request:**
```typescript
interface AddMemberRequest {
  name: string;         // 1-50 chars
  color: FamilyColor;   // Must not be in use
  avatarUrl?: string;
  email?: string;
}
```

**Response (201 Created):**
```json
{
  "data": {
    "id": "new-member-uuid",
    "name": "Baby Jake",
    "color": "yellow",
    "avatarUrl": null,
    "email": null
  },
  "message": "Member added successfully"
}
```

**Error (409 Conflict)** - Color taken:
```json
{
  "code": "CONFLICT",
  "message": "Color \"coral\" is already assigned to another member",
  "status": 409
}
```

**Error (400 Validation)** - Max members:
```json
{
  "code": "VALIDATION_ERROR",
  "message": "Maximum of 7 family members allowed",
  "status": 400
}
```

---

### PATCH /api/family/members/:id

Update an existing family member.

**Request:**
```typescript
interface UpdateMemberRequest {
  name?: string;
  color?: FamilyColor;
  avatarUrl?: string;
  email?: string;
}
```

**Response (200 OK):**
```json
{
  "data": {
    "id": "member-uuid",
    "name": "Sarah J.",
    "color": "coral",
    "avatarUrl": "https://example.com/avatar.jpg",
    "email": "sarah.j@example.com"
  },
  "message": "Member updated successfully"
}
```

---

### DELETE /api/family/members/:id

Remove a member from the family.

**Response (204 No Content)**

**Error (400 Validation)** - Last member:
```json
{
  "code": "VALIDATION_ERROR",
  "message": "Cannot remove the last family member",
  "status": 400
}
```

---

## Calendar API

### Data Types

```typescript
interface CalendarEvent {
  id: string;           // UUID
  title: string;        // 1-200 chars
  startTime: string;    // "9:00 AM" format (12-hour)
  endTime: string;      // "10:00 AM" format (12-hour)
  date: string;         // ISO date "2026-01-15" (in responses)
  memberId: string;     // UUID of family member
  isAllDay?: boolean;   // Default: false
  location?: string;    // Optional, max 500 chars
}
```

**Important Time Format Notes:**
- Times are in 12-hour format with AM/PM: `"9:00 AM"`, `"2:30 PM"`
- Dates are ISO format without time component: `"2026-01-15"`
- Backend should store times in 24-hour format internally and convert for API

---

### GET /api/calendar/events

List events with optional filters.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| startDate | string | ISO date (inclusive), e.g., `2026-01-01` |
| endDate | string | ISO date (inclusive), e.g., `2026-01-31` |
| memberId | string | UUID to filter by member |

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "event-uuid-1",
      "title": "Soccer Practice",
      "startTime": "4:00 PM",
      "endTime": "5:30 PM",
      "date": "2026-01-15",
      "memberId": "member-uuid-1",
      "isAllDay": false,
      "location": "City Park Field 3"
    },
    {
      "id": "event-uuid-2",
      "title": "Emma's Birthday",
      "startTime": "12:00 AM",
      "endTime": "11:59 PM",
      "date": "2026-01-20",
      "memberId": "member-uuid-2",
      "isAllDay": true,
      "location": null
    }
  ],
  "meta": {
    "timestamp": 1735689600000,
    "requestId": "request-uuid"
  }
}
```

**Behavior Notes:**
- If no date filters provided, return all events (frontend caches aggressively)
- Results should be sorted by date, then by start time
- Empty array for no matching events (not an error)

---

### GET /api/calendar/events/:id

Get a single event by ID.

**Response (200 OK):**
```json
{
  "data": {
    "id": "event-uuid",
    "title": "Soccer Practice",
    "startTime": "4:00 PM",
    "endTime": "5:30 PM",
    "date": "2026-01-15",
    "memberId": "member-uuid",
    "isAllDay": false,
    "location": "City Park Field 3"
  },
  "meta": {
    "timestamp": 1735689600000,
    "requestId": "request-uuid"
  }
}
```

**Error (404 Not Found):**
```json
{
  "code": "NOT_FOUND",
  "message": "Event with id \"invalid-uuid\" not found",
  "status": 404
}
```

---

### POST /api/calendar/events

Create a new calendar event.

**Request:**
```typescript
interface CreateEventRequest {
  title: string;        // 1-200 chars
  startTime: string;    // "9:00 AM" format
  endTime: string;      // "10:00 AM" format
  date: string;         // ISO date "2026-01-15"
  memberId: string;     // UUID
  isAllDay?: boolean;
  location?: string;
}
```

**Example:**
```json
{
  "title": "Team Meeting",
  "startTime": "9:00 AM",
  "endTime": "10:00 AM",
  "date": "2026-01-15",
  "memberId": "550e8400-e29b-41d4-a716-446655440000",
  "location": "Conference Room A"
}
```

**Response (201 Created):**
```json
{
  "data": {
    "id": "new-event-uuid",
    "title": "Team Meeting",
    "startTime": "9:00 AM",
    "endTime": "10:00 AM",
    "date": "2026-01-15",
    "memberId": "550e8400-e29b-41d4-a716-446655440000",
    "isAllDay": false,
    "location": "Conference Room A"
  },
  "message": "Event created successfully"
}
```

**Validation Rules:**
- `title`: Required, 1-200 characters
- `startTime`: Required, valid 12-hour time format
- `endTime`: Required, valid 12-hour time format, must be after startTime
- `date`: Required, valid ISO date
- `memberId`: Required, must exist in family

---

### PATCH /api/calendar/events/:id

Update an existing event.

**Request:**
```typescript
interface UpdateEventRequest {
  title?: string;
  startTime?: string;
  endTime?: string;
  date?: string;
  memberId?: string;
  isAllDay?: boolean;
  location?: string;
}
```

**Response (200 OK):**
```json
{
  "data": {
    "id": "event-uuid",
    "title": "Team Meeting (Updated)",
    "startTime": "9:30 AM",
    "endTime": "10:30 AM",
    "date": "2026-01-15",
    "memberId": "member-uuid",
    "isAllDay": false,
    "location": "Conference Room B"
  },
  "message": "Event updated successfully"
}
```

---

### DELETE /api/calendar/events/:id

Delete an event.

**Response (204 No Content)**

**Error (404 Not Found):**
```json
{
  "code": "NOT_FOUND",
  "message": "Event with id \"invalid-uuid\" not found",
  "status": 404
}
```

---

## Authentication API (New for Backend)

These endpoints are new and don't exist in the mock layer.

### POST /api/auth/register

Register a new user account.

**Request:**
```json
{
  "email": "sarah@example.com",
  "password": "securePassword123!",
  "name": "Sarah"
}
```

**Response (201 Created):**
```json
{
  "data": {
    "user": {
      "id": "user-uuid",
      "email": "sarah@example.com",
      "name": "Sarah"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "dGhpcyBpcyBhIHJlZnJl...",
    "expiresIn": 86400
  },
  "message": "Registration successful"
}
```

---

### POST /api/auth/login

Authenticate and get tokens.

**Request:**
```json
{
  "email": "sarah@example.com",
  "password": "securePassword123!"
}
```

**Response (200 OK):**
```json
{
  "data": {
    "user": {
      "id": "user-uuid",
      "email": "sarah@example.com",
      "name": "Sarah",
      "familyId": "family-uuid",
      "memberId": "member-uuid"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "dGhpcyBpcyBhIHJlZnJl...",
    "expiresIn": 86400
  }
}
```

---

### POST /api/auth/refresh

Refresh access token.

**Request:**
```json
{
  "refreshToken": "dGhpcyBpcyBhIHJlZnJl..."
}
```

**Response (200 OK):**
```json
{
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "expiresIn": 86400
  }
}
```

---

### POST /api/auth/logout

Invalidate refresh token.

**Request:**
```json
{
  "refreshToken": "dGhpcyBpcyBhIHJlZnJl..."
}
```

**Response (204 No Content)**

---

## Health Check

### GET /api/health

System health check (no auth required).

**Response (200 OK):**
```json
{
  "status": "healthy",
  "timestamp": "2026-01-08T12:00:00.000Z",
  "version": "1.0.0",
  "checks": {
    "database": "healthy",
    "redis": "healthy"
  }
}
```

---

## OpenAPI Specification

```yaml
openapi: 3.1.0
info:
  title: FamilyHub API
  version: 1.0.0
  description: Family organization application API

servers:
  - url: http://localhost:8080/api
    description: Local development
  - url: https://api.familyhub.app/api
    description: Production

components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT

  schemas:
    FamilyColor:
      type: string
      enum: [coral, teal, green, purple, yellow, pink, orange]

    FamilyMember:
      type: object
      required: [id, name, color]
      properties:
        id:
          type: string
          format: uuid
        name:
          type: string
          minLength: 1
          maxLength: 50
        color:
          $ref: '#/components/schemas/FamilyColor'
        avatarUrl:
          type: string
          format: uri
        email:
          type: string
          format: email

    FamilyData:
      type: object
      required: [id, name, members, createdAt, setupComplete]
      properties:
        id:
          type: string
          format: uuid
        name:
          type: string
          minLength: 1
          maxLength: 100
        members:
          type: array
          items:
            $ref: '#/components/schemas/FamilyMember'
          minItems: 1
          maxItems: 7
        createdAt:
          type: string
          format: date-time
        setupComplete:
          type: boolean

    CalendarEvent:
      type: object
      required: [id, title, startTime, endTime, date, memberId]
      properties:
        id:
          type: string
          format: uuid
        title:
          type: string
          minLength: 1
          maxLength: 200
        startTime:
          type: string
          pattern: '^(1[0-2]|0?[1-9]):[0-5][0-9] (AM|PM)$'
          example: "9:00 AM"
        endTime:
          type: string
          pattern: '^(1[0-2]|0?[1-9]):[0-5][0-9] (AM|PM)$'
          example: "10:00 AM"
        date:
          type: string
          format: date
          example: "2026-01-15"
        memberId:
          type: string
          format: uuid
        isAllDay:
          type: boolean
          default: false
        location:
          type: string
          maxLength: 500

    ApiError:
      type: object
      required: [code, message, status]
      properties:
        code:
          type: string
          enum: [NETWORK_ERROR, UNAUTHORIZED, FORBIDDEN, NOT_FOUND, VALIDATION_ERROR, CONFLICT, SERVER_ERROR, TIMEOUT]
        message:
          type: string
        status:
          type: integer
        details:
          type: object
        field:
          type: string

security:
  - bearerAuth: []
```

---

## Implementation Checklist

### Phase 1 - MVP
- [ ] `GET /api/health` - Health check
- [ ] `POST /api/auth/register` - User registration
- [ ] `POST /api/auth/login` - User authentication
- [ ] `POST /api/auth/refresh` - Token refresh
- [ ] `POST /api/auth/logout` - Token invalidation
- [ ] `GET /api/family` - Get family
- [ ] `POST /api/family` - Create family
- [ ] `PATCH /api/family` - Update family
- [ ] `DELETE /api/family` - Delete family
- [ ] `POST /api/family/members` - Add member
- [ ] `PATCH /api/family/members/:id` - Update member
- [ ] `DELETE /api/family/members/:id` - Remove member
- [ ] `GET /api/calendar/events` - List events
- [ ] `GET /api/calendar/events/:id` - Get event
- [ ] `POST /api/calendar/events` - Create event
- [ ] `PATCH /api/calendar/events/:id` - Update event
- [ ] `DELETE /api/calendar/events/:id` - Delete event

### Phase 2 - Enhanced
- [ ] `GET /api/family/invite` - Generate invite
- [ ] `POST /api/family/join` - Join via invite
- [ ] Recurring events support
- [ ] WebSocket for real-time updates

---

*This contract is the source of truth for API integration. Any changes must be coordinated between frontend and backend teams.*
