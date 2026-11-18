# API e armazenamento MQTT

A API assina `silo/dados`, valida cada mensagem JSON e grava os valores e o
payload original em SQLite. O arquivo do banco fica no volume Docker
`telemetry-data`, portanto continua disponível após reiniciar ou recriar o
container.

## Endpoints

- `GET /api/health`: estado da API, do broker MQTT e horário da última leitura.
- `GET /api/readings/latest`: leitura mais recente.
- `GET /api/readings/recent?limit=12`: últimas leituras (limite de 1 a 100).
- `GET /api/readings?hours=24&points=300`: histórico agrupado para gráficos.

As leituras parciais também são guardadas quando pelo menos um valor de sensor
é numérico.
