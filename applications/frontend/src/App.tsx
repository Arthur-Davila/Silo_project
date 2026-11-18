import { useEffect, useState, type ReactNode } from "react";
import { useTelemetry } from "./useTelemetry";

type IconName =
  | "grid"
  | "pulse"
  | "brain"
  | "history"
  | "settings"
  | "thermometer"
  | "droplet"
  | "delta"
  | "wifi"
  | "radio"
  | "clock"
  | "alert"
  | "menu"
  | "chevron";

function Icon({
  name,
  size = 18,
  className = "",
}: {
  name: IconName;
  size?: number;
  className?: string;
}) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
    "aria-hidden": true,
  };
  const paths: Record<IconName, ReactNode> = {
    grid: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </>
    ),
    pulse: (
      <>
        <path d="M3 12h4l2.2-5 4.2 10 2.2-5H21" />
        <path d="M20 5.5A10 10 0 1 0 21.5 15" opacity=".35" />
      </>
    ),
    brain: (
      <>
        <path d="M9.5 4.2A3 3 0 0 0 5 6.8a3.2 3.2 0 0 0-1 5.8A3.6 3.6 0 0 0 7.5 18H9a3 3 0 0 0 3-3V7a3 3 0 0 0-2.5-2.8Z" />
        <path d="M14.5 4.2A3 3 0 0 1 19 6.8a3.2 3.2 0 0 1 1 5.8 3.6 3.6 0 0 1-3.5 5.4H15a3 3 0 0 1-3-3V7a3 3 0 0 1 2.5-2.8Z" />
        <path d="M8 8.5c1.5 0 2.5 1 2.5 2.3M16 8.5c-1.5 0-2.5 1-2.5 2.3" />
      </>
    ),
    history: (
      <>
        <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
        <path d="M3 3v5h5M12 7v5l3 2" />
      </>
    ),
    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6 1.7 1.7 0 0 0 10 3V2.8h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" />
      </>
    ),
    thermometer: (
      <>
        <path d="M14 14.8V5a4 4 0 0 0-8 0v9.8a6 6 0 1 0 8 0Z" />
        <path d="M10 8v9M8 11h2" />
      </>
    ),
    droplet: <path d="M12 2S5.5 9.2 5.5 14.5a6.5 6.5 0 0 0 13 0C18.5 9.2 12 2 12 2Z" />,
    delta: (
      <>
        <path d="m12 4 8 15H4l8-15Z" />
        <path d="M9 14h6" />
      </>
    ),
    wifi: (
      <>
        <path d="M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0" />
        <circle cx="12" cy="19.5" r=".7" fill="currentColor" stroke="none" />
      </>
    ),
    radio: (
      <>
        <path d="M4.9 5a10 10 0 0 0 0 14M19.1 5a10 10 0 0 1 0 14M8 8.5a5 5 0 0 0 0 7M16 8.5a5 5 0 0 1 0 7" />
        <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    alert: (
      <>
        <path d="M10.3 3.7 2.4 18a2 2 0 0 0 1.8 3h15.6a2 2 0 0 0 1.8-3L13.7 3.7a2 2 0 0 0-3.4 0Z" />
        <path d="M12 9v4M12 17h.01" />
      </>
    ),
    menu: (
      <>
        <path d="M4 7h16M4 12h16M4 17h16" />
      </>
    ),
    chevron: <path d="m9 18 6-6-6-6" />,
  };
  return <svg {...common}>{paths[name]}</svg>;
}

const periods = [1, 6, 12, 24];

function formatNumber(value: number | null, digits = 1, signed = false) {
  if (value === null || !Number.isFinite(value)) return "—";
  const prefix = signed && value > 0 ? "+" : "";
  return `${prefix}${value.toLocaleString("pt-BR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}`;
}

