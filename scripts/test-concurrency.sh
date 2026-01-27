#!/bin/bash

# Configurações
API_URL="http://localhost:3000/api/v1"
SESSION_ID="<seu-session-id-aqui>"
SEAT_ID="<seu-seat-id-aqui>"
NUM_CONCURRENT_REQUESTS=10

echo "🎬 Teste de Concorrência - Sistema de Ingressos"
echo "================================================"
echo ""

# Função para fazer requisição
make_reservation() {
  local user_id=$1
  local idempotency_key=$2
  
  curl -X POST "${API_URL}/reservations" \
    -H "Content-Type: application/json" \
    -d "{
      \"seatIds\": [\"${SEAT_ID}\"],
      \"userId\": \"user-${user_id}\",
      \"idempotencyKey\": \"${idempotency_key}\"
    }" \
    -w "\nStatus: %{http_code}\n" \
    -s
}

echo "Teste 1: ${NUM_CONCURRENT_REQUESTS} usuários tentando reservar o mesmo assento"
echo "-----------------------------------------------------------------------"

# Executar requisições em paralelo
for i in $(seq 1 $NUM_CONCURRENT_REQUESTS); do
  make_reservation $i "test-concurrent-$i" &
done

# Aguardar todas as requisições
wait

echo ""
echo "Teste 2: Verificar disponibilidade"
echo "-----------------------------------"

curl -X GET "${API_URL}/sessions/${SESSION_ID}/availability" \
  -H "Content-Type: application/json" \
  -s | jq .

echo ""
echo "Teste 3: Idempotência - mesma requisição 2x"
echo "--------------------------------------------"

IDEM_KEY="idempotent-test-$(date +%s)"

echo "Requisição 1:"
make_reservation "100" "$IDEM_KEY"

sleep 1

echo ""
echo "Requisição 2 (mesma chave):"
make_reservation "100" "$IDEM_KEY"

echo ""
echo "✅ Testes concluídos!"