# Silo Sense

Monitoramento de um silo experimental com ESP32, sensores, MQTT, API, banco
SQLite e painel web.

## Início rápido no Git Bash

Abra o Git Bash na pasta do projeto. O broker Mosquitto já existente pode ser
iniciado sem recriá-lo:

```bash
docker start mosquitto
```

Inicie ou atualize a API e o painel:

```bash
docker compose -p silo-dashboard -f applications/backend/mosquitto/docker-compose.yml up -d --build api frontend
```

Confira a conexão e abra o painel:

```bash
curl http://localhost:3001/api/health
```

- Painel: <http://localhost:8443>
- API: <http://localhost:3001/api/health>
- Node-RED, se estiver em execução: <http://localhost:1880>

Para publicar uma leitura MQTT de teste pelo Git Bash:

```bash
SCRIPT_PATH=$(cygpath -w applications/backend/send-test-mqtt.ps1)
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$SCRIPT_PATH" -TempGrao 30 -TempAr 25 -Umidade 57
```

O comando publica a mensagem, confirma que ela foi salva e deixa o registro no
histórico. A próxima mensagem do ESP32 atualiza os valores atuais.

## Documentação

Veja [`docs/README.md`](docs/README.md) para a arquitetura, instalação, uso do
Git Bash, testes MQTT, API, armazenamento, configuração do ESP32 e solução de
problemas.