function formatTimeAgo(timestamp: number | null, now: number) {
  if (timestamp === null) return "Sem leituras";
  const seconds = Math.max(0, Math.floor((now - timestamp) / 1000));
  if (seconds < 5) return "agora";
  if (seconds < 60) return `há ${seconds} s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `há ${minutes} min`;
  return `há ${Math.floor(minutes / 60)} h`;
}

function formatTimestamp(timestamp: number) {
  return new Date(timestamp).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="logo">
      <svg viewBox="0 0 38 38" className="logo-mark" aria-hidden="true">
        <path
          d="M9 12.5 19 6l10 6.5v14L19 32 9 26.5v-14Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
        />
        <path
          d="M9 12.5 19 18l10-5.5M19 18v14"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
        />
        <circle cx="19" cy="13" r="2.1" fill="#38bdf8" />
      </svg>
      {!compact && (
        <div>
          <strong>SILO SENSE</strong>
          <span>MONITORAMENTO INTELIGENTE</span>
        </div>
      )}
    </div>
  );
}

const navItems: { label: string; icon: IconName }[] = [
  { label: "Visão geral", icon: "grid" },
  { label: "Monitoramento", icon: "pulse" },
  { label: "Análise de IA", icon: "brain" },
  { label: "Histórico", icon: "history" },
  { label: "Configurações", icon: "settings" },
];

function Sidebar({
  open,
  close,
  online,
}: {
  open: boolean;
  close: () => void;
  online: boolean;
}) {
  return (
    <>
      {open && <button className="sidebar-backdrop" onClick={close} aria-label="Fechar menu" />}
      <aside className={`sidebar ${open ? "open" : ""}`}>
        <Logo />
        <div className="side-label">PLATAFORMA</div>
        <nav>
          {navItems.map((item, index) => (
            <button key={item.label} className={index === 0 ? "active" : ""} onClick={close}>
              <Icon name={item.icon} />
              <span>{item.label}</span>
              {index === 0 && <i />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="device-mini">
            <span className="device-icon">
              <Icon name="radio" size={17} />
            </span>
            <div>
              <strong>ESP32-SILO-01</strong>
              <small>{online ? "Dados ao vivo" : "Aguardando dados"}</small>
            </div>
            <span className={`status-dot ${online ? "" : "offline"}`} />
          </div>
          <div className="academic">
            <span>PROJETO ACADÊMICO</span>
            <strong>CESAR School</strong>
            <small>Telemetria MQTT</small>
          </div>
        </div>
      </aside>
    </>
  );
}

function StatusChip({
  icon,
  title,
  value,
  online,
}: {
  icon: IconName;
  title: string;
  value: string;
  online: boolean;
}) {
  return (
    <div className="status-chip">
      <span className="status-icon">
        <Icon name={icon} size={15} />
      </span>
      <div>
        <small>{title}</small>
        <strong>
          <i className={online ? "" : "offline"} />
          {value}
        </strong>
      </div>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  sensor,
  value,
  unit,
  trend,
  tone,
  live,
}: {
  icon: IconName;
  label: string;
  sensor: string;
  value: string;
  unit: string;
  trend: string;
  tone: "red" | "blue" | "cyan" | "yellow";
  live: boolean;
}) {
  return (
    <article className={`metric-card ${tone}`}>
      <div className="metric-top">
        <span className="metric-icon">
          <Icon name={icon} size={20} />
        </span>
        <span className="live-dot">{live ? "AGORA" : "SEM DADOS"}</span>
      </div>
      <p>{label}</p>
      <div className="metric-value">
        {value}
        <small>{unit}</small>
      </div>
      <div className="metric-footer">
        <span>{sensor}</span>
        <strong>{trend}</strong>
      </div>
    </article>
  );
}

function makePath(values: number[], min: number, max: number, width = 640, height = 190) {
  if (values.length === 0) return "";
  const divisor = Math.max(values.length - 1, 1);
  return values
    .map((value, index) => {
      const x = (values.length === 1 ? 1 : index / divisor) * width;
      const y = height - ((value - min) / (max - min)) * height;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

function Chart({
  title,
  subtitle,
  values,
  secondValues,
  color,
  secondColor,
  period,
  unit,
  min,
  max,
  labels,
}: {
  title: string;
  subtitle: string;
  values: number[];
  secondValues?: number[];
  color: string;
  secondColor?: string;
  period: number;
  unit: string;
  min: number;
  max: number;
  labels?: string[];
}) {
  const visible = values;
  const visibleSecond = secondValues;
  const hasSecondValues = Boolean(visibleSecond?.length);
  const ticks = [max, (max + min) / 2, min];
  return (
    <article className="chart-card">
      <div className="chart-head">
        <div>
          <h3>{title}</h3>
          <p>{subtitle}</p>
        </div>
        <div className="legend">
          <span>
            <i style={{ background: color }} />
            {labels?.[0] || "Leitura"}
          </span>
          {hasSecondValues && (
            <span>
              <i style={{ background: secondColor }} />
              {labels?.[1]}
            </span>
          )}
        </div>
      </div>
      <div className="chart-wrap">
        <div className="y-labels">
          {ticks.map((tick) => (
            <span key={tick}>
              {tick.toFixed(unit === "%" ? 0 : 1)}
              {unit}
            </span>
          ))}
        </div>
        <svg
          viewBox="0 0 640 190"
          preserveAspectRatio="none"
          role="img"
          aria-label={`Gráfico de ${title}`}
        >
          <defs>
            <linearGradient id={`area-${title.replace(/\s/g, "")}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={color} stopOpacity=".24" />
              <stop offset="1" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0, 95, 190].map((y) => (
            <line key={y} x1="0" x2="640" y1={y} y2={y} className="grid-line" />
          ))}
          {visible.length > 1 ? (
            <>
              <path
                d={`${makePath(visible, min, max)} L 640 190 L 0 190 Z`}
                fill={`url(#area-${title.replace(/\s/g, "")})`}
              />
              <path
                d={makePath(visible, min, max)}
                fill="none"
                stroke={color}
                strokeWidth="2.5"
                vectorEffect="non-scaling-stroke"
              />
            </>
          ) : visible.length === 0 ? (
            <text x="320" y="95" fill="#607287" textAnchor="middle" fontSize="12">
              Aguardando leituras
            </text>
          ) : null}
          {hasSecondValues && (
            <path
              d={makePath(visibleSecond!, min, max)}
              fill="none"
              stroke={secondColor}
              strokeWidth="2"
              strokeDasharray="5 4"
              vectorEffect="non-scaling-stroke"
            />
          )}
          {visible.length > 0 && (
            <circle
              cx="640"
              cy={190 - ((visible.at(-1)! - min) / (max - min)) * 190}
              r="4"
              fill={color}
              stroke="#151f30"
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
            />
          )}
        </svg>
        <div className="x-labels">
          <span>-{period}h</span>
          <span>-{Math.round(period / 2)}h</span>
          <span>agora</span>
        </div>
      </div>
    </article>
  );
}

