# Simple API Test for Task Allocation
# Run this in PowerShell

$baseUrl = "http://localhost:8080"

# Step 1: Login
Write-Host "=== Step 1: Login ===" -ForegroundColor Green
$loginBody = @{
    email = "reviewer@heritage.demo"
    password = "DemoPass123"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method POST -ContentType "application/json" -Body $loginBody
    $token = $loginResponse.accessToken
    Write-Host "✅ Login successful" -ForegroundColor Green
    Write-Host "Token: $token"
} catch {
    Write-Host "❌ Login failed: $_" -ForegroundColor Red
    exit
}

# Step 2: Get Next Task
Write-Host "`n=== Step 2: Get Next Task ===" -ForegroundColor Green
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

try {
    $task = Invoke-RestMethod -Uri "$baseUrl/api/tasks/next" -Method POST -Headers $headers
    Write-Host "✅ Got task:" -ForegroundColor Green
    $task | ConvertTo-Json
} catch {
    Write-Host "❌ Get task failed: $_" -ForegroundColor Red
    Write-Host "Status: $($_.Exception.Response.StatusCode)"
}

# Step 3: Check database
Write-Host "`n=== Step 3: Check Database ===" -ForegroundColor Green
Write-Host "Run this SQL to verify:"
Write-Host "SELECT id, title, status, locked_by FROM resources WHERE status='IN_REVIEW';" -ForegroundColor Yellow
