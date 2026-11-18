import json
import math
import os
import sqlite3
import threading
import time


FIELD_NAMES = {
    "temp_grao": "tempGrao",
    "temp_ar": "tempAr",
    "umid_ar": "umidAr",
    "diferenca": "diferenca",
}


def _reject_json_constant(value):
    raise ValueError(f"Valor JSON inválido: {value}")


def parse_payload(payload):
    try:
        message = json.loads(payload.decode("utf-8"), parse_constant=_reject_json_constant)
    except (UnicodeDecodeError, json.JSONDecodeError) as error:
        raise ValueError("A mensagem MQTT precisa ser um JSON válido.") from error

    if not isinstance(message, dict):
        raise ValueError("A mensagem MQTT precisa ser um objeto JSON.")

    values = {}
    for source_name, target_name in FIELD_NAMES.items():
        value = message.get(source_name)
        values[target_name] = (
            float(value)
            if isinstance(value, (int, float))
            and not isinstance(value, bool)
            and math.isfinite(value)
            else None
        )

    if all(value is None for value in values.values()):
        return None

    if (
        values["diferenca"] is None
        and values["tempGrao"] is not None
        and values["tempAr"] is not None
    ):
        values["diferenca"] = values["tempGrao"] - values["tempAr"]

    return values


class TelemetryStore:
    def __init__(self, path):
        directory = os.path.dirname(path)
        if directory:
            os.makedirs(directory, exist_ok=True)

        self.connection = sqlite3.connect(path, timeout=5, check_same_thread=False)
        self.connection.row_factory = sqlite3.Row
        self.lock = threading.RLock()

        with self.lock:
            self.connection.execute("PRAGMA journal_mode = WAL")
            self.connection.execute("PRAGMA synchronous = NORMAL")
            self.connection.executescript(
                """
                CREATE TABLE IF NOT EXISTS readings (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    received_at INTEGER NOT NULL,
                    topic TEXT NOT NULL,
                    temp_grao REAL,
                    temp_ar REAL,
                    umid_ar REAL,
                    diferenca REAL,
                    payload TEXT NOT NULL
                );
                CREATE INDEX IF NOT EXISTS idx_readings_received_at
                    ON readings(received_at);
                """
            )
            self.connection.commit()

    def insert(self, topic, values, raw_payload, received_at=None):
        timestamp = received_at if received_at is not None else int(time.time() * 1000)
        with self.lock:
            cursor = self.connection.execute(
                """
                INSERT INTO readings (
                    received_at, topic, temp_grao, temp_ar, umid_ar, diferenca, payload
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    timestamp,
                    topic,
                    values["tempGrao"],
                    values["tempAr"],
                    values["umidAr"],
                    values["diferenca"],
                    raw_payload,
                ),
            )
            self.connection.commit()
            return cursor.lastrowid

    @staticmethod
    def _serialize(row):
        if row is None:
            return None

        return {
            "id": row["id"],
            "receivedAt": row["received_at"],
            "topic": row["topic"],
            "tempGrao": row["temp_grao"],
            "tempAr": row["temp_ar"],
            "umidAr": row["umid_ar"],
            "diferenca": row["diferenca"],
            "samples": row["samples"] if "samples" in row.keys() else 1,
        }

    def latest(self):
        with self.lock:
            row = self.connection.execute(
                "SELECT * FROM readings ORDER BY id DESC LIMIT 1"
            ).fetchone()
        return self._serialize(row)

    def recent(self, limit):
        with self.lock:
            rows = self.connection.execute(
                "SELECT * FROM readings ORDER BY id DESC LIMIT ?",
                (limit,),
            ).fetchall()
        return [self._serialize(row) for row in rows]

    def chart(self, hours, points):
        now = int(time.time() * 1000)
        since = now - hours * 60 * 60 * 1000
        bucket_size = max(1000, hours * 60 * 60 * 1000 // points)
        with self.lock:
            rows = self.connection.execute(
                """
                SELECT
                    MIN(id) AS id,
                    MAX(received_at) AS received_at,
                    MAX(topic) AS topic,
                    AVG(temp_grao) AS temp_grao,
                    AVG(temp_ar) AS temp_ar,
                    AVG(umid_ar) AS umid_ar,
                    AVG(diferenca) AS diferenca,
                    COUNT(*) AS samples
                FROM readings
                WHERE received_at >= ?
                GROUP BY CAST(received_at / ? AS INTEGER)
                ORDER BY received_at ASC
                """,
                (since, bucket_size),
            ).fetchall()
        return [self._serialize(row) for row in rows]

    def check(self):
        with self.lock:
            self.connection.execute("SELECT 1").fetchone()

    def close(self):
        with self.lock:
            self.connection.close()
