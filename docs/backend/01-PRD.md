# FamilyHub Backend - Product Requirements Document

> **Version:** 1.0
> **Last Updated:** January 2026
> **Status:** Planning Phase

---

## Executive Summary

FamilyHub is a family organization application that helps households coordinate their daily lives through shared calendars, chore management, meal planning, shopping lists, and photo sharing. This document outlines the requirements for building a robust Spring Boot backend to replace the current mock API layer.

### The Vision

Every family struggles with coordination. Whose turn is it to pick up groceries? Did anyone schedule the vet appointment? What's for dinner Tuesday? FamilyHub becomes the central nervous system of your household—a single place where everyone can see what's happening, who's responsible, and what's coming up.

---

## Problem Statement

### Current State
The frontend exists as a functional demo with:
- Mock API handlers simulating backend behavior
- localStorage for data persistence
- Full CRUD operations for Calendar and Family modules
- Type-safe API contracts already defined

### Why This Matters
Without a real backend:
- Data is trapped in individual browsers
- No synchronization between family members' devices
- No data durability (clearing browser data = losing everything)
- No authentication or security
- Can't scale beyond a single-user demo

### Success Criteria
1. **Data Persistence**: All family data survives browser/device changes
2. **Multi-User Access**: All family members access the same data
3. **Real-Time Sync**: Changes appear across devices within seconds
4. **Zero Data Loss**: 99.9% durability guarantee
5. **Performance**: API responses under 200ms p95

---

## Product Scope

### Phase 1: Foundation (MVP)
**Goal**: Replace mock APIs with real backend, enable multi-device access

| Module | Priority | Description |
|--------|----------|-------------|
| **Family** | P0 | Core entity - must exist before anything else |
| **Calendar** | P0 | Primary feature, already fully built on frontend |
| **Authentication** | P0 | Secure access, family membership |

### Phase 2: Feature Expansion
**Goal**: Build out remaining modules

| Module | Priority | Description |
|--------|----------|-------------|
| **Chores** | P1 | Task assignment and tracking |
| **Meals** | P1 | Meal planning and recipes |
| **Lists** | P2 | Shared shopping/todo lists |
| **Photos** | P2 | Family photo sharing |

### Phase 3: Enhanced Experience
**Goal**: Delight users with advanced features

| Feature | Priority | Description |
|---------|----------|-------------|
| **Notifications** | P1 | Push notifications for events/reminders |
| **Recurring Events** | P1 | Daily/weekly/monthly repeat patterns |
| **External Calendar Sync** | P2 | Google Calendar, iCal integration |
| **Mobile Apps** | P2 | Native iOS/Android experiences |

---

## User Stories

### Family Management

```
As a user, I want to create a family so that I can start organizing our household.

Acceptance Criteria:
- I can set a family name
- I can add initial family members with names and colors
- Each member gets a unique identifier
- The family is immediately usable after creation
```

```
As a family admin, I want to invite new members so they can join our family.

Acceptance Criteria:
- I can generate an invite link/code
- New members can join via the link
- New members appear in the family member list
- New members can immediately view/create events
```

```
As a family member, I want to update my profile so my information stays current.

Acceptance Criteria:
- I can change my display name
- I can change my assigned color (if not taken)
- I can upload/change my avatar
- Changes reflect immediately for all family members
```

### Calendar Management

```
As a family member, I want to create events so everyone knows my schedule.

Acceptance Criteria:
- I can set title, date, start/end times
- I can optionally add a location
- I can mark events as all-day
- Events are associated with my member profile
- Events appear immediately on all family devices
```

```
As a family member, I want to filter the calendar by person so I can focus on specific schedules.

Acceptance Criteria:
- I can select one or more family members to view
- Only selected members' events are shown
- Filter state persists during my session
```

```
As a family member, I want to edit/delete my events so I can keep my schedule accurate.

Acceptance Criteria:
- I can modify any event I created
- I can delete events I created
- Family admins can modify/delete any event
- Changes sync immediately to all devices
```

---

## Functional Requirements

### FR-1: Family Entity Management

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-1.1 | System shall support creating a new family with name and initial members | P0 |
| FR-1.2 | System shall generate unique IDs for families and members | P0 |
| FR-1.3 | System shall enforce maximum of 7 members per family (color constraint) | P0 |
| FR-1.4 | System shall prevent duplicate colors within a family | P0 |
| FR-1.5 | System shall prevent removing the last family member | P0 |
| FR-1.6 | System shall support updating family name | P0 |
| FR-1.7 | System shall support soft-delete of families | P1 |

### FR-2: Calendar Event Management

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-2.1 | System shall support CRUD operations for calendar events | P0 |
| FR-2.2 | System shall associate each event with exactly one family member | P0 |
| FR-2.3 | System shall support filtering events by date range | P0 |
| FR-2.4 | System shall support filtering events by family member | P0 |
| FR-2.5 | System shall support all-day events | P0 |
| FR-2.6 | System shall support event locations | P0 |
| FR-2.7 | System shall validate time ranges (end > start) | P0 |
| FR-2.8 | System shall support recurring events | P1 |

### FR-3: Authentication & Authorization

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-3.1 | System shall authenticate users via email/password or OAuth | P0 |
| FR-3.2 | System shall authorize users to access only their family's data | P0 |
| FR-3.3 | System shall support role-based access (admin, member) | P1 |
| FR-3.4 | System shall support password reset flow | P0 |
| FR-3.5 | System shall issue JWT tokens for API authentication | P0 |

---

## Non-Functional Requirements

