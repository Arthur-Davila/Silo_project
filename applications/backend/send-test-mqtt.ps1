param(
    [double]$TempGrao = 29.4,
    [double]$TempAr = 25.0,
    [double]$Umidade = 60.0
)

$ErrorActionPreference = "Stop"

$brokerRunning = docker inspect --format "{{.State.Running}}" mosquitto 2>$null
if ($LASTEXITCODE -ne 0) {
    throw "Container mosquitto não encontrado. Inicie o broker no Docker Desktop antes do teste."
}

if ($brokerRunning -ne "true") {
    Write-Host "Iniciando o container Mosquitto..."
    docker start mosquitto | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw "Não foi possível iniciar o container mosquitto."
    }
}

$health = Invoke-RestMethod -Uri "http://localhost:3001/api/health" -TimeoutSec 5
if (-not $health.mqttConnected) {
    throw "A API ainda não conectou ao broker MQTT. Verifique: docker logs silo-api"
}

$diferenca = [Math]::Round($TempGrao - $TempAr, 1)
$payload = [ordered]@{
    temp_grao = $TempGrao
    temp_ar = $TempAr
    umid_ar = $Umidade
    diferenca = $diferenca
    origem = "teste_manual"
} | ConvertTo-Json -Compress

$encodedPayload = [Convert]::ToBase64String(
    [Text.Encoding]::UTF8.GetBytes($payload)
)

docker exec mosquitto sh -c "printf '%s' '$encodedPayload' | base64 -d | mosquitto_pub -h localhost -t silo/dados -q 1 -s"
if ($LASTEXITCODE -ne 0) {
    throw "Não foi possível publicar no tópico silo/dados."
}

$readingSaved = $false
for ($attempt = 0; $attempt -lt 10; $attempt++) {
    $readings = Invoke-RestMethod -Uri "http://localhost:3001/api/readings/recent?limit=100" -TimeoutSec 5
    $readingSaved = @($readings | Where-Object {
        [Math]::Abs([double]$_.tempGrao - $TempGrao) -lt 0.0001 -and
        [Math]::Abs([double]$_.tempAr - $TempAr) -lt 0.0001 -and
        [Math]::Abs([double]$_.umidAr - $Umidade) -lt 0.0001
    }).Count -gt 0

    if ($readingSaved) {
        break
    }

    Start-Sleep -Seconds 1
}

if (-not $readingSaved) {
    throw "A mensagem foi publicada, mas não apareceu no histórico da API."
}

Write-Host "Teste concluído: MQTT publicou e a API gravou a leitura no SQLite."
Write-Host "Grãos: $TempGrao °C | Ar: $TempAr °C | Umidade: $Umidade %"
Write-Host "Abra http://localhost:8443 para ver a leitura no painel."
Write-Host "A leitura de teste permanece no histórico; a próxima leitura do ESP32 atualizará os valores atuais."
