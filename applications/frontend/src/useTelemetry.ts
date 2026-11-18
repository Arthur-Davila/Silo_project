import { useEffect, useState } from "react";
import { telemetryApi, type ApiHealth, type Reading } from "./api";

export function useTelemetry(period: number) {
  const [health, setHealth] = useState<ApiHealth | null>(null);
  const [latest, setLatest] = useState<Reading | null>(null);
  const [recent, setRecent] = useState<Reading[]>([]);
  const [chartReadings, setChartReadings] = useState<Reading[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const refresh = async () => {
      try {
        const [nextHealth, nextLatest, nextRecent] = await Promise.all([
          telemetryApi.health(),
          telemetryApi.latest(),
          telemetryApi.recent(),
        ]);
        if (active) {
          setHealth(nextHealth);
          setLatest(nextLatest);
          setRecent(nextRecent);
          setError(null);
        }
      } catch (requestError) {
        console.error("Não foi possível atualizar o estado do silo.", requestError);
        if (active) {
          setError("Não foi possível acessar a API. Verifique os serviços Docker.");
        }
      }
    };

    void refresh();
    const timer = window.setInterval(() => void refresh(), 5000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    let active = true;

    const refreshChart = async () => {
      try {
        const readings = await telemetryApi.chart(period);
        if (active) {
          setChartReadings(readings);
          setError(null);
        }
      } catch (requestError) {
        console.error("Não foi possível atualizar o histórico do silo.", requestError);
        if (active) {
          setError("Não foi possível carregar o histórico. Verifique a API.");
        }
      }
    };

    void refreshChart();
    const timer = window.setInterval(() => void refreshChart(), 15000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [period]);

  return { health, latest, recent, chartReadings, error };
}