function SiloDiagram() {
  return (
    <article className="silo-card">
      <div className="section-heading">
        <div>
          <span className="eyebrow">PROTÓTIPO EXPERIMENTAL</span>
          <h3>Visão do sistema</h3>
        </div>
        <span className="demo-badge">MODELO PET</span>
      </div>
      <svg
        className="silo-diagram"
        viewBox="0 0 520 330"
        role="img"
        aria-label="Diagrama do silo experimental com sensores DS18B20, DHT11 e ESP32"
      >
        <defs>
          <linearGradient id="bottle" x1="0" y1="0" x2="1" y2="0">
            <stop stopColor="#25334a" stopOpacity=".45" />
            <stop offset=".5" stopColor="#6b87aa" stopOpacity=".12" />
            <stop offset="1" stopColor="#25334a" stopOpacity=".4" />
          </linearGradient>
          <pattern id="grainPattern" width="13" height="9" patternUnits="userSpaceOnUse">
            <ellipse cx="4" cy="4" rx="3" ry="1.8" fill="#b48a3d" transform="rotate(-18 4 4)" />
            <ellipse cx="11" cy="8" rx="3" ry="1.7" fill="#d1a957" transform="rotate(14 11 8)" />
          </pattern>
        </defs>
        <path
          d="M190 30h82v35c0 11 7 18 20 27 16 11 24 27 24 48v132c0 14-11 25-25 25H171c-14 0-25-11-25-25V140c0-21 8-37 24-48 13-9 20-16 20-27V30Z"
          fill="url(#bottle)"
          stroke="#58708e"
          strokeWidth="2"
        />
        <path
          d="M153 169h156v103c0 10-8 18-18 18H171c-10 0-18-8-18-18V169Z"
          fill="url(#grainPattern)"
          opacity=".9"
        />
        <path d="M153 169c37-12 117-12 156 0" fill="none" stroke="#e2b95e" strokeWidth="2" />
        <path d="M190 30h82M187 44h88M183 57h96" stroke="#607b9b" strokeWidth="2" />
        <rect
          x="224"
          y="127"
          width="14"
          height="21"
          rx="2"
          fill="#38bdf8"
          opacity=".2"
          stroke="#38bdf8"
        />
        <path d="M228 133h6m-6 5h6" stroke="#38bdf8" />
        <path d="M238 137H360" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="4 4" />
        <circle cx="228" cy="221" r="6" fill="#ef4444" />
        <path
          d="M228 221v-55M234 221h126"
          stroke="#ef4444"
          strokeWidth="1.5"
          strokeDasharray="4 4"
        />
        <g transform="translate(371 105)">
          <rect width="110" height="80" rx="6" fill="#111b2a" stroke="#526783" />
          <rect x="21" y="17" width="50" height="38" rx="3" fill="#172b35" stroke="#22c55e" />
          <path
            d="M30 9v8m8-8v8m8-8v8m8-8v8m8-8v8M30 55v8m8-8v8m8-8v8m8-8v8m8-8v8"
            stroke="#698097"
          />
          <circle cx="87" cy="19" r="4" fill="#22c55e" />
          <path d="M79 34h16M79 42h16M79 50h10" stroke="#526783" />
          <text x="55" y="74" fill="#8fa3b9" fontSize="9" textAnchor="middle">
            CONTROLADOR
          </text>
        </g>
        <g className="diagram-label">
          <text x="365" y="126" fill="#ef4444">
            DS18B20
          </text>
          <text x="365" y="141">
            massa de grãos
          </text>
          <text x="365" y="217" fill="#38bdf8">
            DHT11
          </text>
          <text x="365" y="232">
            espaço de ar
          </text>
          <text x="426" y="198" fill="#22c55e" textAnchor="middle">
            ESP32
          </text>
        </g>
        <path d="M360 137l-7-4v8Z" fill="#38bdf8" />
        <path d="M360 221l-7-4v8Z" fill="#ef4444" />
        <text x="231" y="318" fill="#60748c" fontSize="10" textAnchor="middle">
          SILO EM GARRAFA PET • CORTE TÉCNICO
        </text>
      </svg>
      <div className="diagram-key">
        <span>
          <i className="red-key" />
          Temperatura dos grãos
        </span>
        <span>
          <i className="blue-key" />
          Temperatura e umidade do ar
        </span>
      </div>
    </article>
  );
}

