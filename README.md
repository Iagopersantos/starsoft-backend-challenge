# Sistema de Reserva de Ingressos de Cinema

Sistema backend para venda de ingressos de cinema com suporte a alta concorrência, múltiplas instâncias e controle de reservas temporárias.

## Visão Geral

Este projeto implementa um sistema de reserva de ingressos para uma rede de cinemas, capaz de lidar com múltiplos usuários tentando reservar os mesmos assentos simultaneamente. O sistema garante que:

- Nenhum assento seja vendido duas vezes
- Reservas temporárias expiram automaticamente após 30 segundos
- Múltiplas instâncias da aplicação podem rodar simultaneamente
- Eventos são publicados de forma assíncrona via mensageria

## Tecnologias Escolhidas

| Tecnologia | Versão | Justificativa |
|------------|--------|---------------|
| **NestJS** | 11.x | Framework robusto com DI, modular, suporte nativo a microserviços |
| **PostgreSQL** | 15 | ACID compliance, row-level locking (FOR UPDATE), confiabilidade |
| **Redis** | 7 | Locks distribuídos via Redlock, baixa latência, cache de disponibilidade |
| **RabbitMQ** | 3.12 | Mensageria confiável, exchanges topic para roteamento flexível |
| **TypeORM** | 0.3.x | ORM com suporte a transações e pessimistic locking |

### Por que essas escolhas?

- **PostgreSQL**: Escolhido por suportar transações ACID e `SELECT FOR UPDATE` para lock pessimista a nível de linha, essencial para evitar race conditions no banco.
- **Redis + Redlock**: Algoritmo Redlock garante coordenação distribuída entre múltiplas instâncias, prevenindo que duas instâncias processem a mesma reserva.
- **RabbitMQ**: Permite desacoplar operações síncronas de processamentos assíncronos (notificações, auditoria), com garantia de entrega.

## Como Executar

### Pré-requisitos

- Docker e Docker Compose
- Node.js 18+ (para desenvolvimento local)
- npm ou yarn

### Subir o ambiente completo (Docker)

```bash
# Clone o repositório
git clone <repo-url>
cd starsoft-backend-challenge

# Subir todos os serviços
docker-compose -f docker/docker-compose.yml up -d

# Verificar se os serviços estão rodando
docker-compose -f docker/docker-compose.yml ps
```

A API estará disponível em:
- **Instância 1**: http://localhost:3000
- **Instância 2**: http://localhost:3001 (réplica para testes de concorrência)
- **RabbitMQ Management**: http://localhost:15672 (user: cinema, pass: cinema123)

### Desenvolvimento local

```bash
# Instalar dependências
npm install

# Subir apenas infraestrutura (Postgres, Redis, RabbitMQ)
docker-compose -f docker/docker-compose.yml up -d postgres redis rabbitmq

# Rodar migrations
npm run typeorm:run

# Iniciar em modo desenvolvimento
npm run start:dev
```

A API estará em http://localhost:3333

### Popular dados iniciais

```bash
# Criar uma sessão com 16 assentos
curl -X POST http://localhost:3333/sessions \
  -H "Content-Type: application/json" \
  -d '{
    "movieName": "Inception",
    "sessionTime": "2026-02-01T19:00:00Z",
    "room": "Sala 1",
    "ticketPrice": 25.00,
    "totalSeats": 16
  }'
```

### Executar testes

```bash
# Todos os testes (unit + integration)
npm test

# Apenas testes unitários
npm run test:unit

# Apenas testes de integração/concorrência
npm run test:integration

# Testes em modo watch
npm run test:watch

# Testes com cobertura
npm run test:cov

# Testes e2e
npm run test:e2e
```

#### Estrutura de Testes

| Tipo | Localização | Comando | Descrição |
|------|-------------|---------|-----------|
| **Unitários** | `test/unit/` | `npm run test:unit` | Testes isolados dos services (LockService, CacheService, EventService, ReservationsService) |
| **Integração** | `test/integration/` | `npm run test:integration` | Testes de concorrência e race conditions |
| **E2E** | `test/*.e2e-spec.ts` | `npm run test:e2e` | Testes end-to-end da API |

#### Testes de Concorrência

Os testes de integração simulam cenários de alta concorrência:

- **Same Seat Race**: Múltiplos usuários tentando reservar o mesmo assento
- **Deadlock Prevention**: Reservas de múltiplos assentos em ordens diferentes
- **Double Payment**: Prevenção de pagamento duplicado
- **Idempotency**: Requisições duplicadas com mesma chave
- **High Load**: 20+ reservas simultâneas
- **Burst Traffic**: 50 usuários competindo por 5 assentos

## Estratégias Implementadas

### Como resolvemos Race Conditions?

