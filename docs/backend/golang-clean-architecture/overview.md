---
sidebar_position: 7
title: "Go Clean Architecture & Domain-Driven Design (DDD)"
description: "Production Go microservice architecture: strict domain isolation, use cases, repository ports, pgxpool PostgreSQL adapter, and dependency injection."
---

# Go Clean Architecture & Domain-Driven Design (DDD)

<div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', margin: '1rem 0 2rem 0' }}>
  <span style={{ background: 'rgba(6, 182, 212, 0.15)', border: '1px solid rgba(6, 182, 212, 0.4)', borderRadius: '6px', padding: '3px 10px', fontSize: '12px', fontWeight: 700, color: '#00f0ff' }}>Go 1.22+</span>
  <span style={{ background: 'rgba(139, 92, 246, 0.15)', border: '1px solid rgba(139, 92, 246, 0.4)', borderRadius: '6px', padding: '3px 10px', fontSize: '12px', fontWeight: 700, color: '#c084fc' }}>PostgreSQL 16 (pgx/v5)</span>
  <span style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.4)', borderRadius: '6px', padding: '3px 10px', fontSize: '12px', fontWeight: 700, color: '#34d399' }}>🟢 Production Ready</span>
  <span style={{ background: 'rgba(255, 255, 255, 0.06)', border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '6px', padding: '3px 10px', fontSize: '12px', fontFamily: 'monospace', color: '#cbd5e1' }}>npx software-blueprints add backend-go-clean-ddd</span>
</div>

In long-lived enterprise Go services, tightly coupling HTTP handlers, database queries, and business rules leads to fragile spaghetti code where changing a database column breaks API contracts, and writing unit tests requires running live database instances.

This blueprint implements **Clean Architecture** (Ports and Adapters / Hexagonal) with **Domain-Driven Design (DDD)** in Go. The architecture enforces unidirectional dependency flow: inner core business rules have **zero dependencies** on external frameworks, ORMs, or HTTP transport layers.

---

## 1. System Architecture

```mermaid
flowchart TD
    subgraph Drivers ["1. Frameworks & Drivers (External)"]
        Router["HTTP Router (Chi / Gin)"]
        DBDriver["PostgreSQL Driver (pgx/v5 Pool)"]
    end

    subgraph Adapters ["2. Interface Adapters"]
        HTTPHandler["HTTP Controller (OrderHandler)\nRequest Validation & JSON Serialization"]
        PostgresRepo["PostgresOrderRepository\nImplements OrderRepository Port"]
    end

    subgraph Core ["3. Use Cases (Application Services)"]
        OrderUseCase["OrderInteractor\nOrchestrates Transaction & Dispatches Events"]
    end

    subgraph Domain ["4. Enterprise Domain (Pure Go)"]
        OrderEntity["Order Aggregate & Value Objects\nBusiness Invariants & Domain Errors"]
    end

    Router --> HTTPHandler
    HTTPHandler --> OrderUseCase
    OrderUseCase --> OrderEntity
    OrderUseCase --> PostgresRepo
    PostgresRepo --> DBDriver
```

---

## 2. Directory Layout & Layer Boundaries

```
internal/
├── domain/                  # Pure Go domain entities, invariants, and domain errors (NO external imports)
│   ├── order.go
│   └── errors.go
├── usecase/                 # Application business logic and secondary port interfaces
│   ├── order_interactor.go
│   └── ports.go             # Repository and event publisher interfaces
├── adapter/
│   ├── delivery/http/       # Primary adapter: HTTP controllers, request/response DTOs
│   │   ├── handler.go
│   │   └── router.go
│   └── repository/postgres/ # Secondary adapter: SQL queries with pgxpool
│       └── order_repo.go
└── config/                  # Configuration parsing from environment variables
cmd/
└── server/
    └── main.go              # Pure composition root: wires dependencies together
```

---

## 3. Production Code Implementation

### 3.1 Domain Layer (`internal/domain/order.go`)

Pure Go domain logic with strict invariant validation:

