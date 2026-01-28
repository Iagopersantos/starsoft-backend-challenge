# 📋 Lista de Micro Tarefas - starsoft-backend-challenge

## 🔴 **PRIORIDADE CRÍTICA** (Fazer PRIMEIRO)

### 📝 README.md

- [ ] **T001**: Deletar conteúdo atual do README.md (template do NestJS)
- [ ] **T002**: Adicionar seção "🎯 Visão Geral" explicando o que é o projeto
- [ ] **T003**: Adicionar seção "🛠️ Tecnologias Escolhidas" justificando PostgreSQL
- [ ] **T004**: Adicionar seção "🛠️ Tecnologias Escolhidas" justificando Redis/Redlock
- [ ] **T005**: Adicionar seção "🛠️ Tecnologias Escolhidas" justificando RabbitMQ
- [ ] **T006**: Adicionar seção "🛠️ Tecnologias Escolhidas" justificando NestJS
- [ ] **T007**: Adicionar seção "🚀 Como Executar" com comando de clone
- [ ] **T008**: Adicionar seção "🚀 Como Executar" com comando docker-compose
- [ ] **T009**: Adicionar seção "🚀 Como Executar" com URLs de acesso (API, Swagger, RabbitMQ)
- [ ] **T010**: Adicionar seção "📊 Estrutura do Banco de Dados" com diagrama SQL
- [ ] **T011**: Adicionar seção "🔒 Estratégias de Concorrência" - Race Conditions
- [ ] **T012**: Adicionar seção "🔒 Estratégias de Concorrência" - Deadlocks
- [ ] **T013**: Adicionar seção "🔒 Estratégias de Concorrência" - Idempotência
- [ ] **T014**: Adicionar seção "🔒 Estratégias de Concorrência" - Expiração de reservas
- [ ] **T015**: Adicionar seção "📡 Endpoints da API" - POST /sessions
- [ ] **T016**: Adicionar seção "📡 Endpoints da API" - GET /sessions/:id/availability
- [ ] **T017**: Adicionar seção "📡 Endpoints da API" - POST /reservations
- [ ] **T018**: Adicionar seção "📡 Endpoints da API" - POST /reservations/:id/confirm-payment
- [ ] **T019**: Adicionar seção "📡 Endpoints da API" - GET /sales/history/:userId
- [ ] **T020**: Adicionar exemplos curl para cada endpoint
- [ ] **T021**: Adicionar seção "⚙️ Decisões Técnicas" - Por que Redlock?
- [ ] **T022**: Adicionar seção "⚙️ Decisões Técnicas" - Por que Pessimistic Locking?
- [ ] **T023**: Adicionar seção "⚙️ Decisões Técnicas" - Por que RabbitMQ?
- [ ] **T024**: Adicionar seção "⚙️ Decisões Técnicas" - Por que TypeORM?
- [ ] **T025**: Adicionar seção "⚠️ Limitações Conhecidas" - Expiração automática
- [ ] **T026**: Adicionar seção "⚠️ Limitações Conhecidas" - Migrations
- [ ] **T027**: Adicionar seção "⚠️ Limitações Conhecidas" - Testes
- [ ] **T028**: Adicionar seção "🔮 Melhorias Futuras" (5 itens)
- [ ] **T029**: Adicionar seção "🧪 Testando Concorrência" com instruções do script
- [ ] **T030**: Adicionar seção "🧪 Testando Concorrência" com resultado esperado
- [ ] **T031**: Revisar README completo e corrigir markdown

---

## 🟠 **PRIORIDADE ALTA** (Fazer DEPOIS do README)

### 🔧 Correções Funcionais Críticas

- [ ] **T032**: Criar `src/modules/reservations/dto/confirm-payment.dto.ts`
- [ ] **T033**: Adicionar validação `@IsOptional()` e `@IsString()` no DTO
- [ ] **T034**: Adicionar método `confirmPayment()` no `ReservationsController`
- [ ] **T035**: Adicionar decorators `@Post(':id/confirm-payment')` no método
- [ ] **T036**: Adicionar decorators `@Param('id')` para capturar reservationId
- [ ] **T037**: Adicionar decorators `@Body()` para capturar DTO
- [ ] **T038**: Adicionar decorator `@ApiOperation()` com descrição
- [ ] **T039**: Adicionar decorator `@ApiResponse()` para status 200
- [ ] **T040**: Adicionar decorator `@ApiResponse()` para status 400
- [ ] **T041**: Testar endpoint manualmente com curl/Postman

### ⏰ Expiração Automática de Reservas

