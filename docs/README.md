# Documentação do Silo Sense

Este guia reúne a visão do projeto, configuração, inicialização, testes e
explicação de cada tecnologia usada no monitoramento do silo.

## Índice

- [Visão geral](#visão-geral)
- [Arquitetura e fluxo dos dados](#arquitetura-e-fluxo-dos-dados)
- [Tecnologias e responsabilidades](#tecnologias-e-responsabilidades)
- [Pré-requisitos](#pré-requisitos)
- [Executar pelo Git Bash](#executar-pelo-git-bash)
- [Enviar uma leitura MQTT de teste](#enviar-uma-leitura-mqtt-de-teste)
- [Formato das mensagens MQTT](#formato-das-mensagens-mqtt)
- [API HTTP](#api-http)
- [Banco de dados e persistência](#banco-de-dados-e-persistência)
- [ESP32 e sensores](#esp32-e-sensores)
- [Desenvolvimento e testes](#desenvolvimento-e-testes)
- [Solução de problemas](#solução-de-problemas)
- [Estrutura do repositório](#estrutura-do-repositório)

## Visão geral

O ESP32 coleta temperatura dos grãos, temperatura do ar e umidade. As leituras
são publicadas por MQTT, persistidas no SQLite e apresentadas pelo painel web.

O sistema usa o tópico MQTT `silo/dados`. O broker Mosquitto escuta na porta
`1883`; a API HTTP usa a porta `3001`; o painel web usa a porta `8443`.

## Arquitetura e fluxo dos dados

```text
DS18B20 e DHT11
      │ leituras
      ▼
ESP32 ── MQTT / silo/dados ──► Mosquitto
                                    │
                                    ▼
                             API Python / Paho
                                    │
                                    ▼
                             SQLite / volume Docker
                                    │ HTTP / JSON
                                    ▼
                             Painel React / Vite
```

1. As tarefas FreeRTOS no firmware leem os sensores.
2. O ESP32 publica mensagens JSON no broker Mosquitto pelo Wi-Fi.
3. A API assina `silo/dados`, valida os campos e grava cada leitura.
4. O painel consulta a API e atualiza os valores, gráficos e histórico.

O front-end não se conecta diretamente ao broker nem ao arquivo SQLite; usa a
API HTTP. Node-RED é opcional e pode ser usado para observar mensagens ou montar
fluxos de automação.

## Tecnologias e responsabilidades

| Tecnologia | Responsabilidade |
| --- | --- |
| ESP32, Arduino e FreeRTOS | Leitura dos sensores e tarefas de comunicação |
| DS18B20 | Temperatura dos grãos |
| DHT11 | Temperatura e umidade do ar |
| `OneWire` e `DallasTemperature` | Comunicação e leitura do DS18B20 |
| `DHT` | Leitura do sensor DHT11 |
| `PubSubClient` | Publicação MQTT pelo ESP32 |
| MQTT | Protocolo leve para troca de mensagens |
| Mosquitto | Broker que recebe e distribui as mensagens MQTT |
| Python e Paho MQTT | Consumidor MQTT e servidor HTTP da API |
| SQLite | Armazenamento local das leituras |
| React e TypeScript | Interface e atualização do painel |
| Vite | Servidor de desenvolvimento, build e proxy `/api` |
| Docker Compose | Configuração e execução dos containers |
| Node-RED | Ferramenta opcional de fluxos e inspeção MQTT |

## Pré-requisitos

- Docker Desktop aberto e funcionando.
- Git Bash (incluído no Git for Windows).
- ESP32 configurado no PlatformIO, se for usar sensores reais.
- ESP32 e computador conectados à mesma rede local para comunicar com o broker.

## Executar pelo Git Bash

Os comandos abaixo são para o **Git Bash**, aberto na raiz do repositório.
Nesse terminal, os caminhos usam `/`, como em `applications/backend/...`.

### 1. Iniciar o Mosquitto

Neste ambiente, o broker já existe como container `mosquitto`. Para iniciá-lo,
se estiver parado:

```bash
docker start mosquitto
```

O comando não recria nem reinicia um broker que já esteja rodando. Confirme o
estado e a porta:

```bash
docker ps --filter name=mosquitto
```

Deve aparecer a porta publicada `1883->1883`.

Se estiver configurando outra máquina sem esse container, inicie o broker
definido pelo Compose junto com a API e o painel:

```bash
docker compose -p silo-dashboard -f applications/backend/mosquitto/docker-compose.yml up -d --build mosquitto api frontend
```

**Não execute esse segundo comando enquanto outro container já estiver usando
o nome `mosquitto` ou a porta `1883`.** No ambiente atual, use `docker start
mosquitto` e inicie somente a API e o painel nos passos seguintes.

### 2. Iniciar API e painel

```bash
docker compose -p silo-dashboard -f applications/backend/mosquitto/docker-compose.yml up -d --build api frontend
```

Esse comando pode ser repetido após mudanças no código para reconstruir as
imagens. Para ver o estado:

```bash
docker compose -p silo-dashboard -f applications/backend/mosquitto/docker-compose.yml ps
```

### 3. Conferir os endereços

```bash
curl http://localhost:3001/api/health
```

O resultado esperado inclui `"apiConnected": true` e `"mqttConnected": true`.
Endereços locais:

- Painel: <http://localhost:8443>
- Saúde da API: <http://localhost:3001/api/health>
- Node-RED, se estiver em execução: <http://localhost:1880>

### 4. Parar sem apagar os dados

Para parar a API e o painel, mantendo o volume do banco:

```bash
docker compose -p silo-dashboard -f applications/backend/mosquitto/docker-compose.yml down
```

Não acrescente `-v`: essa opção remove volumes e apaga o banco persistido.
Esse comando não para um broker criado por outro projeto Compose. Se necessário,
pare o container Mosquitto separadamente pelo Docker Desktop.

## Enviar uma leitura MQTT de teste

O script de teste prepara um JSON, publica no tópico `silo/dados` e verifica se
a leitura chegou ao histórico pela API. Como o Git Bash está no Windows, use
`cygpath -w` para converter o caminho do script para o formato esperado pelo
PowerShell:

```bash
SCRIPT_PATH=$(cygpath -w applications/backend/send-test-mqtt.ps1)
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$SCRIPT_PATH"
```

Para enviar valores próprios:

```bash
SCRIPT_PATH=$(cygpath -w applications/backend/send-test-mqtt.ps1)
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$SCRIPT_PATH" -TempGrao 30 -TempAr 25 -Umidade 57
```

O script informa se a publicação e a gravação foram confirmadas. O registro de
teste fica no histórico e aparece no painel; uma leitura posterior do ESP32
atualiza os valores atuais. `-ExecutionPolicy Bypass` vale apenas para esse
processo PowerShell e não altera a política permanente do computador.

Para acompanhar os serviços em tempo real:

```bash
docker logs -f silo-api
docker logs -f mosquitto
```

Use `Ctrl+C` para sair da visualização dos logs.

## Formato das mensagens MQTT

- **Broker**: Mosquitto, porta `1883`.
- **Tópico**: `silo/dados`.
- **Payload**: objeto JSON UTF-8.

Exemplo:

```json
{"temp_grao":29.4,"temp_ar":25.0,"umid_ar":60,"diferenca":4.4}
```

| Campo | Tipo | Significado |
| --- | --- | --- |
| `temp_grao` | número ou ausente | Temperatura dos grãos, em °C |
| `temp_ar` | número ou ausente | Temperatura do ar, em °C |
| `umid_ar` | número ou ausente | Umidade relativa do ar, em % |
| `diferenca` | número ou ausente | `temp_grao - temp_ar`, em °C |

Se `diferenca` não vier, a API calcula o valor quando as duas temperaturas
estiverem presentes. Mensagens parciais também são armazenadas se tiverem pelo
menos um campo numérico reconhecido. JSON inválido ou sem valores reconhecidos
não é gravado.

## API HTTP

As respostas são JSON. Endpoints disponíveis:

| Método e rota | Resultado |
| --- | --- |
| `GET /api/health` | Estado da API, conexão MQTT e horário da leitura mais recente |
| `GET /api/readings/latest` | Leitura mais recente ou `null` antes da primeira |
| `GET /api/readings/recent?limit=12` | Histórico recente; `limit` de 1 a 100 |
| `GET /api/readings?hours=24&points=300` | Leituras agrupadas para gráficos; `hours` de 1 a 168 e `points` de 1 a 1000 |

Exemplos no Git Bash:

```bash
curl http://localhost:3001/api/readings/latest
curl "http://localhost:3001/api/readings/recent?limit=12"
curl "http://localhost:3001/api/readings?hours=24&points=300"
```

O Vite encaminha solicitações do painel em `/api` para a API. Isso permite que
o navegador use o mesmo endereço do painel sem precisar se conectar diretamente
ao banco ou ao broker.

## Banco de dados e persistência

A API cria automaticamente a tabela `readings`, com horário de recebimento,
tópico, valores dos sensores e payload MQTT original. O arquivo fica em
`/data/telemetry.sqlite` dentro do container da API; o diretório `/data` é
montado no volume Docker `telemetry-data`.

Esse volume permanece quando o container para ou é reconstruído. Evite
`docker compose down -v` para não apagá-lo. A API fornece leituras recentes e
agrega os dados por intervalo para evitar retornar milhares de pontos aos
gráficos.

## ESP32 e sensores

O firmware está em `Esp32/src/main.cpp`; o perfil e as bibliotecas do PlatformIO
estão em `Esp32/platformio.ini`.

| Componente | Configuração atual |
| --- | --- |
| DS18B20 | Barramento OneWire no GPIO 4 |
| DHT11 | GPIO 15 |
| Wi-Fi | SSID e senha definidos no início de `main.cpp` |
| Broker MQTT | Endereço IP da máquina que publica a porta `1883` |
| Publicação MQTT | Tópico `silo/dados`, a cada aproximadamente 2 segundos |

Antes de gravar o firmware, ajuste SSID, senha e `MQTT_SERVER` para a sua rede.
O ESP32 precisa usar o IPv4 local do computador conectado à rede, e não
`localhost`, `127.0.0.1` ou o endereço interno do container. O endereço do
computador pode mudar; confirme-o com `ipconfig`. Nunca publique senhas de
Wi-Fi em repositórios públicos.

O firmware usa tarefas FreeRTOS: tarefas leem os sensores, outra mantém a
conexão Wi-Fi/MQTT e publica os dados, e uma tarefa apresenta as leituras no
monitor serial. As leituras compartilhadas entre tarefas são protegidas por um
mutex.

## Desenvolvimento e testes

### Firmware PlatformIO

Com a extensão PlatformIO no VS Code, abra `Esp32` como projeto e use os comandos
PlatformIO **Build**, **Upload** e **Monitor**. O monitor serial usa `115200
baud`. Com o CLI instalado, a compilação também pode ser feita assim no Git
Bash:

```bash
cd Esp32
pio run
```

### API

Os testes unitários de parsing e armazenamento SQLite ficam em
`applications/backend/api/tests`:

```bash
cd applications/backend/api
python -m unittest discover -s tests -v
```

O container da API instala `paho-mqtt` por meio do arquivo
`applications/backend/api/requirements.txt`.

### Front-end

```bash
cd applications/frontend
npm ci
npm run build
npm exec tsc -- --noEmit
```

Para desenvolvimento local sem Docker, mantenha a API na porta `3001` e inicie
o Vite:

```bash
npm run dev
```

O Vite inicia na porta `8443` e usa o proxy configurado em `vite.config.ts`.

## Solução de problemas

### `docker start mosquitto` diz que não encontrou o container

Confirme se o Docker Desktop está aberto. Em uma instalação sem container
Mosquitto existente, use o comando Compose de primeira execução descrito em
[Executar pelo Git Bash](#executar-pelo-git-bash).

### API indica `"mqttConnected": false`

Confira se a porta `1883` está publicada e leia os logs:

```bash
docker ps --filter name=mosquitto
docker logs --tail 100 silo-api
docker logs --tail 100 mosquitto
```

A API está configurada para acessar o broker já publicado pelo host em
`host.docker.internal:1883`. Verifique se nenhum outro container ou serviço
está usando essa porta.

### O painel não recebe leituras

1. Verifique se o ESP32 e o computador estão na mesma rede.
2. Confirme o IPv4 em `MQTT_SERVER` no firmware e faça novo upload.
3. Confirme que o broker recebe mensagens no tópico `silo/dados`.
4. Envie uma leitura de teste com o script desta documentação.
5. Confira o estado da API em `http://localhost:3001/api/health` e os logs de
   `silo-api`.

Se o firewall do Windows bloquear conexões, permita tráfego TCP de entrada na
porta `1883` para a rede privada.

## Estrutura do repositório

```text
.
├── docs/
│   └── README.md                 # Guia completo
├── Esp32/
│   ├── platformio.ini            # Placa e bibliotecas
│   └── src/main.cpp              # Firmware ESP32
├── applications/
│   ├── backend/
│   │   ├── api/                  # API, SQLite e testes
│   │   ├── mosquitto/            # Compose, Mosquitto e dados do Node-RED
│   │   └── send-test-mqtt.ps1    # Publica e verifica uma leitura de teste
│   └── frontend/                 # Painel React, Vite e TypeScript
└── schematics/                   # Diagramas e fotos do protótipo
```
