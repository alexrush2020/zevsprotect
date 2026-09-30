# Локальный стенд в Docker (docker-compose.yml). Прод — deploy/deploy.sh, docs/DEPLOY.md.
# Docker Desktop-контекст на машине разработки нестабилен, поэтому по умолчанию — default.
# Переопределение: make local-up DOCKER=docker
DOCKER ?= docker --context default
COMPOSE = $(DOCKER) compose --profile app
BACKUP_DIR ?= $(HOME)/zevs-db-backups

.PHONY: help local-up local-services local-down local-restart local-ps local-logs local-build local-shell \
        local-seed local-db-backup local-db-restore

help: ## Показать список команд
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

local-up: ## Поднять всё: postgres, mailpit, приложение (http://zevs.test, http://localhost:43128)
	$(DOCKER) network create dev-local 2>/dev/null || true
	$(COMPOSE) up -d --build

local-services: ## Поднять только postgres и mailpit (приложение на хосте: npm run dev)
	$(DOCKER) compose up -d

local-down: ## Остановить контейнеры (тома остаются)
	$(COMPOSE) down

local-restart: local-down local-up ## Перезапустить

local-ps: ## Статус контейнеров
	$(COMPOSE) ps

local-logs: ## Логи (follow)
	$(COMPOSE) logs -f

local-build: ## Пересобрать образ приложения
	$(COMPOSE) build

local-shell: ## Shell в контейнере приложения
	$(COMPOSE) exec app sh

local-seed: ## Начальные данные (npm run seed в контейнере; пишет в БД — сначала local-db-backup)
	$(COMPOSE) exec app npm run seed

local-db-backup: ## pg_dump (gzip, --clean) в $(BACKUP_DIR) — вне репозитория
	@mkdir -p $(BACKUP_DIR)
	@f=$(BACKUP_DIR)/zevs-$$(date +%Y%m%d-%H%M%S).sql.gz; \
	$(COMPOSE) exec -T postgres pg_dump -U zevs -d zevs --clean --if-exists | gzip > $$f.part \
	  && gzip -t $$f.part && mv $$f.part $$f && echo "бэкап: $$f"

local-db-restore: ## Восстановить БД из FILE=<.sql.gz> (перезаписывает данные; текущая БД бэкапится)
	@test -f "$(FILE)" || { echo "укажите FILE=<путь к .sql.gz>"; exit 1; }
	$(MAKE) local-db-backup
	gunzip -c "$(FILE)" | $(COMPOSE) exec -T postgres psql -U zevs -d zevs -v ON_ERROR_STOP=1 -q
