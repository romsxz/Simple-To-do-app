# Simple To-Do App

A full-stack task management application built as a learning project to demonstrate a clean separation between a reactive Angular 18 frontend and a RESTful Spring Boot 4 backend. The app lets developers plan, track, and prioritise personal tasks — with real-time status toggling, search, and priority-based sorting — all in a single focused view.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [Data Model](#data-model)
5. [How It Works — End-to-End Workflow](#how-it-works--end-to-end-workflow)
   - [Backend Internals](#backend-internals)
   - [Frontend Internals](#frontend-internals)
   - [Request Lifecycle](#request-lifecycle)
6. [REST API Reference](#rest-api-reference)
7. [Getting Started](#getting-started)
   - [Prerequisites](#prerequisites)
   - [Run the Backend](#run-the-backend)
   - [Run the Frontend](#run-the-frontend)
8. [Advantages & Industry Best Practices Applied](#advantages--industry-best-practices-applied)
9. [Scaling to Production](#scaling-to-production)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                     Browser                         │
│                                                     │
│   Angular 18 SPA  (localhost:4200)                  │
│   ┌─────────────────────────────────────────────┐   │
│   │  AppComponent  (standalone, signals)        │   │
│   │       │                                     │   │
│   │  TaskStore (signal-based service)           │   │
│   │       │  HttpClient → /api/tasks            │   │
│   └───────┼─────────────────────────────────────┘   │
│           │ dev proxy (proxy.conf.json)              │
└───────────┼─────────────────────────────────────────┘
            │ HTTP/JSON
┌───────────▼─────────────────────────────────────────┐
│   Spring Boot 4  (localhost:8080)                   │
│                                                     │
│   TaskController  →  TaskService  →  TaskRepository │
│                                    ↕                │
│                              H2 In-Memory DB        │
│                          (PostgreSQL-compat mode)   │
└─────────────────────────────────────────────────────┘
```

The two apps are independently started — Angular's dev server proxies every `/api/*` call to the Spring Boot server, so there are no CORS issues in development and no environment-specific URLs to manage inside the Angular codebase.

---

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Frontend framework | Angular | 18.2 |
| Frontend language | TypeScript | 5.5 |
| Frontend state | Angular Signals + `computed` | built-in |
| Frontend forms | Angular Reactive Forms | built-in |
| Frontend SSR | Angular SSR / Express | 18.2 |
| Backend framework | Spring Boot | 4.0.0 |
| Backend language | Java | 17 |
| Persistence | Spring Data JPA / Hibernate | (Boot-managed) |
| Database (dev) | H2 in-memory (PostgreSQL mode) | (Boot-managed) |
| Build tool (backend) | Apache Maven Wrapper | 3.3.4 |
| Build tool (frontend) | Angular CLI | 18.2.21 |

---

## Project Structure

```
Simple-To-do-app/
├── README.md                        ← You are here
├── .gitignore                       ← Root ignore rules
│
├── client/                          ← Angular 18 frontend
│   ├── proxy.conf.json              ← Dev proxy: /api → http://localhost:8080
│   ├── angular.json                 ← CLI workspace config (SSR enabled)
│   ├── tsconfig.json
│   ├── server.ts                    ← Express bootstrap for SSR
│   └── src/
│       ├── index.html
│       ├── main.ts                  ← Browser bootstrap
│       ├── main.server.ts           ← SSR bootstrap
│       ├── styles.scss              ← Global styles
│       └── app/
│           ├── app.component.ts     ← Root component + all UI logic
│           ├── app.component.html   ← Template (hero, form, task list)
│           ├── app.component.scss
│           ├── app.config.ts        ← provideHttpClient, provideRouter
│           ├── app.routes.ts        ← Route definitions (empty — SPA)
│           └── core/
│               ├── models/
│               │   └── task.model.ts       ← Task, TaskFormInput, enums
│               └── services/
│                   └── task.store.ts       ← Signal store + HTTP calls
│
└── server/                          ← Spring Boot 4 backend
    ├── pom.xml
    ├── mvnw / mvnw.cmd              ← Maven wrapper scripts
    └── src/
        ├── main/
        │   ├── resources/
        │   │   └── application.properties
        │   └── java/com/devnotes/todo/
        │       ├── TodoApiApplication.java
        │       ├── common/
        │       │   └── GlobalExceptionHandler.java
        │       ├── config/
        │       │   └── SecurityConfig.java  ← placeholder (commented out)
        │       └── task/
        │           ├── Task.java            ← JPA entity
        │           ├── TaskController.java  ← REST controller
        │           ├── TaskService.java     ← Business logic
        │           ├── TaskRepository.java  ← Spring Data interface
        │           ├── TaskStatus.java      ← Enum: TODO, IN_PROGRESS, DONE, BLOCKED
        │           ├── TaskPriority.java    ← Enum: LOW, MEDIUM, HIGH
        │           ├── TaskNotFoundException.java
        │           └── web/
        │               ├── TaskRequest.java         ← Validated input record
        │               ├── TaskResponse.java        ← Output projection record
        │               └── TaskStatusUpdateRequest.java
        └── test/
            └── TodoApiApplicationTests.java
```

---

## Data Model

### Task entity

| Field | Type | Constraints |
|---|---|---|
| `id` | `Long` | Auto-generated primary key |
| `title` | `String` | Required, max 120 chars |
| `description` | `String` | Optional, max 2 000 chars |
| `status` | `TaskStatus` | Default `TODO` |
| `priority` | `TaskPriority` | Default `MEDIUM` |
| `dueDate` | `LocalDate` | Optional; must be today or future |
| `createdAt` | `LocalDateTime` | Set automatically on insert (`@PrePersist`) |
| `updatedAt` | `LocalDateTime` | Updated automatically on every save (`@PreUpdate`) |

### Enumerations

```
TaskStatus  : TODO | IN_PROGRESS | DONE | BLOCKED
TaskPriority: LOW  | MEDIUM      | HIGH
```

### JSON shape (API response)

```json
{
  "id": 1,
  "title": "Document the authentication flow",
  "description": "Include sequence diagram and Swagger annotations",
  "status": "IN_PROGRESS",
  "priority": "HIGH",
  "dueDate": "2026-04-01",
  "createdAt": "2026-03-25T10:00:00",
  "updatedAt": "2026-03-25T11:30:00"
}
```

---

## How It Works — End-to-End Workflow

### Backend Internals

```
HTTP Request
    │
    ▼
TaskController          (@RestController, /api/tasks)
    │  validates @Valid @RequestBody via Jakarta Bean Validation
    │
    ▼
TaskService             (@Service, @Transactional)
    │  maps TaskRequest → Task entity
    │  calls TaskRepository
    │  maps Task → TaskResponse before returning
    │
    ▼
TaskRepository          (Spring Data JPA interface)
    │  auto-implements CRUD + custom finder:
    │  findAllByOrderByDueDateAscPriorityDesc()
    │
    ▼
H2 In-Memory DB         (PostgreSQL-compat mode)
```

**Error handling** is centralised in `GlobalExceptionHandler` (`@RestControllerAdvice`):

- `TaskNotFoundException` → **404 Not Found** with `{ timestamp, status, message }`
- `MethodArgumentNotValidException` → **400 Bad Request** with the first failing field message

**Sorting** is done at the database level: tasks are always returned ordered by `dueDate ASC`, then `priority DESC` (HIGH before MEDIUM before LOW).

**Timestamps** are managed entirely by JPA lifecycle callbacks (`@PrePersist`, `@PreUpdate`) — no manual setting required in service code.

---

### Frontend Internals

```
AppComponent (constructor)
    │
    └─► TaskStore.loadTasks()
              │
              ├─ _loading.set(true)
              ├─ HttpClient.get<Task[]>('/api/tasks')
              ├─ _tasks.set(sortedTasks)       ← signal update
              └─ _loading.set(false)

                   Angular's reactivity graph automatically re-renders
                   all views that read from the signals:

                   filteredTasks (computed) ─► task list in template
                   stats         (computed) ─► hero counters in template
                   loading       (signal)   ─► loading indicator
                   error         (signal)   ─► error banner
```

**TaskStore** is the single source of truth for all task data. It exposes:

| Member | Type | Purpose |
|---|---|---|
| `tasks` | `Signal<Task[]>` | Full unfiltered list |
| `filteredTasks` | `computed` | Tasks after status filter + search |
| `stats` | `computed` | `{ total, todo, inProgress, done }` |
| `loading` | `Signal<boolean>` | HTTP in-flight indicator |
| `error` | `Signal<string\|null>` | User-facing error message |
| `statusFilter` | `Signal<TaskStatus\|'ALL'>` | Active filter pill |
| `searchTerm` | `Signal<string>` | Live search string |

**AppComponent** is a single standalone component that owns the reactive form (`FormGroup`) and delegates every mutation to `TaskStore`. The `editingTaskId` signal drives the form's dual create/update mode — when it holds a number the form is in edit mode; when `null` it is in create mode.

**Sorting on the frontend** mirrors the backend: tasks are re-sorted after every mutation (create, update, status change) without a round-trip using the same `dueDate ASC → priority DESC` logic inside `TaskStore.sortTasks()`.

---

### Request Lifecycle

**Creating a task** (full round-trip):

```
1. User fills form → clicks "Add task"
2. AppComponent.saveTask() → form validation
3. TaskStore.createTask(formValue)
4.   mapFormToPayload() → strips empty optional fields to null
5.   HttpClient.post('/api/tasks', payload)  ──► Spring TaskController
6.                                               TaskService.create()
7.                                               TaskRepository.save(task)
8.                                               H2 INSERT + timestamps set
9.                                           ◄── TaskResponse JSON
10.  _tasks.update([newTask, ...existing]) → re-sorted
11.  Angular signals trigger re-render automatically
12. AppComponent.resetForm() → clears form, clears editingTaskId
```

**Updating status only** (optimised endpoint):

```
1. User clicks a status button on a task card
2. AppComponent.toggleStatus(task, status) — no-op if same status
3. TaskStore.updateTaskStatus(taskId, newStatus)
4.   PUT /api/tasks/{id}/status  { "status": "DONE" }
5.   TaskService.updateStatus() — loads task, sets status only, saves
6.   Returns updated TaskResponse
7.   _tasks.update() → replaces the matching task in the signal array
```

---

## REST API Reference

Base URL: `http://localhost:8080/api/tasks`

| Method | Path | Request body | Success response | Description |
|---|---|---|---|---|
| `GET` | `/` | — | `200 OK` `Task[]` | List all tasks, sorted by due date then priority |
| `GET` | `/{id}` | — | `200 OK` `Task` | Get a single task |
| `POST` | `/` | `TaskRequest` | `201 Created` `Task` | Create a new task |
| `PUT` | `/{id}` | `TaskRequest` | `200 OK` `Task` | Full update of a task |
| `PUT` | `/{id}/status` | `{ "status": "..." }` | `200 OK` `Task` | Update status only |
| `DELETE` | `/{id}` | — | `204 No Content` | Delete a task |

### TaskRequest body

```json
{
  "title": "Write unit tests",
  "description": "Cover TaskService with JUnit 5",
  "status": "TODO",
  "priority": "HIGH",
  "dueDate": "2026-04-10"
}
```

Validation rules applied server-side:
- `title` — required, max 120 characters
- `description` — optional, max 2 000 characters
- `dueDate` — optional, must be today or a future date (`@FutureOrPresent`)

### Error response shape

```json
{
  "timestamp": "2026-03-25T10:00:00",
  "status": 404,
  "message": "Task 99 not found"
}
```

### H2 console (development only)

The in-memory database can be inspected at `http://localhost:8080/h2-console` using JDBC URL `jdbc:h2:mem:todo`.

---

## Getting Started

### Prerequisites

| Tool | Minimum version |
|---|---|
| Java (JDK) | 17 |
| Node.js | 18 |
| npm | 9 |

No separate database installation is required — H2 runs in-memory.

---

### Run the Backend

```bash
# From the repo root
cd server

# Windows
mvnw.cmd spring-boot:run

# macOS / Linux
./mvnw spring-boot:run
```

The API starts on **http://localhost:8080**. You should see the Spring banner and a log line confirming Tomcat started on port 8080.

---

### Run the Frontend

Open a **second terminal**:

```bash
cd client
npm install        # first time only
npm start          # ng serve --proxy-config proxy.conf.json
```

Open **http://localhost:4200** in your browser.

The Angular dev server proxies all `/api/*` requests to `http://localhost:8080` (configured in `proxy.conf.json`), so the frontend never needs to know the backend's port.

---

## Advantages & Industry Best Practices Applied

### 1. Clean Layered Architecture (Backend)

The backend follows a strict three-layer pattern: **Controller → Service → Repository**. Each layer has a single responsibility:

- `TaskController` handles HTTP concerns only (request mapping, status codes, CORS)
- `TaskService` owns all business logic and transaction boundaries (`@Transactional`)
- `TaskRepository` is a pure data-access interface — no SQL written by hand

This separation makes each layer independently testable and replaceable.

### 2. DTO / Projection Pattern

The API never exposes the JPA entity directly. `TaskRequest` (input) and `TaskResponse` (output) are Java records that form a stable contract with the frontend. This prevents over-posting attacks, hides internal field names, and allows the entity schema to evolve without breaking the API.

### 3. Bean Validation at the API Boundary

`TaskRequest` uses Jakarta Bean Validation annotations (`@NotBlank`, `@Size`, `@FutureOrPresent`). Invalid payloads are rejected by the framework before they reach service code, and `GlobalExceptionHandler` translates validation failures into consistent `400` JSON responses. Validation never duplicates into the service layer.

### 4. Centralised Exception Handling

`GlobalExceptionHandler` (`@RestControllerAdvice`) is the single place where exceptions become HTTP responses. Controllers throw domain exceptions (`TaskNotFoundException`); they do not catch-and-map errors themselves. This keeps controller code clean and ensures uniform error payloads across the entire API.

### 5. Dedicated Status-Update Endpoint

Rather than forcing a full `PUT /tasks/{id}` for every status toggle (which would require sending all fields), a dedicated `PUT /tasks/{id}/status` endpoint exists. This follows the principle of **purpose-built endpoints** — the client sends the minimal payload needed, and the server updates only what it should.

### 6. Signal-Based Reactive State (Frontend)

The frontend uses Angular 18 **Signals** (`signal`, `computed`, `effect`) as its state primitive instead of a third-party store library. Signals provide:

- **Fine-grained reactivity** — only the parts of the template that read a changed signal re-render
- **Synchronous, predictable updates** — no observable subscription management or memory-leak risk
- **Zero extra dependencies** — state management is built into the framework

### 7. Single Source of Truth with `TaskStore`

All task state lives in one injectable `TaskStore`. The component holds no state beyond `editingTaskId` (a local UI concern). This means any future second component (e.g. a sidebar summary) can inject the same store and read the same `computed` values without any synchronisation work.

### 8. Optimistic-Local Sorting

After each mutation the frontend re-sorts the task list locally using the same `dueDate ASC → priority DESC` logic as the backend. This keeps the UI consistent without requiring a full list reload after every change, reducing network round-trips and perceived latency.

### 9. Dev Proxy for Zero-Config API Access

`proxy.conf.json` routes `/api` to the backend during development. The Angular source code only ever references `/api/tasks` — it has no knowledge of ports or hostnames. This means the same build artefact can be deployed behind any reverse proxy (Nginx, a CDN, a Kubernetes ingress) with no code change.

### 10. Automated Audit Timestamps

`@PrePersist` and `@PreUpdate` JPA lifecycle callbacks automatically set `createdAt` and `updatedAt` on every entity save. No service code needs to touch these fields, which eliminates an entire class of bugs where timestamps get forgotten or set incorrectly.

### 11. Consistent Sorting via a Custom Repository Method

`findAllByOrderByDueDateAscPriorityDesc()` is a Spring Data derived query. Sorting is performed by the database, not in Java streams, which scales to large datasets and avoids loading all rows into memory just to sort them.

### 12. SSR-Ready Frontend

The Angular project includes `@angular/ssr` and a ready-made `server.ts` Express bootstrap. The app can be served with server-side rendering for improved first-paint performance and SEO without architectural changes to the components.

---

## Scaling to Production

The current setup uses conveniences appropriate for local development (H2 in-memory, plain HTTP, open CORS). The steps below describe what to change for a production-grade deployment.

### 1. Replace H2 with a Persistent Database

Swap the H2 dependency in `pom.xml` for the target database driver (PostgreSQL is the natural choice — H2 is already running in PostgreSQL-compat mode):

```xml
<!-- pom.xml -->
<dependency>
    <groupId>org.postgresql</groupId>
    <artifactId>postgresql</artifactId>
    <scope>runtime</scope>
</dependency>
```

Update `application.properties` (or a `application-prod.properties` profile):

```properties
spring.datasource.url=jdbc:postgresql://db-host:5432/todo
spring.datasource.username=${DB_USER}
spring.datasource.password=${DB_PASSWORD}
spring.jpa.hibernate.ddl-auto=validate
spring.h2.console.enabled=false
```

Use `ddl-auto=validate` (or `none`) in production — never `update`, which can cause silent data loss on schema changes. Manage migrations with **Flyway** or **Liquibase**.

### 2. Externalise Configuration with Environment Variables

Credentials and URLs should never be in source code. Use Spring's `${ENV_VAR}` placeholder syntax and inject values from your deployment platform (Docker Compose, Kubernetes Secrets, AWS Parameter Store, etc.).

### 3. Enable Spring Security

`SecurityConfig.java` is already scaffolded but commented out. Uncomment it and configure:

- **JWT authentication** for stateless REST (use Spring Security OAuth2 Resource Server)
- Restrict CORS to your production domain only
- Disable the H2 console completely

```java
@Bean
SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
    return http
        .cors(Customizer.withDefaults())
        .csrf(AbstractHttpConfigurer::disable)   // stateless JWT — no CSRF needed
        .sessionManagement(s -> s.sessionCreationPolicy(STATELESS))
        .authorizeHttpRequests(auth -> auth
            .requestMatchers("/api/**").authenticated()
            .anyRequest().permitAll())
        .oauth2ResourceServer(o -> o.jwt(Customizer.withDefaults()))
        .build();
}
```

### 4. Build and Serve the Angular App with SSR

```bash
cd client
npm run build                         # produces dist/client/
node dist/client/server/server.mjs    # Express SSR server
```

In production, place Nginx (or a CDN) in front of the Express process and point `/api` to the Spring Boot service via a reverse-proxy rule — eliminating the dev-only `proxy.conf.json` entirely.

### 5. Add Pagination to the API

`findAll()` currently returns every task in one response. At scale, add Spring Data's `Pageable` support:

```java
// TaskRepository.java
Page<Task> findAllByOrderByDueDateAscPriorityDesc(Pageable pageable);
```

The Angular frontend would then implement infinite scroll or page controls.

### 6. Containerise with Docker

A typical `docker-compose.yml` for local-prod parity:

```yaml
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: todo
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}

  api:
    build: ./server
    ports: ["8080:8080"]
    environment:
      DB_USER: ${DB_USER}
      DB_PASSWORD: ${DB_PASSWORD}
      SPRING_DATASOURCE_URL: jdbc:postgresql://db:5432/todo
    depends_on: [db]

  web:
    build: ./client
    ports: ["4000:4000"]
    depends_on: [api]
```

### 7. Add a Health Check and Actuator Endpoints

Add `spring-boot-starter-actuator` to expose `/actuator/health` and `/actuator/info`. Kubernetes liveness/readiness probes and load balancers rely on these endpoints to know when an instance is ready to receive traffic.

### 8. Observability

| Concern | Tool |
|---|---|
| Structured logging | Logback → JSON → ELK / Loki |
| Distributed tracing | Micrometer + Zipkin / Tempo |
| Metrics | Micrometer → Prometheus → Grafana |
| Error tracking (frontend) | Sentry Angular SDK |

### 9. CI/CD Pipeline

A minimal GitHub Actions workflow should:
1. Run `./mvnw verify` (backend tests)
2. Run `ng test --watch=false --browsers=ChromeHeadless` (frontend unit tests)
3. Build Docker images and push to a container registry
4. Deploy to your environment (Kubernetes, AWS ECS, Fly.io, etc.)

### 10. Scale Horizontally

Because Spring Boot is stateless (no server-side session — all state lives in the database and the browser), you can run multiple API instances behind a load balancer with no additional configuration. Pair this with connection pooling (**HikariCP**, the Spring Boot default) and a read replica for the database to handle production read load.
