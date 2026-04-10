@echo off
chcp 65001 >nul

echo === Testing Task Allocation API ===
echo.

REM Step 1: Login and get token
echo Step 1: Login...
curl -s -X POST http://localhost:8080/api/auth/login ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"reviewer@heritage.demo\",\"password\":\"DemoPass123\"}" > token_response.json

type token_response.json
echo.
echo.

REM Extract token (simple approach - in real scenario use proper JSON parsing)
for /f "tokens=2 delims=:" %%a in ('findstr "accessToken" token_response.json') do (
    set TOKEN=%%a
)
set TOKEN=%TOKEN:"=%
set TOKEN=%TOKEN:}=%
set TOKEN=%TOKEN: =%

echo Token: %TOKEN%
echo.

REM Step 2: Get next task
echo Step 2: Get Next Task...
curl -s -X POST http://localhost:8080/api/tasks/next ^
  -H "Authorization: Bearer %TOKEN%" ^
  -H "Content-Type: application/json"

echo.
echo.

REM Step 3: Check database state
echo Step 3: Database State (locked tasks):
mysql -u root -p123456 -e "SELECT HEX(id) as id, title, status, HEX(locked_by) as locked_by FROM heritage.resources WHERE status='IN_REVIEW';" 2>nul

del token_response.json 2>nul

echo.
echo === Test Complete ===
pause
