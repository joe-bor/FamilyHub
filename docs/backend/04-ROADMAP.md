# FamilyHub Backend Development Roadmap

> **Purpose:** Step-by-step implementation guide for the Spring Boot backend
> **Approach:** Incremental delivery with working software at each milestone

---

## Philosophy

This roadmap follows these principles:

1. **Vertical Slices** - Deliver complete features, not horizontal layers
2. **Working Software** - Each phase ends with deployable, testable code
3. **Frontend First** - Priority based on what frontend needs to function
4. **Fail Fast** - Tackle risky integrations early (auth, DB)

---

## Pre-Development Checklist

Before writing code, ensure you have:

- [ ] Java 21 installed (`java -version`)
- [ ] Maven 3.9+ installed (`mvn -version`)
- [ ] Docker installed (for local PostgreSQL/Redis)
- [ ] IDE configured (IntelliJ recommended)
- [ ] PostgreSQL client (DBeaver, pgAdmin, or CLI)
- [ ] Postman or similar for API testing

---

## Phase 0: Project Bootstrap

**Goal:** Working Spring Boot application with CI pipeline

### Tasks

#### 0.1 Initialize Project
```bash
# Use Spring Initializr (start.spring.io) or CLI
spring init \
  --java-version=21 \
  --dependencies=web,data-jpa,postgresql,security,validation,flyway,lombok,actuator \
  --group-id=com.familyhub \
  --artifact-id=family-hub-api \
  --name=FamilyHubApi \
  family-hub-backend
```

#### 0.2 Configure Docker Compose
Create `docker/docker-compose.yml`:
```yaml
version: '3.8'
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: familyhub
      POSTGRES_PASSWORD: localdev
      POSTGRES_DB: familyhub
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  postgres_data:
```

#### 0.3 Add Core Dependencies
Update `pom.xml`:
```xml
<dependencies>
    <!-- JWT -->
    <dependency>
        <groupId>io.jsonwebtoken</groupId>
        <artifactId>jjwt-api</artifactId>
        <version>0.12.3</version>
    </dependency>
    <dependency>
        <groupId>io.jsonwebtoken</groupId>
        <artifactId>jjwt-impl</artifactId>
        <version>0.12.3</version>
        <scope>runtime</scope>
    </dependency>
    <dependency>
        <groupId>io.jsonwebtoken</groupId>
        <artifactId>jjwt-jackson</artifactId>
        <version>0.12.3</version>
        <scope>runtime</scope>
    </dependency>

    <!-- OpenAPI -->
    <dependency>
        <groupId>org.springdoc</groupId>
        <artifactId>springdoc-openapi-starter-webmvc-ui</artifactId>
        <version>2.3.0</version>
    </dependency>

    <!-- Testing -->
    <dependency>
        <groupId>org.testcontainers</groupId>
        <artifactId>postgresql</artifactId>
        <scope>test</scope>
    </dependency>
    <dependency>
        <groupId>org.testcontainers</groupId>
        <artifactId>junit-jupiter</artifactId>
        <scope>test</scope>
    </dependency>
</dependencies>
```

#### 0.4 Create Health Endpoint
```java
@RestController
@RequestMapping("/api")
public class HealthController {

    @GetMapping("/health")
    public Map<String, Object> health() {
        return Map.of(
            "status", "healthy",
            "timestamp", Instant.now().toString(),
            "version", "0.1.0"
        );
    }
}
```

#### 0.5 Setup CI Pipeline
Create `.github/workflows/ci.yml`:
```yaml
name: CI
on: [push, pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: familyhub_test
        ports:
          - 5432:5432
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          java-version: '21'
          distribution: 'temurin'
      - run: mvn verify
```

### Deliverable
- Application starts successfully
- `/api/health` returns 200
- CI pipeline passes

---

## Phase 1: Authentication System

**Goal:** Users can register, login, and make authenticated requests

### Tasks

#### 1.1 Database Schema
Create `V1__create_users_table.sql`:
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    family_id UUID,
    member_id UUID,
    role VARCHAR(20) NOT NULL DEFAULT 'member',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

#### 1.2 User Entity & Repository
```java
@Entity
@Table(name = "users")
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Column(nullable = false)
    private String name;

    @Column(name = "family_id")
    private UUID familyId;

    @Column(name = "member_id")
    private UUID memberId;

    @Enumerated(EnumType.STRING)
    private UserRole role = UserRole.MEMBER;

    // ... getters, setters
}
```

#### 1.3 JWT Service
Implement token generation and validation (see Architecture doc)

#### 1.4 Auth Controller
```java
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public AuthResponse register(@Valid @RequestBody RegisterRequest request);

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest request);

    @PostMapping("/refresh")
    public TokenResponse refresh(@Valid @RequestBody RefreshRequest request);

    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void logout(@Valid @RequestBody RefreshRequest request);
}
```

#### 1.5 Security Configuration
Configure Spring Security filter chain with JWT validation

#### 1.6 Write Tests
- Unit tests for JwtService
- Integration tests for auth endpoints
- Test invalid token handling

