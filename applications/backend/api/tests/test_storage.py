import tempfile
import time
import unittest
from pathlib import Path

from storage import TelemetryStore, parse_payload


class ParsePayloadTests(unittest.TestCase):
    def test_parses_full_sensor_message_and_calculates_delta(self):
        values = parse_payload(
            b'{"temp_grao":27.5,"temp_ar":24.0,"umid_ar":61}'
        )

        self.assertEqual(values["tempGrao"], 27.5)
        self.assertEqual(values["tempAr"], 24.0)
        self.assertEqual(values["umidAr"], 61.0)
        self.assertEqual(values["diferenca"], 3.5)

    def test_keeps_valid_partial_sensor_messages(self):
        values = parse_payload(b'{"temp_grao":25.0}')

        self.assertEqual(values["tempGrao"], 25.0)
        self.assertIsNone(values["tempAr"])

    def test_ignores_messages_without_numeric_sensor_values(self):
        self.assertIsNone(parse_payload(b'{"temp_grao":"indisponivel"}'))

    def test_rejects_malformed_json(self):
        with self.assertRaises(ValueError):
            parse_payload(b'{"temp_grao":')


class TelemetryStoreTests(unittest.TestCase):
    def test_reading_is_persisted_after_reopening_database(self):
        with tempfile.TemporaryDirectory() as directory:
            path = str(Path(directory) / "telemetry.sqlite")
            values = parse_payload(b'{"temp_grao":28.0,"temp_ar":25.0}')
            store = TelemetryStore(path)
            store.insert("silo/dados", values, '{"temp_grao":28,"temp_ar":25}', 1234)
            store.close()

            reopened = TelemetryStore(path)
            latest = reopened.latest()
            reopened.close()

        self.assertEqual(latest["receivedAt"], 1234)
        self.assertEqual(latest["tempGrao"], 28.0)
        self.assertEqual(latest["diferenca"], 3.0)

    def test_chart_groups_readings_into_averaged_buckets(self):
        with tempfile.TemporaryDirectory() as directory:
            store = TelemetryStore(str(Path(directory) / "telemetry.sqlite"))
            now = int(time.time() * 1000)
            store.insert(
                "silo/dados",
                parse_payload(b'{"temp_grao":20,"temp_ar":18}'),
                '{"temp_grao":20,"temp_ar":18}',
                now - 10000,
            )
            store.insert(
                "silo/dados",
                parse_payload(b'{"temp_grao":30,"temp_ar":28}'),
                '{"temp_grao":30,"temp_ar":28}',
                now - 5000,
            )

            points = store.chart(hours=1, points=1)
            store.close()

        self.assertEqual(len(points), 1)
        self.assertEqual(points[0]["samples"], 2)
        self.assertEqual(points[0]["tempGrao"], 25)
        self.assertEqual(points[0]["tempAr"], 23)
