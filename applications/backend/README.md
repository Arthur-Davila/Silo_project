# Como funciona o monitoramento do Silo

Este projeto recebe as medições de um ESP32 por MQTT, salva cada mensagem em um
banco SQLite e exibe os valores e o histórico no painel web.

## Iniciar e conferir os serviços

No computador deste projeto, o broker já está rodando no container Docker
`mosquitto`, com a porta `1883` publicada. Para garantir que ele esteja
iniciado sem recriá-lo:

```powershell
docker start mosquitto
```

`docker start` não reinicia um container que já está rodando. A API e o painel
também iniciam pelos containers `silo-api` e `silo-frontend`. Para conferir:

```powershell
docker ps
curl.exe http://localhost:3001/api/health
```

O estado de saúde deve mostrar `"apiConnected": true` e `"mqttConnected": true`.
Abra `http://localhost:8443` para acessar o painel.

Se a API ou o painel não estiverem iniciados, na raiz do repositório execute:

```powershell
docker compose -p silo-dashboard -f applications\backend\mosquitto\docker-compose.yml up -d --build api frontend
```

Esse comando reaproveita o broker MQTT que já está publicado no computador.
Não suba outro serviço Mosquitto na porta `1883` se o container `mosquitto`
existente estiver rodando.

## Enviar uma leitura de teste

Na raiz do repositório, rode:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\applications\backend\send-test-mqtt.ps1
```

O script confere se o broker e a API estão disponíveis, publica uma leitura de
teste no tópico `silo/dados` e espera a confirmação de que ela foi gravada. A
leitura permanece no histórico, e o painel deve mostrar, por exemplo, `29,4 °C`
para os grãos. Quando o ESP32 publicar uma nova leitura, ela atualizará os
valores atuais.

Para enviar valores diferentes, passe as temperaturas e a umidade:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\applications\backend\send-test-mqtt.ps1 -TempGrao 30 -TempAr 25 -Umidade 57
```

O uso de `-ExecutionPolicy Bypass` vale apenas para esse processo e não altera a
política permanente do PowerShell.

Para observar as mensagens recebidas pela API:

```powershell
docker logs -f silo-api
```

Para verificar as últimas leituras pelo terminal:

```powershell
curl.exe http://localhost:3001/api/readings/recent?limit=12
```

## Formato MQTT esperado

- **Broker**: Mosquitto no Docker, acessível na rede local pela porta `1883`.
- **Tópico**: `silo/dados`.
- **Formato**: um objeto JSON UTF-8. Os campos reconhecidos são:
  - `temp_grao`: temperatura dos grãos em °C;
  - `temp_ar`: temperatura do ar em °C;
  - `umid_ar`: umidade relativa em %;
  - `diferenca`: diferença entre a temperatura dos grãos e a do ar em °C.

Exemplo de mensagem:

```json
{"temp_grao":29.4,"temp_ar":25.0,"umid_ar":60,"diferenca":4.4}
```

Se `diferenca` não vier, a API calcula `temp_grao - temp_ar` quando as duas
temperaturas estiverem presentes. Mensagens parciais também são salvas se
contiverem ao menos um valor numérico válido.

## O caminho dos dados e as tecnologias usadas

1. **ESP32 e sensores** — O firmware em `Esp32/src/main.cpp` lê o DS18B20 e o
   DHT11. A biblioteca Arduino `PubSubClient` publica as leituras em JSON pelo
   Wi-Fi no tópico `silo/dados`.
2. **Mosquitto e MQTT** — Mosquitto é o broker que recebe as publicações e as
   distribui aos assinantes. MQTT é o protocolo leve de mensagens usado entre o
   ESP32 e os serviços. A configuração está em
   `applications/backend/mosquitto/mosquitto.conf`.
3. **API Python** — `applications/backend/api/api.py` usa Paho MQTT para assinar
   `silo/dados`. Ao receber uma mensagem, valida e converte os campos com
   `storage.py`, que registra cada leitura no banco.
4. **SQLite** — O arquivo do banco é `telemetry.sqlite`, no volume Docker
   `telemetry-data`. As tabelas são criadas automaticamente na inicialização; o
   payload original também é guardado. O volume mantém as leituras após
   reiniciar ou recriar o container da API.
5. **API HTTP** — O front-end consulta a API; não acessa o banco diretamente.
   As rotas disponíveis são:
   - `GET /api/health`: estado da API, conexão MQTT e horário da última leitura;
   - `GET /api/readings/latest`: medição mais recente;
   - `GET /api/readings/recent?limit=12`: últimas medições, com limite de 1 a 100;
   - `GET /api/readings?hours=24&points=300`: histórico agrupado para gráficos.
6. **React, Vite e TypeScript** — O painel em
   `applications/frontend/src/App.tsx` atualiza valores e conexão a cada 5
   segundos, consulta os pontos do gráfico a cada 15 segundos e apresenta o
   histórico salvo. O proxy Vite encaminha `/api` ao serviço `silo-api`.
7. **Docker Compose** — A configuração em
   `applications/backend/mosquitto/docker-compose.yml` descreve os serviços e o
   volume persistente do banco. No ambiente atual, o Mosquitto existente foi
   iniciado por outro Compose e a API se conecta à porta publicada no host via
   `host.docker.internal:1883`.
8. **Node-RED** — O container opcional continua disponível em
   `http://localhost:1880` para visualizar e montar fluxos MQTT. Ele também
   deve apontar para o broker `mosquitto` quando estiver na mesma rede Docker,
   ou para `host.docker.internal` quando estiver em outra rede.

## Preservar os dados e segurança

Use `docker compose down` sem a opção `-v` para parar os serviços sem apagar o
banco. A opção `down -v` remove volumes e apaga o histórico.

O broker atual aceita conexões sem autenticação. Use-o apenas em uma rede
confiável e não exponha a porta `1883` diretamente à internet.