```go
package domain

import (
	"errors"
	"time"
)

var (
	ErrInvalidOrderAmount = errors.New("order amount must be greater than zero")
	ErrOrderNotFound      = errors.New("order not found in repository")
	ErrOrderAlreadyPaid   = errors.New("order is already paid")
)

type OrderStatus string

const (
	StatusPending   OrderStatus = "PENDING"
	StatusPaid      OrderStatus = "PAID"
	StatusCancelled OrderStatus = "CANCELLED"
)

// Order is the aggregate root.
type Order struct {
	ID        string      `json:"id"`
	UserID    string      `json:"user_id"`
	AmountCents int64     `json:"amount_cents"`
	Currency  string      `json:"currency"`
	Status    OrderStatus `json:"status"`
	CreatedAt time.Time   `json:"created_at"`
	UpdatedAt time.Time   `json:"updated_at"`
}

// NewOrder enforces business invariants at creation time.
func NewOrder(id, userID string, amountCents int64, currency string) (*Order, error) {
	if amountCents <= 0 {
		return nil, ErrInvalidOrderAmount
	}
	if currency == "" {
		currency = "USD"
	}
	now := time.Now().UTC()
	return &Order{
		ID:          id,
		UserID:      userID,
		AmountCents: amountCents,
		Currency:    currency,
		Status:      StatusPending,
		CreatedAt:   now,
		UpdatedAt:   now,
	}, nil
}

// MarkPaid enforces state transition invariants.
func (o *Order) MarkPaid() error {
	if o.Status == StatusPaid {
		return ErrOrderAlreadyPaid
	}
	o.Status = StatusPaid
	o.UpdatedAt = time.Now().UTC()
	return nil
}
```

---

### 3.2 Use Case Layer (`internal/usecase/order_interactor.go`)

Declares the storage port interfaces and coordinates business actions:

```go
package usecase

import (
	"context"
	"fmt"
	"github.com/google/uuid"
	"yourproject/internal/domain"
)

// OrderRepository is the secondary port (outbound interface).
type OrderRepository interface {
	Save(ctx context.Context, order *domain.Order) error
	FindByID(ctx context.Context, id string) (*domain.Order, error)
	Update(ctx context.Context, order *domain.Order) error
}

// EventPublisher publishes domain events.
type EventPublisher interface {
	PublishOrderCreated(ctx context.Context, order *domain.Order) error
}

// OrderUseCase is the primary port (inbound interface).
type OrderUseCase interface {
	CreateOrder(ctx context.Context, userID string, amountCents int64, currency string) (*domain.Order, error)
	PayOrder(ctx context.Context, orderID string) (*domain.Order, error)
}

type orderInteractor struct {
	repo      OrderRepository
	publisher EventPublisher
}

func NewOrderInteractor(repo OrderRepository, pub EventPublisher) OrderUseCase {
	return &orderInteractor{repo: repo, publisher: pub}
}

func (uc *orderInteractor) CreateOrder(ctx context.Context, userID string, amountCents int64, currency string) (*domain.Order, error) {
	orderID := uuid.New().String()
	order, err := domain.NewOrder(orderID, userID, amountCents, currency)
	if err != nil {
		return nil, fmt.Errorf("domain creation failed: %w", err)
	}

	if err := uc.repo.Save(ctx, order); err != nil {
		return nil, fmt.Errorf("repository save failed: %w", err)
	}

	if uc.publisher != nil {
		_ = uc.publisher.PublishOrderCreated(ctx, order)
	}

	return order, nil
}

func (uc *orderInteractor) PayOrder(ctx context.Context, orderID string) (*domain.Order, error) {
	order, err := uc.repo.FindByID(ctx, orderID)
	if err != nil {
		return nil, err
	}

	if err := order.MarkPaid(); err != nil {
		return nil, err
	}

	if err := uc.repo.Update(ctx, order); err != nil {
		return nil, fmt.Errorf("failed updating order: %w", err)
	}

	return order, nil
}
```

---

### 3.3 Database Adapter (`internal/adapter/repository/postgres/order_repo.go`)

Implements the repository port using high-performance `pgxpool`:

