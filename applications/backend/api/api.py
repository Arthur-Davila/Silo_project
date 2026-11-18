import json
import logging
import os
import sqlite3
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlsplit

import paho.mqtt.client as mqtt

from storage import TelemetryStore, parse_payload


logging.basicConfig(
    level=os.environ.get("LOG_LEVEL", "INFO"),
    format="%(asctime)s %(levelname)s %(message)s",
)
logger = logging.getLogger("silo-api")

MQTT_HOST = os.environ.get("MQTT_HOST", "127.0.0.1")
MQTT_PORT = int(os.environ.get("MQTT_PORT", "1883"))
MQTT_TOPIC = os.environ.get("MQTT_TOPIC", "silo/dados")
API_PORT = int(os.environ.get("API_PORT", "3001"))
DB_PATH = os.environ.get("DB_PATH", "data/telemetry.sqlite")


def _serialize_error(handler, status, message):
    body = json.dumps({"error": message}, ensure_ascii=False).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json; charset=utf-8")
    handler.send_header("Content-Length", str(len(body)))
    handler.end_headers()
    handler.wfile.write(body)


def _query_integer(query, name, default, minimum, maximum):
    raw_value = query.get(name, [str(default)])[0]
    try:
        value = int(raw_value)
    except (TypeError, ValueError) as error:
        raise ValueError(f"'{name}' precisa ser um número inteiro.") from error
    if value < minimum or value > maximum:
        raise ValueError(f"'{name}' precisa estar entre {minimum} e {maximum}.")
    return value


def make_handler(store, mqtt_client):
    class ApiHandler(BaseHTTPRequestHandler):
        def _send_json(self, status, body):
            payload = json.dumps(body, ensure_ascii=False, allow_nan=False).encode("utf-8")
            self.send_response(status)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)

        def do_GET(self):
            route = urlsplit(self.path)
            query = parse_qs(route.query)

            try:
                if route.path == "/api/health":
                    store.check()
                    latest = store.latest()
                    self._send_json(
                        200,
                        {
                            "apiConnected": True,
                            "mqttConnected": mqtt_client.is_connected(),
                            "lastMessageAt": latest["receivedAt"] if latest else None,
                        },
                    )
                elif route.path == "/api/readings/latest":
                    self._send_json(200, store.latest())
                elif route.path == "/api/readings/recent":
                    limit = _query_integer(query, "limit", 12, 1, 100)
                    self._send_json(200, store.recent(limit))
                elif route.path == "/api/readings":
                    hours = _query_integer(query, "hours", 24, 1, 168)
                    points = _query_integer(query, "points", 300, 1, 1000)
                    self._send_json(200, store.chart(hours, points))
                else:
                    self._send_json(404, {"error": "Rota não encontrada."})
            except ValueError as error:
                self._send_json(400, {"error": str(error)})
            except (OSError, sqlite3.Error):
                logger.exception("Falha ao consultar o banco de dados.")
                self._send_json(503, {"error": "Banco de dados indisponível."})

        def log_message(self, format_string, *args):
            logger.info("HTTP %s - %s", self.address_string(), format_string % args)

    return ApiHandler


def main():
    store = TelemetryStore(DB_PATH)
    mqtt_client = mqtt.Client(
        callback_api_version=mqtt.CallbackAPIVersion.VERSION2,
        client_id="silo-history-api",
    )

    def on_connect(client, userdata, flags, reason_code, properties):
        if reason_code.is_failure:
            logger.error("Conexão MQTT recusada: %s", reason_code)
            return
        logger.info("Conectado ao broker MQTT %s:%s.", MQTT_HOST, MQTT_PORT)
        result, _ = client.subscribe(MQTT_TOPIC)
        if result != mqtt.MQTT_ERR_SUCCESS:
            logger.error("Não foi possível assinar o tópico %s.", MQTT_TOPIC)

    def on_disconnect(client, userdata, disconnect_flags, reason_code, properties):
        if reason_code.is_failure:
            logger.warning("Conexão MQTT interrompida: %s", reason_code)

    def on_message(client, userdata, message):
        raw_payload = message.payload.decode("utf-8", errors="replace")
        try:
            values = parse_payload(message.payload)
        except ValueError as error:
            logger.warning("Mensagem inválida no tópico %s: %s", message.topic, error)
            return
        if values is None:
            logger.warning("Mensagem sem campos de sensor no tópico %s.", message.topic)
            return

        try:
            store.insert(message.topic, values, raw_payload)
        except sqlite3.Error:
            logger.exception("Falha ao salvar mensagem MQTT no banco.")
            return
        logger.debug("Leitura recebida e salva em %s.", message.topic)

    mqtt_client.on_connect = on_connect
    mqtt_client.on_disconnect = on_disconnect
    mqtt_client.on_message = on_message
    mqtt_client.connect_async(MQTT_HOST, MQTT_PORT, keepalive=60)
    mqtt_client.loop_start()

    server = ThreadingHTTPServer(
        ("0.0.0.0", API_PORT),
        make_handler(store, mqtt_client),
    )
    logger.info("API disponível na porta %s; ouvindo o tópico %s.", API_PORT, MQTT_TOPIC)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        logger.info("Encerrando API.")
    finally:
        server.server_close()
        mqtt_client.disconnect()
        mqtt_client.loop_stop()
        store.close()


if __name__ == "__main__":
    main()