### Deliverable
- Users can register with email/password
- Users can login and receive tokens
- Protected endpoints require valid JWT
- Tokens can be refreshed

---

## Phase 2: Family Module

**Goal:** Complete family CRUD matching frontend contract

### Tasks

#### 2.1 Database Schema
Create `V2__create_families_table.sql`:
```sql
CREATE TABLE families (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    creator_id UUID NOT NULL REFERENCES users(id),
    setup_complete BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE family_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    color VARCHAR(20) NOT NULL,
    avatar_url VARCHAR(500),
    email VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_family_member_color UNIQUE (family_id, color)
);
```

#### 2.2 Entities & Repositories
Create `Family`, `FamilyMember` entities with proper JPA relationships

#### 2.3 Family Service
Implement business logic:
- Create family with members
- Update family name
- Add/update/remove members
- Validate color uniqueness
- Enforce max 7 members

#### 2.4 Family Controller
Match API contract exactly:
```java
@RestController
@RequestMapping("/api/family")
public class FamilyController {

    @GetMapping
    public ApiResponse<FamilyResponse> getFamily(@CurrentUser UserPrincipal user);

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public MutationResponse<FamilyResponse> createFamily(
        @Valid @RequestBody CreateFamilyRequest request,
        @CurrentUser UserPrincipal user);

    @PatchMapping
    public MutationResponse<FamilyResponse> updateFamily(
        @Valid @RequestBody UpdateFamilyRequest request,
        @CurrentUser UserPrincipal user);

    @DeleteMapping
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteFamily(@CurrentUser UserPrincipal user);
}

@RestController
@RequestMapping("/api/family/members")
public class FamilyMemberController {

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public MutationResponse<MemberResponse> addMember(...);

    @PatchMapping("/{id}")
    public MutationResponse<MemberResponse> updateMember(...);

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void removeMember(...);
}
```

#### 2.5 Response DTOs
Match frontend types exactly:
```java
public record FamilyResponse(
    UUID id,
    String name,
    List<MemberResponse> members,
    Instant createdAt,
    boolean setupComplete
) {}

public record MemberResponse(
    UUID id,
    String name,
    FamilyColor color,
    String avatarUrl,
    String email
) {}
```

#### 2.6 Write Tests
- Service unit tests for all business rules
- Integration tests for full CRUD flow
- Test error cases (conflict, not found, validation)

### Deliverable
- Family CRUD operations work via API
- Frontend can create/manage families
- All error responses match contract

---

## Phase 3: Calendar Module

**Goal:** Complete calendar event CRUD with filtering

### Tasks

#### 3.1 Database Schema
Create `V3__create_events_table.sql`:
```sql
CREATE TABLE calendar_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES family_members(id),
    title VARCHAR(200) NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    event_date DATE NOT NULL,
    is_all_day BOOLEAN NOT NULL DEFAULT false,
    location VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_events_family_date ON calendar_events(family_id, event_date);
```

#### 3.2 Entity & Repository
```java
@Entity
@Table(name = "calendar_events")
public class CalendarEvent {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "family_id", nullable = false)
    private UUID familyId;

    @Column(name = "member_id", nullable = false)
    private UUID memberId;

    @Column(nullable = false)
    private String title;

    @Column(name = "start_time", nullable = false)
    private LocalTime startTime;

    @Column(name = "end_time", nullable = false)
    private LocalTime endTime;

    @Column(name = "event_date", nullable = false)
    private LocalDate eventDate;

    @Column(name = "is_all_day")
    private boolean isAllDay;

    private String location;
}
```

#### 3.3 Time Format Utilities
Handle 12-hour format conversion:
```java
public class TimeUtils {

    private static final DateTimeFormatter TIME_12H =
        DateTimeFormatter.ofPattern("h:mm a");

    public static LocalTime parse12Hour(String time) {
        return LocalTime.parse(time.toUpperCase(), TIME_12H);
    }

    public static String format12Hour(LocalTime time) {
        return time.format(TIME_12H);
    }
}
```

#### 3.4 Calendar Service
Implement:
- CRUD operations
- Date range filtering
- Member filtering
- Time validation (end > start)

#### 3.5 Calendar Controller
```java
@RestController
@RequestMapping("/api/calendar/events")
public class CalendarController {

    @GetMapping
    public ApiResponse<List<EventResponse>> getEvents(
        @RequestParam(required = false) LocalDate startDate,
        @RequestParam(required = false) LocalDate endDate,
        @RequestParam(required = false) UUID memberId,
        @CurrentUser UserPrincipal user);

    @GetMapping("/{id}")
    public ApiResponse<EventResponse> getEvent(
        @PathVariable UUID id,
        @CurrentUser UserPrincipal user);

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public MutationResponse<EventResponse> createEvent(
        @Valid @RequestBody CreateEventRequest request,
        @CurrentUser UserPrincipal user);

    @PatchMapping("/{id}")
    public MutationResponse<EventResponse> updateEvent(
        @PathVariable UUID id,
        @Valid @RequestBody UpdateEventRequest request,
        @CurrentUser UserPrincipal user);

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteEvent(
        @PathVariable UUID id,
        @CurrentUser UserPrincipal user);
}
```