Utilizamos uma estratégia de **3 camadas de proteção**:

1. **Lock Distribuído (Redlock)**: Antes de processar uma reserva, adquirimos um lock no Redis para cada assento. Isso impede que duas instâncias processem o mesmo assento simultaneamente.

2. **Lock Pessimista no Banco (FOR UPDATE)**: Dentro da transação, usamos `SELECT FOR UPDATE` para travar as linhas dos assentos, garantindo que nenhuma outra transação possa modificá-los.

3. **Validação de Status**: Verificamos se o assento está disponível antes de reservar, com rollback automático em caso de conflito.

```
Usuário A ──► Lock Redis (seat:123) ──► Transação ──► FOR UPDATE ──► Reserva ──► Commit ──► Libera Lock
Usuário B ──► Aguarda Lock Redis ────────────────────────────────────────────────────────► Tenta novamente
```

### Como garantimos coordenação entre múltiplas instâncias?

- **Redlock**: Algoritmo de lock distribuído que funciona com múltiplos nós Redis
- **Configuração**: TTL de 5s, 10 retries, 200ms entre tentativas
- **Locks são adquiridos por recurso**: `lock:seat:{seatId}`

### Como prevenimos Deadlocks?

**Ordenação de locks**: Quando múltiplos assentos são reservados, os locks são adquiridos em ordem alfabética dos IDs:

```typescript
// Sempre adquire locks na mesma ordem, independente da ordem do request
const sortedResources = [...resources].sort();
const lock = await redlock.acquire(sortedResources, ttl);
```

Isso garante que:
- Usuário A reservando [assento1, assento3] → locks em ordem: assento1, assento3
- Usuário B reservando [assento3, assento1] → locks em ordem: assento1, assento3
- Ambos tentam a mesma ordem, eliminando deadlocks

## Endpoints da API

### Sessões

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/sessions` | Lista todas as sessões |
| POST | `/sessions` | Cria uma nova sessão |
| GET | `/sessions/:id/availability` | Consulta disponibilidade de assentos |

**Criar sessão:**
```bash
curl -X POST http://localhost:3333/sessions \
  -H "Content-Type: application/json" \
  -d '{
    "movieName": "Inception",
    "sessionTime": "2026-02-01T19:00:00Z",
    "room": "Sala 1",
    "ticketPrice": 25.00,
    "totalSeats": 16
  }'
```

**Consultar disponibilidade:**
```bash
curl http://localhost:3333/sessions/{sessionId}/availability
```

### Assentos

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/seats/:sessionId` | Lista assentos de uma sessão |

```bash
curl http://localhost:3333/seats/{sessionId}
```

### Reservas

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/reservations` | Cria uma reserva (30s para pagar) |
| POST | `/reservations/:id/confirm-payment` | Confirma pagamento |

**Criar reserva:**
```bash
curl -X POST http://localhost:3333/reservations \
  -H "Content-Type: application/json" \
  -d '{
    "seatIds": ["uuid-do-assento"],
    "userId": "user-123",
    "idempotencyKey": "unique-key-123"
  }'
```

**Confirmar pagamento:**
```bash
curl -X POST http://localhost:3333/reservations/{reservationId}/confirm-payment \
  -H "Content-Type: application/json" \
  -d '{
    "paymentMethod": "credit_card"
  }'
```

### Documentação Swagger

Acesse http://localhost:3333/api-docs para documentação interativa.

## Decisões Técnicas

### 1. Reserva por Assento vs Reserva Agregada

Optamos por criar uma reserva **por assento** ao invés de uma reserva única para múltiplos assentos. Isso permite:
- Expiração granular (um assento pode expirar independente)
- Pagamento parcial (futuro)
- Queries mais simples de disponibilidade

### 2. Idempotência

Implementamos idempotência via `idempotencyKey` para proteger contra:
- Requisições duplicadas por timeout de rede
- Usuário clicando múltiplas vezes

A mesma chave retorna a reserva existente se ainda válida.

### 3. Cache de Disponibilidade

A disponibilidade de assentos é cacheada no Redis por 10 segundos para reduzir carga no banco. O cache é invalidado automaticamente quando há reserva ou venda.

### 4. Eventos Assíncronos

Publicamos eventos no RabbitMQ para:
- `reservation.created` - Reserva criada
- `payment.confirmed` - Pagamento confirmado
- `reservation.expired` - Reserva expirou

Isso permite adicionar consumers para notificações, analytics, etc.

## Limitações Conhecidas

1. **Autenticação**: Não há autenticação implementada. O `userId` é passado no body.
2. **Pagamento real**: Não há integração com gateway de pagamento.
3. **Testes de carga**: Não foram implementados testes de stress/carga.
4. **Rate Limiting**: Configurado mas não ativo.
5. **Retry em eventos**: Falta implementar retry com backoff exponencial para consumers.

## Melhorias Futuras

- [ ] Implementar autenticação JWT
- [ ] Adicionar rate limiting por IP/usuário
- [ ] Implementar Dead Letter Queue para mensagens que falharam
- [ ] Testes de carga com k6 ou Artillery
- [ ] Métricas com Prometheus/Grafana
- [ ] Circuit breaker para serviços externos
- [ ] WebSocket para atualização em tempo real de disponibilidade

## Exemplo de Fluxo para Testar

### 1. Criar sessão com 16 assentos

```bash
curl -X POST http://localhost:3333/sessions \
  -H "Content-Type: application/json" \
  -d '{
    "movieName": "Filme X",
    "sessionTime": "2026-02-01T19:00:00Z",
    "room": "Sala 1",
    "ticketPrice": 25.00,
    "totalSeats": 16
  }'