export default function App() {
  const [period, setPeriod] = useState(24);
  const [menuOpen, setMenuOpen] = useState(false);
  const [now, setNow] = useState(new Date());
  const { health, latest, recent, chartReadings, error } = useTelemetry(period);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const currentDelta =
    latest?.diferenca ??
    (latest?.tempGrao !== null && latest?.tempGrao !== undefined &&
    latest?.tempAr !== null && latest?.tempAr !== undefined
      ? latest.tempGrao - latest.tempAr
      : null);
  const temperatureReadings = chartReadings.filter(
    (reading) => reading.tempGrao !== null && reading.tempAr !== null,
  );
  const grain = temperatureReadings.map((reading) => reading.tempGrao!);
  const air = temperatureReadings.map((reading) => reading.tempAr!);
  const humidity = chartReadings
    .filter((reading) => reading.umidAr !== null)
    .map((reading) => reading.umidAr!);
  const delta = chartReadings
    .map((reading) =>
      reading.diferenca ??
      (reading.tempGrao !== null && reading.tempAr !== null
        ? reading.tempGrao - reading.tempAr
        : null),
    )
    .filter((value): value is number => value !== null);
  const mqttConnected = health?.mqttConnected ?? false;
  const deviceConnected =
    mqttConnected && latest !== null && now.getTime() - latest.receivedAt < 15000;
  const readingAge = formatTimeAgo(latest?.receivedAt ?? null, now.getTime());

  return (
    <div className="app-shell">
      <Sidebar open={menuOpen} close={() => setMenuOpen(false)} online={deviceConnected} />
      <main>
        <header className="topbar">
          <button className="menu-button" onClick={() => setMenuOpen(true)} aria-label="Abrir menu">
            <Icon name="menu" />
          </button>
          <div className="page-title">
            <span className="eyebrow">SILO EXPERIMENTAL 01</span>
            <h1>Visão Geral do Silo</h1>
            <p>Monitoramento inteligente das condições de armazenamento</p>
          </div>
          <div className="header-status">
            <StatusChip
              icon="wifi"
              title="ESP32"
              value={deviceConnected ? "Conectado" : "Sem dados"}
              online={deviceConnected}
            />
            <StatusChip
              icon="radio"
              title="MQTT"
              value={mqttConnected ? "Ativo" : "Inativo"}
              online={mqttConnected}
            />
            <div className="update-time">
              <small>ÚLTIMA ATUALIZAÇÃO</small>
              <strong>{readingAge}</strong>
            </div>
            <div className="date-time">
              <Icon name="clock" size={16} />
              <div>
                <strong>
                  {now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </strong>
                <small>
                  {now
                    .toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })
                    .replace(".", "")}
                </small>
              </div>
            </div>
          </div>
        </header>

        <div className="content">
          <div className="demo-notice">
            <span>
              <Icon name={error || !mqttConnected ? "alert" : "radio"} size={15} />
            </span>
            <p>
              <strong>
                {error
                  ? "Backend indisponível"
                  : !health
                    ? "Conectando ao backend"
                    : !mqttConnected
                      ? "Aguardando conexão MQTT"
                      : latest
                        ? "Dados recebidos do ESP32"
                        : "Aguardando primeira leitura"}
              </strong>{" "}
              —{" "}
              {error ??
                (latest
                  ? "As leituras recebidas são armazenadas no banco local."
                  : "O painel será atualizado assim que chegar uma mensagem no tópico silo/dados.")}
            </p>
          </div>

          <section className="metrics-grid">
            <MetricCard
              icon="thermometer"
              label="Temperatura dos grãos"
              sensor="DS18B20 • Interno"
              value={formatNumber(latest?.tempGrao ?? null)}
              unit="°C"
              trend={readingAge}
              tone="red"
              live={latest !== null}
            />
            <MetricCard
              icon="thermometer"
              label="Temperatura do ar"
              sensor="DHT11 • Interno"
              value={formatNumber(latest?.tempAr ?? null)}
              unit="°C"
              trend={readingAge}
              tone="blue"
              live={latest !== null}
            />
            <MetricCard
              icon="droplet"
              label="Umidade do ar"
              sensor="DHT11 • Interno"
              value={formatNumber(latest?.umidAr ?? null, 0)}
              unit="%"
              trend={readingAge}
              tone="cyan"
              live={latest !== null}
            />
            <MetricCard
              icon="delta"
              label="Diferença térmica"
              sensor="Grãos − Ar"
              value={formatNumber(currentDelta, 1, true)}
              unit="°C"
              trend={readingAge}
              tone="yellow"
              live={latest !== null}
            />
          </section>

          <section className="monitor-section">
            <div className="section-heading">
              <div>
                <span className="eyebrow">TELEMETRIA</span>
                <h2>Comportamento térmico</h2>
                <p>Leituras temporais consolidadas dos sensores</p>
              </div>
              <div className="period-tabs" aria-label="Selecionar período">
                {periods.map((p) => (
                  <button
                    key={p}
                    className={period === p ? "active" : ""}
                    onClick={() => setPeriod(p)}
                  >
                    {p}h
                  </button>
                ))}
              </div>
            </div>
            <div className="charts-grid">
              <Chart
                title="Temperaturas"
                subtitle="Comparativo entre massa de grãos e ar"
                values={grain}
                secondValues={air}
                color="#ef4444"
                secondColor="#38bdf8"
                period={period}
                unit="°"
                min={22}
                max={32}
                labels={["Grãos", "Ar"]}
              />
              <Chart
                title="Umidade relativa"
                subtitle="Medição do DHT11 no interior"
                values={humidity}
                color="#22d3ee"
                period={period}
                unit="%"
                min={50}
                max={70}
                labels={["Umidade"]}
              />
              <Chart
                title="Diferença térmica"
                subtitle="Temperatura dos grãos menos temperatura do ar"
                values={delta}
                color="#facc15"
                period={period}
                unit="°"
                min={-3}
                max={6}
                labels={["Δ térmico"]}
              />
            </div>
          </section>

          <section className="analysis-grid">
            <article className="ai-panel">
              <div className="ai-header">
                <div className="ai-title">
                  <span>
                    <Icon name="history" size={23} />
                  </span>
                  <div>
                    <span className="eyebrow">BANCO DE DADOS</span>
                    <h2>Armazenamento de telemetria</h2>
                  </div>
                </div>
                <span className="monitoring">
                  <i />
                  {mqttConnected ? "Recebendo MQTT" : "Aguardando MQTT"}
                </span>
              </div>
              <div className="ai-content">
                <div className="anomaly-score">
                  <div className="score-ring">
                    <svg viewBox="0 0 120 120">
                      <circle cx="60" cy="60" r="48" />
                      <circle
                        className="score-progress"
                        cx="60"
                        cy="60"
                        r="48"
                        style={{
                          stroke: "#38bdf8",
                          strokeDashoffset: 302 - (recent.length / 12) * 302,
                        }}
                      />
                    </svg>
                    <div>
                      <strong>{recent.length}</strong>
                      <small>/ 12</small>
                    </div>
                  </div>
                  <span>LEITURAS RECENTES</span>
                  <span className="demo-badge">SQLite persistente</span>
                </div>
                <div className="anomaly-detail">
                  <div className="model-row">
                    <div>
                      <small>BANCO DE DADOS</small>
                      <strong>SQLite em volume Docker</strong>
                    </div>
                    <div>
                      <small>TÓPICO MQTT</small>
                      <strong>silo/dados</strong>
                    </div>
                    <div>
                      <small>ÚLTIMA LEITURA</small>
                      <strong>{readingAge}</strong>
                    </div>
                  </div>
                  <div className="alert-copy">
                    <Icon name="history" size={20} />
                    <div>
                      <strong>Gravação automática das mensagens recebidas</strong>
                      <p>
                        Cada leitura válida do ESP32 é armazenada junto com o horário, o tópico e o
                        payload original. O volume mantém os dados após reiniciar os containers.
                      </p>
                    </div>
                  </div>
                  <p className="disclaimer">
                    Para preservar o histórico, use <strong>docker compose down</strong> sem a
                    opção <strong>-v</strong>.
                  </p>
                </div>
              </div>
            </article>
            <SiloDiagram />
          </section>

          <section className="history-section">
            <div className="section-heading">
              <div>
                <span className="eyebrow">REGISTRO DE EVENTOS</span>
                <h2>Histórico de leituras</h2>
                <p>Últimas mensagens recebidas e salvas no banco</p>
              </div>
              <span className="demo-badge">ATÉ 12 REGISTROS</span>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Data e horário</th>
                    <th>Origem</th>
                    <th>Temp. dos grãos</th>
                    <th>Temp. do ar</th>
                    <th>Diferença</th>
                    <th>Registro</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.length > 0 ? recent.map((reading) => (
                    <tr key={reading.id}>
                      <td>{formatTimestamp(reading.receivedAt)}</td>
                      <td>
                        <span className="event-indicator event-3" />
                        {reading.topic}
                      </td>
                      <td>{formatNumber(reading.tempGrao)} °C</td>
                      <td>{formatNumber(reading.tempAr)} °C</td>
                      <td>{formatNumber(reading.diferenca, 1, true)} °C</td>
                      <td>
                        <span className="classification class-normal">Salvo</span>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={6}>Aguardando leituras para preencher o histórico.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
          <footer>
            <span>SILO SENSE • Projeto acadêmico CESAR School</span>
            <span>Telemetria MQTT • Banco SQLite persistente</span>
          </footer>
        </div>
      </main>
    </div>
  );
}