```go
package postgres

import (
	"context"
	"errors"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"yourproject/internal/domain"
)

type PostgresOrderRepository struct {
	pool *pgxpool.Pool
}

func NewPostgresOrderRepository(pool *pgxpool.Pool) *PostgresOrderRepository {
	return &PostgresOrderRepository{pool: pool}
}

func (r *PostgresOrderRepository) Save(ctx context.Context, o *domain.Order) error {
	query := `
		INSERT INTO orders (id, user_id, amount_cents, currency, status, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`
	_, err := r.pool.Exec(ctx, query, o.ID, o.UserID, o.AmountCents, o.Currency, o.Status, o.CreatedAt, o.UpdatedAt)
	return err
}

func (r *PostgresOrderRepository) FindByID(ctx context.Context, id string) (*domain.Order, error) {
	query := `
		SELECT id, user_id, amount_cents, currency, status, created_at, updated_at
		FROM orders WHERE id = $1
	`
	var o domain.Order
	err := r.pool.QueryRow(ctx, query, id).Scan(
		&o.ID, &o.UserID, &o.AmountCents, &o.Currency, &o.Status, &o.CreatedAt, &o.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrOrderNotFound
		}
		return nil, err
	}
	return &o, nil
}

func (r *PostgresOrderRepository) Update(ctx context.Context, o *domain.Order) error {
	query := `
		UPDATE orders SET status = $1, updated_at = $2 WHERE id = $3
	`
	_, err := r.pool.Exec(ctx, query, o.Status, o.UpdatedAt, o.ID)
	return err
}
```

---

### 3.4 Composition Root (`cmd/server/main.go`)

Wires adapters, use cases, and HTTP servers with graceful shutdown:

```go
package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/jackc/pgx/v5/pgxpool"

	"yourproject/internal/adapter/delivery/http/handler"
	"yourproject/internal/adapter/repository/postgres"
	"yourproject/internal/usecase"
)

func main() {
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	// 1. Initialize PostgreSQL Connection Pool
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = "postgres://blueprint_user:blueprint_password@localhost:5432/blueprints_db"
	}
	pool, err := pgxpool.New(ctx, dbURL)
	if err != nil {
		log.Fatalf("Unable to connect to database: %v", err)
	}
	defer pool.Close()

	// 2. Wire Dependencies (Inversion of Control)
	orderRepo := postgres.NewPostgresOrderRepository(pool)
	orderUseCase := usecase.NewOrderInteractor(orderRepo, nil)
	orderHandler := handler.NewOrderHandler(orderUseCase)

	// 3. Setup HTTP Routing
	r := chi.NewRouter()
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)

	r.Post("/api/v1/orders", orderHandler.CreateOrder)
	r.Get("/api/v1/orders/{id}", orderHandler.GetOrder)
	r.Post("/api/v1/orders/{id}/pay", orderHandler.PayOrder)

	srv := &http.Server{
		Addr:         ":8080",
		Handler:      r,
		ReadTimeout:  5 * time.Second,
		WriteTimeout: 10 * time.Second,
		IdleTimeout:  120 * time.Second,
	}

	go func() {
		log.Println("Server running on port 8080...")
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server listen error: %v", err)
		}
	}()

	<-ctx.Done()
	log.Println("Shutting down gracefully...")

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	_ = srv.Shutdown(shutdownCtx)
	log.Println("Server gracefully stopped.")
}
```

---

## 4. Production Hardening Checklist

| Verification Item | Target Standard | Failure Mode Prevented |
| :--- | :--- | :--- |
| **No Framework Imports in Domain** | Domain package imports **zero external packages** except stdlib | Prevents ORM or HTTP framework lock-in |
| **Interface Segregation** | Secondary ports defined where they are consumed (`usecase` package) | Avoids interface pollution and oversized mock structs |
| **Connection Pooling** | `pgxpool.New` with bounded `MaxConns` (e.g. 25-50) | Prevents PostgreSQL connection exhaustion during traffic surges |
| **Unit Testing Velocity** | Interactor unit tests use mock repositories via `stretchr/testify` | Tests run in under 5ms without live DB containers |
| **Context Cancellation** | `ctx` forwarded to every `pool.QueryRow` and `pool.Exec` call | Aborts expensive database queries when HTTP clients disconnect |