- [ ] **T042**: Executar `npm install @nestjs/schedule`
- [ ] **T043**: Importar `ScheduleModule.forRoot()` no `app.module.ts`
- [ ] **T044**: Adicionar `import { Cron, CronExpression }` no `reservations.service.ts`
- [ ] **T045**: Criar método `@Cron(CronExpression.EVERY_30_SECONDS)`
- [ ] **T046**: Chamar `await this.expireReservations()` dentro do método cron
- [ ] **T047**: Adicionar log "Cron job started: checking expired reservations"
- [ ] **T048**: Testar criando reserva e aguardando 30s sem pagamento
- [ ] **T049**: Verificar logs confirmando execução do cron
- [ ] **T050**: Verificar no banco se reserva mudou para EXPIRED
- [ ] **T051**: Verificar no banco se assento voltou para AVAILABLE

### ✅ ValidationPipe Global

- [ ] **T052**: Abrir arquivo `src/main.ts`
- [ ] **T053**: Importar `ValidationPipe` de `@nestjs/common`
- [ ] **T054**: Adicionar `app.useGlobalPipes(new ValidationPipe())` após `app.listen()`
- [ ] **T055**: Adicionar opção `whitelist: true` no ValidationPipe
- [ ] **T056**: Adicionar opção `transform: true` no ValidationPipe
- [ ] **T057**: Adicionar opção `forbidNonWhitelisted: true` no ValidationPipe
- [ ] **T058**: Testar enviando campo inválido em um POST e verificar erro 400

---

## 🟡 **PRIORIDADE MÉDIA**

### 🗄️ Migrations de Banco de Dados

- [ ] **T059**: Criar arquivo `docker/scripts/init-db.sql` (referenciado no docker-compose)
- [ ] **T060**: Adicionar `CREATE DATABASE IF NOT EXISTS cinema_db;` no SQL
- [ ] **T061**: Adicionar script de criação da tabela `sessions` no SQL
- [ ] **T062**: Adicionar script de criação da tabela `seats` no SQL
- [ ] **T063**: Adicionar script de criação da tabela `reservations` no SQL
- [ ] **T064**: Adicionar script de criação da tabela `sales` no SQL
- [ ] **T065**: Adicionar índices em `seats(sessionId)`
- [ ] **T066**: Adicionar índices em `reservations(seatId, userId)`
- [ ] **T067**: Adicionar índices em `reservations(idempotencyKey)`
- [ ] **T068**: Adicionar dados de exemplo (1 sessão, 16 assentos)
- [ ] **T069**: Testar recriando containers e verificando se dados são populados

### 📝 Documentação no Código

- [ ] **T070**: Adicionar comentário JSDoc em `LockService.acquireLock()`
- [ ] **T071**: Adicionar comentário JSDoc em `LockService.withMultipleLocks()`
- [ ] **T072**: Adicionar comentário JSDoc em `EventService.publishReservationCreated()`
- [ ] **T073**: Adicionar comentário JSDoc em `CacheService.invalidateSessionCache()`
- [ ] **T074**: Adicionar comentário explicando ordenação de locks no código
- [ ] **T075**: Adicionar comentário explicando pessimistic_write no código

### 🧪 Script de Teste de Concorrência

- [ ] **T076**: Abrir `scripts/test-concurrency.sh`
- [ ] **T077**: Adicionar comentário no topo explicando o que o script faz
- [ ] **T078**: Adicionar instrução "Preencha SESSION_ID e SEAT_ID antes de executar"
- [ ] **T079**: Adicionar função para criar sessão automaticamente no início
- [ ] **T080**: Adicionar contador de sucessos/falhas ao final
- [ ] **T081**: Adicionar validação se curl está instalado
- [ ] **T082**: Adicionar validação se API está rodando antes de testar

---

## 🟢 **PRIORIDADE BAIXA** (Melhorias)

### 🧪 Testes Unitários

- [ ] **T083**: Criar `src/modules/reservations/reservations.service.spec.ts`
- [ ] **T084**: Configurar TestingModule com mocks
- [ ] **T085**: Criar teste "should prevent double booking"
- [ ] **T086**: Criar teste "should validate idempotency key"
- [ ] **T087**: Criar teste "should expire reservations after 30 seconds"
- [ ] **T088**: Criar teste "should throw error if seat not available"
- [ ] **T089**: Criar `src/shared/services/lock.service.spec.ts`
- [ ] **T090**: Criar teste "should acquire lock successfully"
- [ ] **T091**: Criar teste "should sort resources to prevent deadlock"
- [ ] **T092**: Executar `npm test` e verificar cobertura

### 🧪 Testes de Integração

