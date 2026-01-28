#!/bin/bash

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

API_URL="http://localhost:3000"

echo -e "${YELLOW}🎬 Teste do Fluxo de Pagamento - Sistema de Ingressos${NC}"
echo "================================================"
echo ""

# Passo 1: Criar uma sessão
echo -e "${YELLOW}📍 Passo 1: Criando sessão de cinema...${NC}"
SESSION_RESPONSE=$(curl -s -X POST "${API_URL}/sessions" \
  -H "Content-Type: application/json" \
  -d '{
    "movieTitle": "Matrix Resurrections",
    "startTime": "2026-01-28T19:00:00Z",
    "roomNumber": "Sala 1",
    "ticketPrice": 25.00,
    "totalSeats": 16
  }')

SESSION_ID=$(echo $SESSION_RESPONSE | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$SESSION_ID" ]; then
  echo -e "${RED}❌ Erro ao criar sessão${NC}"
  echo $SESSION_RESPONSE
  exit 1
fi

echo -e "${GREEN}✅ Sessão criada: ${SESSION_ID}${NC}"
echo ""

# Aguardar criação dos assentos
sleep 2

# Passo 2: Buscar assentos disponíveis
echo -e "${YELLOW}📍 Passo 2: Buscando assentos disponíveis...${NC}"
SEATS_RESPONSE=$(curl -s -X GET "${API_URL}/sessions/${SESSION_ID}/availability")
echo $SEATS_RESPONSE | jq '.'

SEAT_ID=$(echo $SEATS_RESPONSE | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$SEAT_ID" ]; then
  echo -e "${RED}❌ Nenhum assento encontrado${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Assento selecionado: ${SEAT_ID}${NC}"
echo ""

# Passo 3: Criar reserva
echo -e "${YELLOW}📍 Passo 3: Criando reserva...${NC}"
RESERVATION_RESPONSE=$(curl -s -X POST "${API_URL}/reservations" \
  -H "Content-Type: application/json" \
  -d "{
    \"seatIds\": [\"${SEAT_ID}\"],
    \"userId\": \"user-test-$(date +%s)\",
    \"idempotencyKey\": \"test-payment-$(date +%s)\"
  }")

echo $RESERVATION_RESPONSE | jq '.'

RESERVATION_ID=$(echo $RESERVATION_RESPONSE | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$RESERVATION_ID" ]; then
  echo -e "${RED}❌ Erro ao criar reserva${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Reserva criada: ${RESERVATION_ID}${NC}"
echo -e "${YELLOW}⏳ Reserva expira em 30 segundos...${NC}"
echo ""

# Passo 4: Confirmar pagamento
echo -e "${YELLOW}📍 Passo 4: Confirmando pagamento...${NC}"
PAYMENT_RESPONSE=$(curl -s -X POST "${API_URL}/reservations/${RESERVATION_ID}/confirm-payment" \
  -H "Content-Type: application/json" \
  -d '{
    "paymentMethod": "credit_card"
  }')

echo $PAYMENT_RESPONSE | jq '.'

SALE_ID=$(echo $PAYMENT_RESPONSE | grep -o '"saleId":"[^"]*"' | cut -d'"' -f4)

if [ -z "$SALE_ID" ]; then
  echo -e "${RED}❌ Erro ao confirmar pagamento${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Pagamento confirmado! Venda ID: ${SALE_ID}${NC}"
echo ""

# Passo 5: Verificar disponibilidade atualizada
echo -e "${YELLOW}📍 Passo 5: Verificando disponibilidade atualizada...${NC}"
UPDATED_SEATS=$(curl -s -X GET "${API_URL}/sessions/${SESSION_ID}/availability")
echo $UPDATED_SEATS | jq '.'

echo ""
echo -e "${GREEN}🎉 Teste completo! Fluxo de pagamento funcionando corretamente.${NC}"