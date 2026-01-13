# FamilyHub Backend - Quick Start Guide

> **Start here.** This guide gets you from zero to running backend in under 30 minutes.

---

## What You're Building

You have a beautiful React frontend that currently runs entirely in the browser with mock data. You're about to give it a real backend, which means:

- **Real persistence** - Data survives browser refreshes, device changes
- **Multi-user support** - Your whole family can access the same data
- **Security** - Proper authentication, no data leaks
- **Scalability** - From demo to production-ready

---

## The Documents

I've created four detailed documents. Here's what each covers and when to read them:

| Document | Purpose | When to Read |
|----------|---------|--------------|
| [01-PRD.md](./01-PRD.md) | Product vision, requirements, success criteria | **Now** - understand what you're building |
| [02-API-CONTRACT.md](./02-API-CONTRACT.md) | Exact API specifications your backend must implement | **During development** - your source of truth |
| [03-ARCHITECTURE.md](./03-ARCHITECTURE.md) | Code structure, patterns, technical decisions | **Before coding** - understand the why |
| [04-ROADMAP.md](./04-ROADMAP.md) | Step-by-step implementation phases | **During development** - your checklist |

---

## The 30-Minute Setup

### Prerequisites Check
```bash
# Java 21
java -version  # Should show 21.x

# Maven
mvn -version  # Should show 3.9+

# Docker
docker --version  # Any recent version
```

### Step 1: Create the Project (5 min)

Option A - Spring Initializr CLI:
```bash
curl https://start.spring.io/starter.tgz \
  -d type=maven-project \
  -d language=java \
  -d bootVersion=3.2.0 \
  -d baseDir=family-hub-backend \
  -d groupId=com.familyhub \
  -d artifactId=api \
  -d name=FamilyHubApi \
  -d javaVersion=21 \
  -d dependencies=web,data-jpa,postgresql,security,validation,flyway,lombok,actuator \
  | tar -xzf -
```

Option B - [start.spring.io](https://start.spring.io):
1. Set Java version to 21
2. Add dependencies: Spring Web, Spring Data JPA, PostgreSQL Driver, Spring Security, Validation, Flyway Migration, Lombok, Actuator
3. Generate and extract

### Step 2: Start Database (2 min)

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

volumes:
  postgres_data:
```

Start it:
```bash
cd family-hub-backend
docker compose -f docker/docker-compose.yml up -d
```

### Step 3: Configure Application (5 min)

Update `src/main/resources/application.yml`:
```yaml
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/familyhub
    username: familyhub
    password: localdev
  jpa:
    hibernate:
      ddl-auto: validate
    open-in-view: false
  flyway:
    enabled: true
    locations: classpath:db/migration

jwt:
  secret: your-256-bit-secret-key-change-in-production-please
  access-token-expiry: 24h
  refresh-token-expiry: 30d

server:
  port: 8080
```

### Step 4: Add Health Endpoint (5 min)

Create `src/main/java/com/familyhub/api/HealthController.java`:
```java
package com.familyhub.api;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import java.time.Instant;
import java.util.Map;

@RestController
public class HealthController {

    @GetMapping("/api/health")
    public Map<String, Object> health() {
        return Map.of(
            "status", "healthy",
            "timestamp", Instant.now().toString(),
            "version", "0.1.0"
        );
    }
}
```

### Step 5: Disable Security Temporarily (2 min)

Create `src/main/java/com/familyhub/config/SecurityConfig.java`:
```java
package com.familyhub.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        return http
            .csrf(csrf -> csrf.disable())
            .authorizeHttpRequests(auth -> auth.anyRequest().permitAll())
            .build();
    }
}
```

### Step 6: Create First Migration (5 min)

Create `src/main/resources/db/migration/V1__initial_schema.sql`:
```sql
-- Just a placeholder to verify Flyway works
CREATE TABLE schema_info (
    id SERIAL PRIMARY KEY,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO schema_info (description) VALUES ('Initial schema setup');
```

### Step 7: Run It! (2 min)

```bash
./mvnw spring-boot:run
```

Test it:
```bash
curl http://localhost:8080/api/health
```

You should see:
```json
{"status":"healthy","timestamp":"2026-01-08T12:00:00Z","version":"0.1.0"}
```

---

## What's Next?

Now that you have a running skeleton, follow the roadmap:

1. **Read the PRD** (`01-PRD.md`) to understand the full scope
2. **Study the Architecture** (`03-ARCHITECTURE.md`) before writing more code
3. **Keep the API Contract** (`02-API-CONTRACT.md`) open as you implement
4. **Follow the Roadmap** (`04-ROADMAP.md`) phase by phase

### Immediate Next Steps

1. **Phase 1: Authentication** - This is foundational. You can't do anything without it.
   - Add JWT dependencies to pom.xml
   - Create User entity and migration
   - Implement register/login endpoints

2. **Phase 2: Family Module** - This unlocks the frontend
   - The frontend literally can't work without this
   - Follow the API contract exactly

3. **Phase 3: Calendar Module** - The main feature
   - Most complex module
   - Pay attention to time format handling

---

## Key Reminders

### The API Contract is LAW

Your frontend already expects specific request/response formats. The mock handlers show exactly what the backend needs to do. Don't deviate from the contract.

Example - This is what the frontend expects:
```json
{
  "data": {
    "id": "uuid",
    "name": "The Johnsons",
    "members": [...],
    "setupComplete": true
  },
  "meta": {
    "timestamp": 1735689600000,
    "requestId": "uuid"
  }
}
```

### Time Formats Matter

The frontend uses 12-hour time strings: `"9:00 AM"`, `"2:30 PM"`

Your backend should:
- Accept these strings in requests
- Return these strings in responses
- Store as `LocalTime` internally
- Use the `TimeUtils` helper for conversion

### Test Against the Frontend

The best test is: does the frontend work?

1. Start your backend
2. Update frontend's `VITE_API_BASE_URL`
3. Set `USE_MOCK_API = false`
4. Try creating a family
5. Try adding events

If something breaks, check:
- Response format matches contract?
- Field names exact match (camelCase)?
- Error responses match expected format?

---

## Common Gotchas

### 1. CORS Errors
Frontend on `:5173`, backend on `:8080` = CORS needed.

```java
@Configuration
public class CorsConfig implements WebMvcConfigurer {
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
            .allowedOrigins("http://localhost:5173")
            .allowedMethods("*")
            .allowedHeaders("*");
    }
}
```

### 2. UUID Handling
Frontend generates UUIDs for optimistic updates. Your backend should:
- Generate new UUIDs for new entities (ignore client-provided IDs)
- Accept UUIDs for lookups/updates

### 3. Null vs Missing Fields

In PATCH requests, the frontend distinguishes between:
- Field not sent = don't change it
- Field sent as null = clear it

Your DTO should handle this (use `Optional<T>` or custom deserializer).

### 4. Date Timezone Issues

Store dates as `LocalDate` (no timezone). The frontend sends `"2026-01-15"`, store exactly that. Don't convert to timestamps.

---

## Need Help?

1. **Re-read the documents** - Most answers are there
2. **Check the mock handlers** - They show expected behavior
3. **Look at frontend types** - They define the contract
4. **Test incrementally** - One endpoint at a time

---

Good luck! You've got this. The hard part (building a polished frontend) is done. Now you're just implementing a well-defined API contract. That's the fun part.