### NFR-1: Performance

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-1.1 | API response time (p50) | < 100ms |
| NFR-1.2 | API response time (p95) | < 200ms |
| NFR-1.3 | API response time (p99) | < 500ms |
| NFR-1.4 | Concurrent users per family | 10 |
| NFR-1.5 | Events per family | 10,000+ |

### NFR-2: Reliability

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-2.1 | Service availability | 99.9% |
| NFR-2.2 | Data durability | 99.999% |
| NFR-2.3 | Backup frequency | Daily |
| NFR-2.4 | Recovery time objective (RTO) | < 1 hour |
| NFR-2.5 | Recovery point objective (RPO) | < 1 hour |

### NFR-3: Security

| ID | Requirement | Description |
|----|-------------|-------------|
| NFR-3.1 | All API endpoints secured with authentication | Except health checks |
| NFR-3.2 | Passwords hashed with bcrypt (cost factor 12+) | |
| NFR-3.3 | HTTPS required for all communications | |
| NFR-3.4 | JWT tokens expire after 24 hours | Refresh tokens: 30 days |
| NFR-3.5 | Rate limiting on authentication endpoints | 5 attempts/minute |
| NFR-3.6 | SQL injection prevention via parameterized queries | |
| NFR-3.7 | CORS configured for frontend origin only | |

### NFR-4: Scalability

| ID | Requirement | Description |
|----|-------------|-------------|
| NFR-4.1 | Horizontal scaling support | Stateless API design |
| NFR-4.2 | Database connection pooling | HikariCP |
| NFR-4.3 | Caching strategy | Redis for hot data |

---

## Data Model Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                           FAMILY HUB                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────┐         ┌──────────────┐         ┌──────────────┐    │
│  │   USER   │────────▶│    FAMILY    │◀────────│    MEMBER    │    │
│  └──────────┘         └──────────────┘         └──────────────┘    │
│       │                      │                        │             │
│       │                      │                        │             │
│       ▼                      ▼                        ▼             │
│  ┌──────────┐         ┌──────────────┐         ┌──────────────┐    │
│  │  AUTH    │         │    EVENT     │         │    CHORE     │    │
│  │ TOKENS   │         │  (Calendar)  │         │    (P1)      │    │
│  └──────────┘         └──────────────┘         └──────────────┘    │
│                              │                        │             │
│                              │                        │             │
│                              ▼                        ▼             │
│                       ┌──────────────┐         ┌──────────────┐    │
│                       │  RECURRENCE  │         │    MEAL      │    │
│                       │    (P1)      │         │    (P1)      │    │
│                       └──────────────┘         └──────────────┘    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Key Relationships

1. **User → Family**: A user can belong to one family (MVP), many-to-many later
2. **Family → Members**: A family has 1-7 members, each with unique colors
3. **Member → Events**: Each event belongs to exactly one member
4. **Event → Recurrence**: Optional pattern for recurring events

---

## API Contract Summary

The frontend already defines these contracts. Backend must implement them exactly.

### Family Endpoints
```
GET    /api/family              → Get current user's family
POST   /api/family              → Create family (onboarding)
PATCH  /api/family              → Update family properties
DELETE /api/family              → Delete/reset family

POST   /api/family/members      → Add member to family
PATCH  /api/family/members/:id  → Update member
DELETE /api/family/members/:id  → Remove member
```

### Calendar Endpoints
```
GET    /api/calendar/events     → List events (with filters)
GET    /api/calendar/events/:id → Get single event
POST   /api/calendar/events     → Create event
PATCH  /api/calendar/events/:id → Update event
DELETE /api/calendar/events/:id → Delete event
```

See `02-API-CONTRACT.md` for complete OpenAPI specification.

---

## Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Complex auth flows delay MVP | High | Medium | Start with simple email/password, add OAuth later |
| Real-time sync complexity | Medium | High | Start with polling, add WebSockets in P2 |
| Data migration from localStorage | Medium | Medium | Provide one-click import on first authenticated login |
| Performance at scale | High | Low | Design for scale from start, load test early |

---

## Success Metrics

### MVP Launch (Phase 1)
- [ ] All existing frontend features work with real backend
- [ ] Multiple family members can access same data
- [ ] Data persists across browser sessions
- [ ] Response times meet NFR-1 targets
- [ ] Zero critical security vulnerabilities

### Growth Phase (3 months post-launch)
- [ ] 100 active families
- [ ] < 1% error rate
- [ ] User satisfaction > 4.0/5.0
- [ ] Average session length > 5 minutes

---

## Open Questions

1. **Multi-family support**: Should users be able to belong to multiple families? (e.g., co-parenting situations)

2. **Offline support**: How important is offline-first? This significantly impacts architecture.

3. **Data ownership**: When a member leaves, what happens to their events?

4. **Notification preferences**: Email? Push? In-app? All configurable?

5. **External integrations**: Which calendar services are highest priority?

---

## Appendix: Technology Decisions

### Chosen Stack
- **Framework**: Spring Boot 3.x (Java 21)
- **Database**: PostgreSQL 16
- **Caching**: Redis
- **Auth**: Spring Security + JWT
- **API Docs**: SpringDoc OpenAPI
- **Testing**: JUnit 5 + Testcontainers

### Why Spring Boot?
1. **Mature ecosystem** - Battle-tested in production at scale
2. **Strong typing** - Java catches errors at compile time
3. **Spring Security** - Comprehensive auth/authz out of the box
4. **Great tooling** - IDE support, debugging, profiling
5. **Team familiarity** - Already committed to this choice

---

*This document should be treated as a living specification. Update it as requirements evolve.*