```

Salve o `id` da sessão retornado.

### 2. Consultar assentos disponíveis

```bash
curl http://localhost:3333/seats/{sessionId}
```

Salve o `id` de um assento para os próximos passos.

### 3. Simular 2 usuários reservando o mesmo assento

Em dois terminais simultâneos:

**Terminal 1:**
```bash
curl -X POST http://localhost:3333/reservations \
  -H "Content-Type: application/json" \
  -d '{
    "seatIds": ["{seatId}"],
    "userId": "user-A",
    "idempotencyKey": "key-user-a"
  }'
```

**Terminal 2:**
```bash
curl -X POST http://localhost:3333/reservations \
  -H "Content-Type: application/json" \
  -d '{
    "seatIds": ["{seatId}"],
    "userId": "user-B",
    "idempotencyKey": "key-user-b"
  }'
```

**Resultado esperado**: Apenas um usuário consegue a reserva. O outro recebe erro 409 (Conflict).

### 4. Verificar reservas geradas

```bash
curl http://localhost:3333/sessions/{sessionId}/availability
```

Deve mostrar 1 assento reservado e 15 disponíveis.

### 5. Confirmar pagamento

```bash
curl -X POST http://localhost:3333/reservations/{reservationId}/confirm-payment \
  -H "Content-Type: application/json" \
  -d '{"paymentMethod": "credit_card"}'
```

### 6. Verificar que assento foi vendido

```bash
curl http://localhost:3333/sessions/{sessionId}/availability
```

Deve mostrar 1 assento vendido e 15 disponíveis.

### Script automatizado (opcional)

```bash
#!/bin/bash
API_URL="http://localhost:3333"

# 1. Criar sessão
SESSION=$(curl -s -X POST "$API_URL/sessions" \
  -H "Content-Type: application/json" \
  -d '{"movieName":"Filme X","sessionTime":"2026-02-01T19:00:00Z","room":"Sala 1","ticketPrice":25,"totalSeats":16}')
SESSION_ID=$(echo $SESSION | jq -r '.id')
echo "Sessão criada: $SESSION_ID"

# 2. Pegar primeiro assento
SEATS=$(curl -s "$API_URL/seats/$SESSION_ID")
SEAT_ID=$(echo $SEATS | jq -r '.[0].id')
echo "Assento selecionado: $SEAT_ID"

# 3. Duas reservas simultâneas
echo "Iniciando reservas simultâneas..."
curl -s -X POST "$API_URL/reservations" -H "Content-Type: application/json" \
  -d "{\"seatIds\":[\"$SEAT_ID\"],\"userId\":\"user-A\",\"idempotencyKey\":\"key-a\"}" &
curl -s -X POST "$API_URL/reservations" -H "Content-Type: application/json" \
  -d "{\"seatIds\":[\"$SEAT_ID\"],\"userId\":\"user-B\",\"idempotencyKey\":\"key-b\"}" &
wait

# 4. Verificar disponibilidade
echo "Verificando disponibilidade..."
curl -s "$API_URL/sessions/$SESSION_ID/availability" | jq
```

## Estrutura do Projeto

```
src/
├── config/              # Configurações (database, rabbitmq, redis)
├── database/
│   ├── entities/        # Entidades TypeORM (Session, Seats, Reservation, Sale)
│   └── migrations/      # Migrations do banco
├── modules/
│   ├── sessions/        # CRUD de sessões
│   ├── seats/           # Gestão de assentos
│   ├── reservations/    # Lógica de reserva (core)
│   └── sales/           # Vendas confirmadas
├── shared/
│   ├── services/        # LockService, CacheService, EventService
│   └── decorators/      # Decorators customizados
└── events/
    ├── handlers/        # Handlers de eventos
    └── consumers/       # Consumers RabbitMQ
```
