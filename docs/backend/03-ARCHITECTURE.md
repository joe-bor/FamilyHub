# FamilyHub Backend Architecture Guide

> **Target Stack:** Spring Boot 3.x, Java 21, PostgreSQL, Redis
> **Architecture Style:** Layered Architecture with Domain-Driven Design influences

---

## Why This Architecture?

Before diving into structure, let's understand the *why* behind each decision. Architecture isn't about following patterns blindly—it's about making explicit tradeoffs.

### Our Constraints
1. **Small team** - Need simplicity over sophistication
2. **Fast iteration** - Frontend already exists, backend needs to catch up
3. **Scale later** - Design for 100 families now, architect for 10,000 later
4. **Security first** - Family data is sensitive, mistakes are unforgivable

### Our Decisions

| Decision | Alternative Considered | Why We Chose This |
|----------|----------------------|-------------------|
| Layered Architecture | Hexagonal/Clean Architecture | Simpler for small team, sufficient isolation |
| JPA/Hibernate | jOOQ, MyBatis | Spring ecosystem integration, familiarity |
| PostgreSQL | MySQL, MongoDB | JSON support, better standards compliance, robust |
| JWT + Refresh Tokens | Session cookies | Stateless API, mobile-ready |
| Single module | Multi-module Maven | YAGNI - split when needed, not before |

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   React     │  │   Mobile    │  │   Public    │  │   Admin     │        │
│  │   Frontend  │  │   Apps      │  │   API       │  │   Dashboard │        │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘        │
└─────────┼────────────────┼────────────────┼────────────────┼────────────────┘
          │                │                │                │
          └────────────────┴────────────────┴────────────────┘
                                    │
                              HTTPS / JWT
                                    │
┌───────────────────────────────────┴─────────────────────────────────────────┐
│                           API GATEWAY / LOAD BALANCER                        │
│                        (nginx / AWS ALB / Cloud Run)                         │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    │
┌───────────────────────────────────┴─────────────────────────────────────────┐
│                           SPRING BOOT APPLICATION                            │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                        CONTROLLER LAYER                              │    │
│  │   AuthController  │  FamilyController  │  CalendarController        │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                    │                                         │
│  ┌─────────────────────────────────┴───────────────────────────────────┐    │
│  │                        SERVICE LAYER                                 │    │
│  │   AuthService  │  FamilyService  │  CalendarService  │  ...         │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                    │                                         │
│  ┌─────────────────────────────────┴───────────────────────────────────┐    │
│  │                       REPOSITORY LAYER                               │    │
│  │   UserRepository  │  FamilyRepository  │  EventRepository  │  ...   │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                    │                                         │
└────────────────────────────────────┼────────────────────────────────────────┘
                                     │
          ┌──────────────────────────┼──────────────────────────┐
          │                          │                          │
   ┌──────┴──────┐           ┌───────┴───────┐          ┌───────┴───────┐
   │ PostgreSQL  │           │    Redis      │          │     S3        │
   │  (Primary)  │           │   (Cache)     │          │  (Files)      │
   └─────────────┘           └───────────────┘          └───────────────┘
