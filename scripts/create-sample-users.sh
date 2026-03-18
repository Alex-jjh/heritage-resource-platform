#!/bin/bash
API="http://localhost:8080"
POOL_ID="us-east-1_9wstms0ZI"
DB_PASS="HeritageDb2026!"

declare -A USERS
USERS[viewer]="viewer@heritage.demo|SampleViewer|DemoPass123|REGISTERED_VIEWER"
USERS[contributor]="contributor@heritage.demo|SampleContributor|DemoPass123|CONTRIBUTOR"
USERS[reviewer]="reviewer@heritage.demo|SampleReviewer|DemoPass123|REVIEWER"
USERS[admin]="admin@heritage.demo|SampleAdmin|DemoPass123|ADMINISTRATOR"

for key in viewer contributor reviewer admin; do
  IFS='|' read -r EMAIL NAME PASS ROLE <<< "${USERS[$key]}"
  echo "=== Creating $ROLE: $EMAIL ==="

  # Register
  HTTP=$(curl -s -o /tmp/reg.json -w "%{http_code}" -X POST "$API/api/auth/register" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\",\"displayName\":\"$NAME\"}")
  echo "  Register: HTTP $HTTP - $(cat /tmp/reg.json)"

  if [ "$ROLE" != "REGISTERED_VIEWER" ]; then
    # Update DB role
    mysql -u root -p"$DB_PASS" heritage -e "UPDATE users SET role='$ROLE' WHERE email='$EMAIL';" 2>/dev/null
    echo "  DB role updated to $ROLE"

    # Update Cognito role
    aws cognito-idp admin-update-user-attributes \
      --user-pool-id "$POOL_ID" \
      --username "$EMAIL" \
      --user-attributes Name="custom:role",Value="$ROLE" \
      --region us-east-1 2>/dev/null && echo "  Cognito role updated to $ROLE" || echo "  Cognito update skipped (no aws cli)"
  fi
done

echo ""
echo "=== All sample users created ==="
mysql -u root -p"$DB_PASS" heritage -e "SELECT email, display_name, role FROM users;" 2>/dev/null
