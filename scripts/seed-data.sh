#!/bin/bash
API="http://localhost:8080"

# First login as admin to get token
TOKEN=$(curl -s -X POST "$API/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@heritage.demo","password":"DemoPass123"}' | python3 -c "import sys,json; print(json.load(sys.stdin).get('idToken',''))" 2>/dev/null)

if [ -z "$TOKEN" ]; then
  echo "Failed to get admin token"
  exit 1
fi
echo "Got admin token"

AUTH="Authorization: Bearer $TOKEN"

echo "=== Creating Categories ==="
for name in "Historical Sites" "Traditional Crafts" "Oral Traditions" "Architecture" "Cultural Landscapes" "Artifacts" "Performing Arts" "Culinary Heritage"; do
  HTTP=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API/api/categories" \
    -H "Content-Type: application/json" -H "$AUTH" \
    -d "{\"name\":\"$name\"}")
  echo "  $name: $HTTP"
done

echo "=== Creating Tags ==="
for name in "UNESCO" "Endangered" "Living Heritage" "Ancient" "Medieval" "Modern" "Asia" "Europe" "Africa" "Americas" "Photography" "Documentary"; do
  HTTP=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API/api/tags" \
    -H "Content-Type: application/json" -H "$AUTH" \
    -d "{\"name\":\"$name\"}")
  echo "  $name: $HTTP"
done

echo "=== Done ==="