```

---

## Project Structure

```
family-hub-backend/
├── src/
│   ├── main/
│   │   ├── java/com/familyhub/
│   │   │   ├── FamilyHubApplication.java          # Entry point
│   │   │   │
│   │   │   ├── config/                            # Configuration
│   │   │   │   ├── SecurityConfig.java            # Spring Security setup
│   │   │   │   ├── JwtConfig.java                 # JWT settings
│   │   │   │   ├── CorsConfig.java                # CORS policy
│   │   │   │   ├── CacheConfig.java               # Redis cache config
│   │   │   │   └── OpenApiConfig.java             # Swagger/OpenAPI
│   │   │   │
│   │   │   ├── domain/                            # Domain entities
│   │   │   │   ├── user/
│   │   │   │   │   ├── User.java                  # JPA entity
│   │   │   │   │   ├── UserRepository.java        # Data access
│   │   │   │   │   └── RefreshToken.java          # Token entity
│   │   │   │   │
│   │   │   │   ├── family/
│   │   │   │   │   ├── Family.java
│   │   │   │   │   ├── FamilyMember.java
│   │   │   │   │   ├── FamilyColor.java           # Enum
│   │   │   │   │   ├── FamilyRepository.java
│   │   │   │   │   └── FamilyMemberRepository.java
│   │   │   │   │
│   │   │   │   └── calendar/
│   │   │   │       ├── CalendarEvent.java
│   │   │   │       └── CalendarEventRepository.java
│   │   │   │
│   │   │   ├── service/                           # Business logic
│   │   │   │   ├── auth/
│   │   │   │   │   ├── AuthService.java
│   │   │   │   │   ├── JwtService.java
│   │   │   │   │   └── RefreshTokenService.java
│   │   │   │   │
│   │   │   │   ├── family/
│   │   │   │   │   ├── FamilyService.java
│   │   │   │   │   └── FamilyMemberService.java
│   │   │   │   │
│   │   │   │   └── calendar/
│   │   │   │       └── CalendarEventService.java
│   │   │   │
│   │   │   ├── api/                               # REST controllers
│   │   │   │   ├── auth/
│   │   │   │   │   ├── AuthController.java
│   │   │   │   │   ├── dto/
│   │   │   │   │   │   ├── LoginRequest.java
│   │   │   │   │   │   ├── RegisterRequest.java
│   │   │   │   │   │   └── AuthResponse.java
│   │   │   │   │
│   │   │   │   ├── family/
│   │   │   │   │   ├── FamilyController.java
│   │   │   │   │   ├── FamilyMemberController.java
│   │   │   │   │   ├── dto/
│   │   │   │   │   │   ├── CreateFamilyRequest.java
│   │   │   │   │   │   ├── UpdateFamilyRequest.java
│   │   │   │   │   │   ├── FamilyResponse.java
│   │   │   │   │   │   └── ...
│   │   │   │   │
│   │   │   │   ├── calendar/
│   │   │   │   │   ├── CalendarController.java
│   │   │   │   │   ├── dto/
│   │   │   │   │   │   ├── CreateEventRequest.java
│   │   │   │   │   │   ├── UpdateEventRequest.java
│   │   │   │   │   │   ├── EventResponse.java
│   │   │   │   │   │   └── ...
│   │   │   │   │
│   │   │   │   └── common/
│   │   │   │       ├── ApiResponse.java           # Response wrapper
│   │   │   │       ├── ErrorResponse.java         # Error format
│   │   │   │       └── HealthController.java
│   │   │   │
│   │   │   ├── exception/                         # Exception handling
│   │   │   │   ├── GlobalExceptionHandler.java    # @ControllerAdvice
│   │   │   │   ├── ResourceNotFoundException.java
│   │   │   │   ├── ConflictException.java
│   │   │   │   ├── ValidationException.java
│   │   │   │   └── UnauthorizedException.java
│   │   │   │
│   │   │   ├── security/                          # Security components
│   │   │   │   ├── JwtAuthenticationFilter.java
│   │   │   │   ├── UserPrincipal.java             # Custom UserDetails
│   │   │   │   └── CurrentUser.java               # @Annotation for injection
│   │   │   │
│   │   │   └── util/                              # Utilities
│   │   │       ├── TimeUtils.java                 # Time format conversions
│   │   │       └── IdGenerator.java               # UUID generation
│   │   │
│   │   └── resources/
│   │       ├── application.yml                    # Main config
│   │       ├── application-dev.yml                # Dev overrides
│   │       ├── application-prod.yml               # Prod overrides
│   │       └── db/migration/                      # Flyway migrations
│   │           ├── V1__create_users_table.sql
│   │           ├── V2__create_families_table.sql
│   │           ├── V3__create_events_table.sql
│   │           └── ...
│   │
│   └── test/
│       └── java/com/familyhub/
│           ├── integration/                       # Integration tests
│           │   ├── FamilyApiTests.java
│           │   └── CalendarApiTests.java
│           │
│           ├── service/                           # Unit tests
│           │   ├── FamilyServiceTests.java
│           │   └── ...
│           │
│           └── TestContainersConfig.java          # Testcontainers setup
│
├── docker/
│   ├── Dockerfile
│   └── docker-compose.yml                         # Local dev environment
│
├── pom.xml                                        # Maven config
└── README.md
```

---

## Layer Responsibilities

### Controller Layer (API)
**Purpose:** HTTP request/response handling, input validation, authentication context

```java
@RestController
@RequestMapping("/api/family")
@RequiredArgsConstructor
public class FamilyController {

    private final FamilyService familyService;