#### 3.6 Write Tests
- Test time parsing/formatting
- Test date range filtering
- Test member filtering
- Test authorization (can't access other family's events)

### Deliverable
- Full calendar CRUD works via API
- Frontend calendar module fully functional
- Filtering by date and member works

---

## Phase 4: Frontend Integration

**Goal:** Connect frontend to real backend, migrate from mocks

### Tasks

#### 4.1 CORS Configuration
```java
@Configuration
public class CorsConfig implements WebMvcConfigurer {

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
            .allowedOrigins("http://localhost:5173")
            .allowedMethods("GET", "POST", "PATCH", "DELETE", "OPTIONS")
            .allowedHeaders("*")
            .allowCredentials(true);
    }
}
```

#### 4.2 Update Frontend Config
In frontend, update environment:
```typescript
// .env.development
VITE_API_BASE_URL=http://localhost:8080/api

// .env.production
VITE_API_BASE_URL=https://api.familyhub.app/api
```

#### 4.3 Add Auth to Frontend
Create new hooks/context for authentication:
- Login/register forms
- Token storage (secure httpOnly cookies preferred)
- Auth context provider
- Protected route wrapper

#### 4.4 Disable Mock Layer
```typescript
// Toggle USE_MOCK_API to false
export const USE_MOCK_API = false;
```

#### 4.5 Data Migration Tool
Create utility to migrate localStorage data:
```typescript
async function migrateLocalData() {
  const localFamily = localStorage.getItem('family-hub-family');
  if (localFamily) {
    // Parse and send to backend
    await familyService.createFamily(parsedFamily);
    localStorage.removeItem('family-hub-family');
  }
}
```

#### 4.6 End-to-End Testing
Run Playwright tests against real backend

### Deliverable
- Frontend works with real backend
- Existing localStorage data can be migrated
- E2E tests pass

---

## Phase 5: Production Readiness

**Goal:** Deploy to production environment

### Tasks

#### 5.1 Environment Configuration
- Production database (managed PostgreSQL)
- Production Redis (managed or ElastiCache)
- Secret management (environment variables or vault)

#### 5.2 Dockerfile
```dockerfile
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
```

#### 5.3 Health Checks
Enhanced health endpoint:
```java
@GetMapping("/health")
public Map<String, Object> health() {
    return Map.of(
        "status", "healthy",
        "timestamp", Instant.now(),
        "version", buildVersion,
        "checks", Map.of(
            "database", checkDatabase(),
            "redis", checkRedis()
        )
    );
}
```

#### 5.4 Logging & Monitoring
- Structured JSON logging
- Request/response logging (sanitized)
- Metrics endpoint for Prometheus
- Error alerting setup

#### 5.5 Rate Limiting
```java
// Add rate limiting to auth endpoints
@RateLimited(requests = 5, period = 60) // 5 per minute
@PostMapping("/login")
public AuthResponse login(...);
```

#### 5.6 Security Hardening
- HTTPS enforced
- Security headers (CSP, HSTS, etc.)
- Input sanitization
- SQL injection prevention (already via JPA)
- Dependency vulnerability scanning

### Deliverable
- Deployed to production
- Monitoring dashboard active
- Automated deployments working

---

## Future Phases (Post-MVP)

### Phase 6: Chores Module
- [ ] Chore entity with recurrence
- [ ] Assignment to family members
- [ ] Completion tracking
- [ ] Due date reminders

### Phase 7: Meals Module
- [ ] Meal plan entity
- [ ] Recipe storage
- [ ] Shopping list generation
- [ ] Nutritional info (optional)

### Phase 8: Real-Time Updates
- [ ] WebSocket integration
- [ ] Live event updates
- [ ] Typing indicators
- [ ] Online presence

### Phase 9: External Integrations
- [ ] Google Calendar sync
- [ ] Apple Calendar sync
- [ ] Push notifications (FCM/APNs)
- [ ] Email notifications

---

## Appendix: Quick Reference Commands

### Development
```bash
# Start dependencies
docker compose -f docker/docker-compose.yml up -d

# Run application
./mvnw spring-boot:run

# Run tests
./mvnw test

# Run with specific profile
./mvnw spring-boot:run -Dspring.profiles.active=dev

# Generate OpenAPI spec
curl http://localhost:8080/api/docs > openapi.json
```

### Database
```bash
# Connect to local database
psql -h localhost -U familyhub -d familyhub

# Run migrations manually
./mvnw flyway:migrate

# Reset database
./mvnw flyway:clean flyway:migrate
```

### Docker
```bash
# Build image
docker build -t family-hub-api .

# Run container
docker run -p 8080:8080 \
  -e DB_HOST=host.docker.internal \
  -e DB_PASSWORD=secret \
  -e JWT_SECRET=your-secret \
  family-hub-api
```

---

*Track progress in GitHub Issues/Projects. Each phase should have its own milestone.*