- [ ] **T093**: Criar `test/reservations.e2e-spec.ts`
- [ ] **T094**: Criar teste "should create reservation successfully"
- [ ] **T095**: Criar teste "should confirm payment successfully"
- [ ] **T096**: Criar teste "should handle concurrent requests"
- [ ] **T097**: Criar setup para criar sessão antes de cada teste
- [ ] **T098**: Criar teardown para limpar banco após cada teste
- [ ] **T099**: Executar `npm run test:e2e` e verificar sucesso

### 🛡️ Rate Limiting (Diferencial)

- [ ] **T100**: Executar `npm install @nestjs/throttler`
- [ ] **T101**: Importar `ThrottlerModule.forRoot()` no `app.module.ts`
- [ ] **T102**: Configurar `ttl: 60, limit: 10` (10 req/min)
- [ ] **T103**: Adicionar `@UseGuards(ThrottlerGuard)` no `ReservationsController`
- [ ] **T104**: Testar enviando 11 requests em 60s e verificar erro 429

### 🔍 Melhorias de Código

- [ ] **T105**: Extrair constante `RESERVATION_TTL_SECONDS` para arquivo de config
- [ ] **T106**: Extrair URL do Redis para variável de ambiente
- [ ] **T107**: Extrair URL do RabbitMQ para variável de ambiente
- [ ] **T108**: Criar arquivo `.env.example` com todas as variáveis
- [ ] **T109**: Adicionar validação de variáveis de ambiente com Joi
- [ ] **T110**: Criar interface `ReservationResponse` para padronizar respostas
- [ ] **T111**: Criar enum `HttpExceptionMessages` para mensagens de erro
- [ ] **T112**: Refatorar queries longas para métodos separados

### 📊 Observabilidade (Diferencial Extra)

- [ ] **T113**: Adicionar métricas de latência nos logs
- [ ] **T114**: Adicionar contadores de reservas criadas/expiradas
- [ ] **T115**: Adicionar log de correlationId em cada requisição
- [ ] **T116**: Configurar níveis de log por ambiente (dev=DEBUG, prod=INFO)

---

## 📈 **Checklist Final de Validação**

### Antes de Submeter:

- [ ] **V001**: Rodar `docker-compose down -v` para limpar volumes
- [ ] **V002**: Rodar `docker-compose up` e verificar se todos os containers sobem
- [ ] **V003**: Acessar `http://localhost:3000/api-docs` e verificar Swagger
- [ ] **V004**: Criar uma sessão via API
- [ ] **V005**: Criar uma reserva via API
- [ ] **V006**: Confirmar pagamento via API
- [ ] **V007**: Verificar eventos no RabbitMQ Management (http://localhost:15672)
- [ ] **V008**: Executar script de teste de concorrência
- [ ] **V009**: Ler README completo e verificar se está claro
- [ ] **V010**: Executar `npm run lint` e corrigir erros
- [ ] **V011**: Executar `npm run format` para formatar código
- [ ] **V012**: Executar `npm test` (se houver testes)
- [ ] **V013**: Fazer commit com mensagem descritiva
- [ ] **V014**: Fazer push para o GitHub
- [ ] **V015**: Verificar se README está renderizando corretamente no GitHub

---

## 🎯 **Roadmap Sugerido**

### Sprint 1 (2-3 horas) - CRÍTICO
```
T001 → T031 (README completo)
T032 → T041 (Endpoint de confirmação)
T042 → T051 (Expiração automática)
T052 → T058 (ValidationPipe)
```

### Sprint 2 (1-2 horas) - IMPORTANTE
```
T059 → T069 (Migrations e dados iniciais)
T076 → T082 (Melhorar script de teste)
T108 (Criar .env.example)
```

### Sprint 3 (2-3 horas) - DESEJÁVEL
```
T083 → T092 (Testes unitários)
T093 → T099 (Testes E2E)
T100 → T104 (Rate limiting)
```

### Sprint 4 (1 hora) - POLISH
```
T070 → T075 (Documentação no código)
T105 → T112 (Refatorações)
V001 → V015 (Validação final)
```

---

## 📊 **Métricas de Progresso**

- **Total de tarefas**: 115
- **Críticas (🔴)**: 31 tarefas
- **Altas (🟠)**: 20 tarefas
- **Médias (🟡)**: 17 tarefas
- **Baixas (🟢)**: 32 tarefas
- **Validação**: 15 tarefas

**Tempo estimado total**: 8-12 horas  
**Tempo mínimo para aprovação**: 3-5 horas (Sprint 1 + Sprint 2)

---

💡 **Dica**: Use um gerenciador de tarefas como GitHub Projects, Trello ou Notion para acompanhar o progresso!