    @GetMapping
    public ApiResponse<FamilyResponse> getFamily(@CurrentUser UserPrincipal user) {
        // Controllers should be thin - delegate to service
        return ApiResponse.of(familyService.getFamilyForUser(user.getFamilyId()));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public MutationResponse<FamilyResponse> createFamily(
            @Valid @RequestBody CreateFamilyRequest request,
            @CurrentUser UserPrincipal user) {
        // Validation handled by @Valid + Bean Validation
        FamilyResponse family = familyService.createFamily(user.getId(), request);
        return MutationResponse.of(family, "Family created successfully");
    }
}
```

**Rules:**
- NO business logic - only orchestration
- Always use DTOs for request/response (never expose entities)
- Use `@Valid` for input validation
- Return appropriate HTTP status codes

### Service Layer
**Purpose:** Business logic, transaction boundaries, authorization rules

```java
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class FamilyService {

    private final FamilyRepository familyRepository;
    private final FamilyMemberRepository memberRepository;
    private final FamilyMapper mapper;

    public FamilyResponse getFamilyForUser(UUID familyId) {
        if (familyId == null) {
            return null; // No family yet - triggers onboarding
        }

        Family family = familyRepository.findById(familyId)
            .orElseThrow(() -> new ResourceNotFoundException("Family", familyId));

        return mapper.toResponse(family);
    }

    @Transactional
    public FamilyResponse createFamily(UUID userId, CreateFamilyRequest request) {
        // Business rule: user can only have one family
        if (familyRepository.existsByCreatorId(userId)) {
            throw new ConflictException("Family already exists");
        }

        // Business rule: validate colors are unique
        validateUniqueColors(request.getMembers());

        Family family = mapper.toEntity(request);
        family.setCreatorId(userId);

        familyRepository.save(family);

        return mapper.toResponse(family);
    }

    private void validateUniqueColors(List<MemberRequest> members) {
        Set<FamilyColor> colors = new HashSet<>();
        for (MemberRequest member : members) {
            if (!colors.add(member.getColor())) {
                throw new ValidationException("color",
                    "Color " + member.getColor() + " is used multiple times");
            }
        }
    }
}
```

**Rules:**
- All business logic lives here
- Transaction boundaries are explicit
- Use domain exceptions, not generic ones
- Services can call other services (but avoid circular dependencies)

### Repository Layer
**Purpose:** Data access abstraction

```java
public interface FamilyRepository extends JpaRepository<Family, UUID> {

    Optional<Family> findByCreatorId(UUID creatorId);

    boolean existsByCreatorId(UUID creatorId);

    @Query("SELECT f FROM Family f JOIN FETCH f.members WHERE f.id = :id")
    Optional<Family> findByIdWithMembers(@Param("id") UUID id);
}
```

**Rules:**
- Extend Spring Data interfaces
- Custom queries only when needed
- Use `@Query` for complex queries, avoid raw SQL

### Domain Layer (Entities)
**Purpose:** Data structure, JPA mappings, basic validation

```java
@Entity
@Table(name = "families")
@Getter @Setter
@NoArgsConstructor
public class Family {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(name = "creator_id", nullable = false)
    private UUID creatorId;

    @OneToMany(mappedBy = "family", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("createdAt ASC")
    private List<FamilyMember> members = new ArrayList<>();

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "setup_complete", nullable = false)
    private boolean setupComplete = false;

    @PrePersist
    protected void onCreate() {
        createdAt = Instant.now();
    }

    // Business methods can live on entities for cohesion
    public void addMember(FamilyMember member) {
        if (members.size() >= 7) {
            throw new IllegalStateException("Maximum 7 members allowed");
        }
        members.add(member);
        member.setFamily(this);
    }
}
```

---

## Database Schema

```sql
-- V1__create_users_table.sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    family_id UUID,
    member_id UUID,
    role VARCHAR(20) NOT NULL DEFAULT 'member',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_family_id ON users(family_id);

-- V2__create_families_table.sql
CREATE TABLE families (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    creator_id UUID NOT NULL REFERENCES users(id),
    setup_complete BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE family_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    color VARCHAR(20) NOT NULL,
    avatar_url VARCHAR(500),
    email VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    CONSTRAINT uk_family_member_color UNIQUE (family_id, color)
);

CREATE INDEX idx_family_members_family_id ON family_members(family_id);

-- Add foreign key from users to family_members
ALTER TABLE users
ADD CONSTRAINT fk_users_family FOREIGN KEY (family_id) REFERENCES families(id),
ADD CONSTRAINT fk_users_member FOREIGN KEY (member_id) REFERENCES family_members(id);

-- V3__create_events_table.sql
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
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_event_times CHECK (end_time > start_time OR is_all_day = true)
);

CREATE INDEX idx_events_family_date ON calendar_events(family_id, event_date);
CREATE INDEX idx_events_member ON calendar_events(member_id);

