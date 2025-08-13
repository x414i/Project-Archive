MIGRATIONS_ROOT ?= ./internal/migrations
DATABASE_URL ?= postgres://postgres:091093Aa@localhost:5432/major?sslmode=disable

export

# Migration Operations
.PHONY: migrate.up migrate.up.all migrate.down migrate.down.all migration migrate.force drop.all.tables

migrate.up:
	migrate -path=$(MIGRATIONS_ROOT) -database=$(DATABASE_URL) up $(n)

migrate.up.all:
	migrate -path=$(MIGRATIONS_ROOT) -database=$(DATABASE_URL) up

migrate.down:
	migrate -path=$(MIGRATIONS_ROOT) -database=$(DATABASE_URL) down $(n)

migrate.down.all:
	migrate -path=$(MIGRATIONS_ROOT) -database=$(DATABASE_URL) down -all

migration:
	migrate create -seq -ext=.sql -dir=$(MIGRATIONS_ROOT) $(n)

migrate.force:
	migrate -path=$(MIGRATIONS_ROOT) -database=$(DATABASE_URL) force $(n)

# New target to drop all tables
drop.all.tables:
	@echo "Dropping all tables in the database..."
	psql -U postgres -d major -c "DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE'; END LOOP; END $$;"