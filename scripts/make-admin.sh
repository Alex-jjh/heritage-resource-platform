#!/bin/bash
EMAIL="alexjia@amazon.com"
POOL_ID="us-east-1_9wstms0ZI"

# Update database
mysql -u root -p'HeritageDb2026!' heritage -e "UPDATE users SET role='ADMINISTRATOR' WHERE email='${EMAIL}';"
echo "DB updated"

# Update Cognito custom:role attribute
aws cognito-idp admin-update-user-attributes \
  --user-pool-id "${POOL_ID}" \
  --username "${EMAIL}" \
  --user-attributes Name="custom:role",Value="ADMINISTRATOR" \
  --region us-east-1
echo "Cognito updated"

# Verify
mysql -u root -p'HeritageDb2026!' heritage -e "SELECT email, role FROM users WHERE email='${EMAIL}';"
echo "Done!"