-- V4__create_refresh_tokens_table.sql
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_expires ON refresh_tokens(expires_at);
```

---

## Security Architecture

### Authentication Flow

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Client  │     │   API    │     │  Auth    │     │   DB     │
└────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘
     │                │                │                │
     │ POST /login    │                │                │
     │ {email, pass}  │                │                │
     │───────────────▶│                │                │
     │                │ validate       │                │
     │                │───────────────▶│                │
     │                │                │ find user      │
     │                │                │───────────────▶│
     │                │                │◀───────────────│
     │                │                │                │
     │                │                │ verify password│
     │                │                │ generate JWT   │
     │                │                │ create refresh │
     │                │◀───────────────│                │
     │                │                │ store token    │
     │                │                │───────────────▶│
     │ {accessToken,  │                │                │
     │  refreshToken} │                │                │
     │◀───────────────│                │                │
     │                │                │                │

     ... later ...

     │ GET /api/family│                │                │
     │ Auth: Bearer x │                │                │
     │───────────────▶│                │                │
     │                │ validate JWT   │                │
     │                │───────────────▶│                │
     │                │◀───────────────│                │
     │                │ extract claims │                │
     │                │ set security   │                │
     │                │ context        │                │
     │ {family data}  │                │                │
     │◀───────────────│                │                │
```

### JWT Implementation

```java
@Service
@RequiredArgsConstructor
public class JwtService {

    private final JwtConfig config;

    public String generateAccessToken(User user) {
        return Jwts.builder()
            .subject(user.getId().toString())
            .claim("familyId", user.getFamilyId())
            .claim("memberId", user.getMemberId())
            .claim("role", user.getRole().name())
            .issuedAt(new Date())
            .expiration(Date.from(Instant.now().plus(config.getAccessTokenExpiry())))
            .signWith(getSigningKey())
            .compact();
    }

    public Claims validateToken(String token) {
        return Jwts.parser()
            .verifyWith(getSigningKey())
            .build()
            .parseSignedClaims(token)
            .getPayload();
    }

    private SecretKey getSigningKey() {
        return Keys.hmacShaKeyFor(config.getSecret().getBytes(StandardCharsets.UTF_8));
    }
}
```

### Security Filter Chain

```java
@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtFilter;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        return http
            .csrf(csrf -> csrf.disable()) // Stateless API
            .sessionManagement(session ->
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/health").permitAll()
                .requestMatchers("/api/auth/**").permitAll()
                .requestMatchers("/api/docs/**", "/swagger-ui/**").permitAll()
                .anyRequest().authenticated())
            .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class)
            .exceptionHandling(ex -> ex
                .authenticationEntryPoint(new JwtAuthenticationEntryPoint()))
            .build();
    }
}
```

---

## Error Handling

### Exception Hierarchy

```java
// Base exception
public abstract class FamilyHubException extends RuntimeException {
    private final String code;
    private final int status;

    protected FamilyHubException(String message, String code, int status) {
        super(message);
        this.code = code;
        this.status = status;
    }
}

// Specific exceptions
public class ResourceNotFoundException extends FamilyHubException {
    public ResourceNotFoundException(String resource, UUID id) {
        super(resource + " with id \"" + id + "\" not found",
              "NOT_FOUND", 404);
    }
}

public class ConflictException extends FamilyHubException {
    public ConflictException(String message) {
        super(message, "CONFLICT", 409);
    }
}

public class ValidationException extends FamilyHubException {
    private final String field;

    public ValidationException(String field, String message) {
        super(message, "VALIDATION_ERROR", 400);
        this.field = field;
    }
}
```

### Global Exception Handler

```java
@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    @ExceptionHandler(FamilyHubException.class)
    public ResponseEntity<ErrorResponse> handleFamilyHubException(FamilyHubException ex) {
        log.warn("Business exception: {}", ex.getMessage());

        ErrorResponse error = ErrorResponse.builder()
            .code(ex.getCode())
            .message(ex.getMessage())
            .status(ex.getStatus())
            .field(ex instanceof ValidationException ?
                   ((ValidationException) ex).getField() : null)
            .build();

        return ResponseEntity.status(ex.getStatus()).body(error);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidation(MethodArgumentNotValidException ex) {
        FieldError fieldError = ex.getBindingResult().getFieldError();

        ErrorResponse error = ErrorResponse.builder()
            .code("VALIDATION_ERROR")
            .message(fieldError != null ? fieldError.getDefaultMessage() : "Validation failed")
            .status(400)
            .field(fieldError != null ? fieldError.getField() : null)
            .build();

        return ResponseEntity.badRequest().body(error);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleUnexpected(Exception ex) {
        log.error("Unexpected error", ex);

        ErrorResponse error = ErrorResponse.builder()
            .code("SERVER_ERROR")
            .message("An unexpected error occurred")
            .status(500)
            .build();

        return ResponseEntity.internalServerError().body(error);
    }
}
```

