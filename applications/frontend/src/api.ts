export type Reading = {
  id: number;
  receivedAt: number;
  topic: string;
  tempGrao: number | null;
  tempAr: number | null;
  umidAr: number | null;
  diferenca: number | null;
  samples: number;
};

export type ApiHealth = {
  apiConnected: boolean;
  mqttConnected: boolean;
  lastMessageAt: number | null;
};

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`API respondeu com HTTP ${response.status}.`);
  }
  return response.json() as Promise<T>;
}

export const telemetryApi = {
  health: () => getJson<ApiHealth>("/api/health"),
  latest: () => getJson<Reading | null>("/api/readings/latest"),
  recent: () => getJson<Reading[]>("/api/readings/recent?limit=12"),
  chart: (hours: number) =>
    getJson<Reading[]>(`/api/readings?hours=${hours}&points=300`),
};