---

## Configuration

### application.yml

```yaml
spring:
  application:
    name: family-hub-api

  datasource:
    url: jdbc:postgresql://${DB_HOST:localhost}:${DB_PORT:5432}/${DB_NAME:familyhub}
    username: ${DB_USERNAME:familyhub}
    password: ${DB_PASSWORD}
    hikari:
      maximum-pool-size: 10
      minimum-idle: 5
      connection-timeout: 20000

  jpa:
    hibernate:
      ddl-auto: validate  # Flyway handles migrations
    properties:
      hibernate:
        dialect: org.hibernate.dialect.PostgreSQLDialect
        format_sql: true
    open-in-view: false  # Important for performance

  flyway:
    enabled: true
    locations: classpath:db/migration

  data:
    redis:
      host: ${REDIS_HOST:localhost}
      port: ${REDIS_PORT:6379}

jwt:
  secret: ${JWT_SECRET}  # Must be at least 256 bits for HS256
  access-token-expiry: 24h
  refresh-token-expiry: 30d

server:
  port: ${PORT:8080}

management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics
  endpoint:
    health:
      show-details: when_authorized

logging:
  level:
    com.familyhub: DEBUG
    org.springframework.security: DEBUG
```

---

## Testing Strategy

### Unit Tests
- Test service layer in isolation
- Mock repositories
- Focus on business logic

```java
@ExtendWith(MockitoExtension.class)
class FamilyServiceTest {

    @Mock
    private FamilyRepository familyRepository;

    @Mock
    private FamilyMapper mapper;

    @InjectMocks
    private FamilyService familyService;

    @Test
    void createFamily_withDuplicateColors_throwsValidationException() {
        // Given
        CreateFamilyRequest request = new CreateFamilyRequest();
        request.setName("Test Family");
        request.setMembers(List.of(
            new MemberRequest("Alice", FamilyColor.CORAL),
            new MemberRequest("Bob", FamilyColor.CORAL) // Duplicate!
        ));

        // When/Then
        assertThatThrownBy(() -> familyService.createFamily(UUID.randomUUID(), request))
            .isInstanceOf(ValidationException.class)
            .hasMessageContaining("CORAL");
    }
}
```

### Integration Tests
- Test full request/response cycle
- Use Testcontainers for real PostgreSQL
- Test auth flows end-to-end

```java
@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT)
@Testcontainers
class FamilyApiIntegrationTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16");

    @Autowired
    private TestRestTemplate restTemplate;

    @Test
    void createFamily_withValidRequest_returnsCreatedFamily() {
        // Given
        String token = loginAndGetToken("test@example.com");

        CreateFamilyRequest request = new CreateFamilyRequest();
        request.setName("Integration Test Family");
        request.setMembers(List.of(
            new MemberRequest("Alice", FamilyColor.CORAL)
        ));

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);

        // When
        ResponseEntity<FamilyResponse> response = restTemplate.exchange(
            "/api/family",
            HttpMethod.POST,
            new HttpEntity<>(request, headers),
            FamilyResponse.class
        );

        // Then
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody().getName()).isEqualTo("Integration Test Family");
        assertThat(response.getBody().getMembers()).hasSize(1);
    }
}
```

---

## Deployment Considerations

### Docker

```dockerfile
FROM eclipse-temurin:21-jre-alpine

WORKDIR /app

COPY target/family-hub-api.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
```

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DB_HOST` | PostgreSQL host | Yes |
| `DB_PORT` | PostgreSQL port | No (default: 5432) |
| `DB_NAME` | Database name | Yes |
| `DB_USERNAME` | Database user | Yes |
| `DB_PASSWORD` | Database password | Yes |
| `JWT_SECRET` | JWT signing secret (256+ bits) | Yes |
| `REDIS_HOST` | Redis host | No (default: localhost) |
| `REDIS_PORT` | Redis port | No (default: 6379) |

---

## Performance Considerations

1. **Connection Pooling**: HikariCP configured with appropriate pool sizes
2. **N+1 Prevention**: Use `@EntityGraph` or `JOIN FETCH` for eager loading
3. **Pagination**: All list endpoints should support pagination
4. **Caching**: Cache family data (changes infrequently) in Redis
5. **Indexes**: Database indexes on frequently queried columns

---

*This architecture guide should evolve as the system grows. Document decisions and their rationale.*
