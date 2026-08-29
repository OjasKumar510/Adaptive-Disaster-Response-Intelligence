import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  LayoutGrid, HeartPulse, Truck, MapPinned, Building2, Route as RouteIcon,
  Radio, ChevronLeft, Clock, Navigation2, AlertTriangle, Wifi, WifiOff,
  X, ChevronRight, Zap, Activity, ShieldAlert, CircleDot, Signal,
  ArrowRight, RefreshCw, Users, BedDouble, MapPin
} from "lucide-react";


const palette = {
  base: "#0A0D12",
  panel: "#12161D",
  raised: "#171C25",
  raised2: "#1C222C",
  border: "#242B37",
  borderSoft: "#1B212B",
  text: "#E7EAF0",
  textMute: "#8B93A7",
  textDim: "#535B6E",
  critical: "#FF4B5C",
  criticalDim: "#3A1E24",
  warning: "#FFB020",
  warningDim: "#3A2E14",
  stable: "#2ED9A2",
  stableDim: "#12332B",
  accent: "#3DA9FC",
  accentDim: "#122A3E",
};

function useFonts() {
  useEffect(() => {
    const id = "atlas-fonts";
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Condensed:wght@500;600;700&family=IBM+Plex+Mono:wght@400;500;600&family=Inter:wght@400;500;600&display=swap";
    document.head.appendChild(link);
  }, []);
}

const F = {
  display: '"IBM Plex Sans Condensed", sans-serif',
  body: '"Inter", sans-serif',
  mono: '"IBM Plex Mono", monospace',
};

/* ---------------------------- data ---------------------------- */

const initialVictims = [
  { id: "V01", priority: 92, hr: 132, spo2: 84, injury: "HIGH", waitBase: 18, triage: "CRITICAL", team: "R4", etaBase: 4, zone: "B" },
  { id: "V07", priority: 78, hr: 110, spo2: 90, injury: "MODERATE", waitBase: 25, triage: "URGENT", team: "R2", etaBase: 9, zone: "A" },
  { id: "V12", priority: 55, hr: 95, spo2: 95, injury: "LOW", waitBase: 40, triage: "STABLE", team: null, etaBase: null, zone: "C" },
  { id: "V18", priority: 88, hr: 128, spo2: 86, injury: "HIGH", waitBase: 12, triage: "CRITICAL", team: "R1", etaBase: 6, zone: "B" },
  { id: "V22", priority: 41, hr: 88, spo2: 97, injury: "LOW", waitBase: 52, triage: "STABLE", team: null, etaBase: null, zone: "D" },
  { id: "V27", priority: 70, hr: 105, spo2: 91, injury: "MODERATE", waitBase: 30, triage: "URGENT", team: "R3", etaBase: 7, zone: "A" },
  { id: "V31", priority: 65, hr: 100, spo2: 92, injury: "MODERATE", waitBase: 22, triage: "URGENT", team: "R4", etaBase: 11, zone: "B" },
  { id: "V35", priority: 95, hr: 140, spo2: 80, injury: "CRITICAL", waitBase: 8, triage: "CRITICAL", team: "R2", etaBase: 3, zone: "C" },
];

const teamsData = {
  R1: { id: "R1", status: "ACTIVE", zone: "A", capacity: [2, 4], route: ["BASE", "V18", "HOSPITAL H1"], etaBase: 6 },
  R2: { id: "R2", status: "ACTIVE", zone: "C", capacity: [4, 4], route: ["BASE", "V35", "HOSPITAL H3"], etaBase: 3 },
  R3: { id: "R3", status: "ACTIVE", zone: "A", capacity: [1, 4], route: ["BASE", "V27", "HOSPITAL H1"], etaBase: 7 },
  R4: { id: "R4", status: "ACTIVE", zone: "B", capacity: [3, 4], route: ["BASE", "V01", "V31", "HOSPITAL H2"], etaBase: 11 },
};

const hospitals = [
  { id: "H1", zone: "A", used: 18, cap: 30 },
  { id: "H2", zone: "B", used: 24, cap: 25 },
  { id: "H3", zone: "C", used: 10, cap: 40 },
];

const zones = [
  { id: "A", teams: 2, victims: 2, status: "stable" },
  { id: "B", teams: 1, victims: 2, status: "critical" },
  { id: "C", teams: 1, victims: 2, status: "warning" },
  { id: "D", teams: 0, victims: 1, status: "stable" },
];

const initialEvents = [
  { t: "08:12", label: "Team R2 dispatched to V35", tone: "info" },
  { t: "08:24", label: "Victim V01 triage escalated to CRITICAL", tone: "critical" },
  { t: "08:31", label: "Team R4 en route — Base → V01 → V31 → H2", tone: "info" },
  { t: "08:42", label: "Hospital H2 capacity at 96%", tone: "warning" },
];

function severity(p) {
  if (p >= 85) return "critical";
  if (p >= 60) return "warning";
  return "stable";
}
const sevColor = (s) => (s === "critical" ? palette.critical : s === "warning" ? palette.warning : palette.stable);
const sevDim = (s) => (s === "critical" ? palette.criticalDim : s === "warning" ? palette.warningDim : palette.stableDim);

/* ------------------------- ECG waveform ------------------------ */

const ECG_PATH =
  "M0,20 L26,20 L32,20 L36,6 L40,34 L44,14 L48,20 L54,20 L200,20 " +
  "L226,20 L232,20 L236,6 L240,34 L244,14 L248,20 L254,20 L400,20";

function Vitals({ hr, color, height = 34, id }) {
  const duration = Math.max(0.7, Math.min(2.6, 3400 / hr / 10));
  const gradId = `vg-${id}`;
  return (
    <div style={{ width: "100%", height, overflow: "hidden", position: "relative" }} aria-hidden="true">
      <svg
        width="800"
        height={height}
        viewBox={`0 0 800 40`}
        preserveAspectRatio="none"
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          animation: `atlas-scroll ${duration}s linear infinite`,
        }}
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={color} stopOpacity="0" />
            <stop offset="12%" stopColor={color} stopOpacity="1" />
            <stop offset="88%" stopColor={color} stopOpacity="1" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={ECG_PATH} fill="none" stroke={`url(#${gradId})`} strokeWidth="1.6" />
        <path d={ECG_PATH} fill="none" stroke={`url(#${gradId})`} strokeWidth="1.6" transform="translate(400,0)" />
      </svg>
    </div>
  );
}


function Panel({ children, style, ...rest }) {
  return (
    <div
      {...rest}
      style={{
        background: palette.panel,
        border: `1px solid ${palette.border}`,
        borderRadius: 10,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function Eyebrow({ children, style }) {
  return (
    <div
      style={{
        fontFamily: F.display,
        fontWeight: 700,
        fontSize: 11,
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        color: palette.textMute,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function Badge({ tone = "stable", children }) {
  const color = sevColor(tone);
  const dim = sevDim(tone);
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "3px 10px",
        borderRadius: 999,
        background: dim,
        color,
        fontFamily: F.display,
        fontWeight: 700,
        fontSize: 11,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        border: `1px solid ${color}33`,
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: color,
          boxShadow: tone === "critical" ? `0 0 0 3px ${color}22` : "none",
          animation: tone === "critical" ? "atlas-pulse 1.1s ease-in-out infinite" : "none",
        }}
      />
      {children}
    </span>
  );
}

function StatTile({ label, value, unit, tone }) {
  const color = tone ? sevColor(tone) : palette.text;
  return (
    <Panel style={{ padding: "14px 16px", flex: 1, minWidth: 0 }}>
      <Eyebrow>{label}</Eyebrow>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 6 }}>
        <span style={{ fontFamily: F.mono, fontSize: 26, fontWeight: 600, color }}>{value}</span>
        {unit && <span style={{ fontFamily: F.mono, fontSize: 12, color: palette.textMute }}>{unit}</span>}
      </div>
    </Panel>
  );
}

function RadialGauge({ pct, size = 64, tone }) {
  const color = sevColor(tone);
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - pct / 100);
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} stroke={palette.borderSoft} strokeWidth="6" fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth="6"
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: F.mono,
          fontWeight: 600,
          fontSize: size * 0.24,
          color: palette.text,
        }}
      >
        {pct}
      </div>
    </div>
  );
}

/* --------------------------- nav rail --------------------------- */

const NAV = [
  { id: "overview", label: "Overview", icon: LayoutGrid },
  { id: "victims", label: "Victims", icon: HeartPulse },
  { id: "teams", label: "Rescue teams", icon: Truck },
  { id: "zones", label: "Zones", icon: MapPinned },
  { id: "hospitals", label: "Hospitals", icon: Building2 },
  { id: "routes", label: "Routes", icon: RouteIcon },
  { id: "events", label: "Events", icon: Zap },
  { id: "network", label: "Network", icon: Radio },
];

function NavRail({ active, onSelect }) {
  return (
    <div
      style={{
        width: 208,
        flexShrink: 0,
        borderRight: `1px solid ${palette.border}`,
        background: palette.panel,
        display: "flex",
        flexDirection: "column",
        padding: "16px 10px",
      }}
    >
      {NAV.map((n) => {
        const isActive = active === n.id;
        const Icon = n.icon;
        return (
          <button
            key={n.id}
            onClick={() => onSelect(n.id)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "9px 12px",
              marginBottom: 2,
              borderRadius: 7,
              border: "none",
              background: isActive ? palette.raised2 : "transparent",
              color: isActive ? palette.text : palette.textMute,
              cursor: "pointer",
              textAlign: "left",
              borderLeft: `2px solid ${isActive ? palette.accent : "transparent"}`,
              transition: "background 0.15s, color 0.15s",
            }}
          >
            <Icon size={16} strokeWidth={2} style={{ flexShrink: 0 }} />
            <span style={{ fontFamily: F.body, fontSize: 13.5, fontWeight: isActive ? 600 : 500 }}>
              {n.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* --------------------------- top bar --------------------------- */

function TopBar({ clock }) {
  return (
    <div
      style={{
        height: 56,
        flexShrink: 0,
        borderBottom: `1px solid ${palette.border}`,
        background: palette.panel,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 20px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div
          style={{
            width: 9,
            height: 9,
            borderRadius: "50%",
            background: palette.stable,
            boxShadow: `0 0 0 3px ${palette.stableDim}`,
            animation: "atlas-pulse 2s ease-in-out infinite",
          }}
        />
        <span
          style={{
            fontFamily: F.display,
            fontWeight: 700,
            fontSize: 18,
            letterSpacing: "0.06em",
            color: palette.text,
          }}
        >
          ATLAS
        </span>
        <span
          style={{
            fontFamily: F.body,
            fontSize: 12.5,
            color: palette.textDim,
            paddingLeft: 12,
            borderLeft: `1px solid ${palette.border}`,
          }}
        >
          Operation Meridian &nbsp;·&nbsp; Zones A–D
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, color: palette.stable }}>
          <Wifi size={14} />
          <span style={{ fontFamily: F.mono, fontSize: 12 }}>LIVE</span>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            fontFamily: F.mono,
            fontSize: 13,
            color: palette.text,
          }}
        >
          <Clock size={14} color={palette.textMute} />
          {clock}
        </div>
      </div>
    </div>
  );
}

/* --------------------------- overview --------------------------- */

function Overview({ victims, onOpenVictim, elapsed }) {
  const critical = victims.filter((v) => severity(v.priority) === "critical").length;
  const avgEta =
    Math.round(
      (victims.filter((v) => v.etaBase != null).reduce((a, v) => a + Math.max(0, v.etaBase - elapsed), 0) /
        victims.filter((v) => v.etaBase != null).length) *
        10
    ) / 10;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", gap: 12 }}>
        <StatTile label="Active victims" value={victims.length} />
        <StatTile label="Critical" value={critical} tone="critical" />
        <StatTile label="Teams deployed" value={Object.keys(teamsData).length} />
        <StatTile label="Avg. ETA" value={avgEta} unit="min" />
      </div>

      <Panel style={{ padding: 0 }}>
        <div style={{ padding: "14px 18px", borderBottom: `1px solid ${palette.borderSoft}` }}>
          <Eyebrow>Triage priority — live feed</Eyebrow>
        </div>
        <div>
          {[...victims]
            .sort((a, b) => b.priority - a.priority)
            .map((v) => {
              const sev = severity(v.priority);
              return (
                <button
                  key={v.id}
                  onClick={() => onOpenVictim(v.id)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                    padding: "12px 18px",
                    background: "transparent",
                    border: "none",
                    borderBottom: `1px solid ${palette.borderSoft}`,
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <span style={{ fontFamily: F.mono, fontSize: 13, color: palette.textMute, width: 34 }}>{v.id}</span>
                  <Badge tone={sev}>{v.triage}</Badge>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Vitals hr={v.hr} color={sevColor(sev)} height={22} id={v.id} />
                  </div>
                  <span style={{ fontFamily: F.mono, fontSize: 13, color: palette.textMute, width: 46, textAlign: "right" }}>
                    {v.priority}%
                  </span>
                  <span style={{ fontFamily: F.mono, fontSize: 12, color: palette.textDim, width: 30 }}>
                    {v.team || "—"}
                  </span>
                  <ChevronRight size={15} color={palette.textDim} />
                </button>
              );
            })}
        </div>
      </Panel>
    </div>
  );
}

/* --------------------------- victims list ------------------------ */

function VictimsList({ victims, onOpenVictim, elapsed }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
      {victims.map((v) => {
        const sev = severity(v.priority);
        const wait = v.waitBase + Math.floor(elapsed);
        return (
          <Panel key={v.id} style={{ padding: 16, cursor: "pointer" }} onClick={() => onOpenVictim(v.id)}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 16, color: palette.text }}>
                  Victim {v.id}
                </div>
                <div style={{ fontFamily: F.body, fontSize: 12, color: palette.textMute, marginTop: 2 }}>
                  Zone {v.zone} · Waiting {wait} min
                </div>
              </div>
              <Badge tone={sev}>{v.triage}</Badge>
            </div>
            <div style={{ margin: "12px 0" }}>
              <Vitals hr={v.hr} color={sevColor(sev)} id={v.id + "-list"} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontFamily: F.mono, fontSize: 12, color: palette.textMute }}>
              <span>HR {v.hr} bpm</span>
              <span>SpO₂ {v.spo2}%</span>
              <span>{v.team ? `→ ${v.team}` : "Unassigned"}</span>
            </div>
          </Panel>
        );
      })}
    </div>
  );
}

/* --------------------------- victim detail ------------------------ */

function VictimDetail({ victim, onBack, elapsed }) {
  const sev = severity(victim.priority);
  const color = sevColor(sev);
  const wait = victim.waitBase + Math.floor(elapsed);
  const eta = victim.etaBase != null ? Math.max(0, victim.etaBase - Math.floor(elapsed)) : null;

  return (
    <div>
      <button
        onClick={onBack}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          background: "none",
          border: "none",
          color: palette.textMute,
          fontFamily: F.body,
          fontSize: 13,
          cursor: "pointer",
          marginBottom: 14,
          padding: 0,
        }}
      >
        <ChevronLeft size={15} /> Back
      </button>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <h2 style={{ fontFamily: F.display, fontWeight: 700, fontSize: 22, color: palette.text, margin: 0 }}>
            Victim {victim.id}
          </h2>
          <Badge tone={sev}>{victim.triage}</Badge>
        </div>
        <RadialGauge pct={victim.priority} tone={sev} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 12 }}>
        <Panel style={{ padding: 18 }}>
          <Eyebrow>Health information</Eyebrow>
          <div style={{ margin: "14px 0 6px" }}>
            <Vitals hr={victim.hr} color={color} height={46} id={victim.id + "-detail"} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12, marginTop: 14 }}>
            {[
              ["Heart rate", `${victim.hr} bpm`],
              ["SpO₂", `${victim.spo2}%`],
              ["Injury severity", victim.injury],
              ["Waiting time", `${wait} min`],
            ].map(([label, val]) => (
              <div key={label}>
                <div style={{ fontFamily: F.body, fontSize: 11.5, color: palette.textMute }}>{label}</div>
                <div style={{ fontFamily: F.mono, fontSize: 17, color: palette.text, marginTop: 2 }}>{val}</div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel style={{ padding: 18 }}>
          <Eyebrow>Triage &amp; dispatch</Eyebrow>
          <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <div style={{ fontFamily: F.body, fontSize: 11.5, color: palette.textMute }}>Status</div>
              <div style={{ marginTop: 6 }}>
                <Badge tone={sev}>{victim.triage}</Badge>
              </div>
            </div>
            <div>
              <div style={{ fontFamily: F.body, fontSize: 11.5, color: palette.textMute }}>Assigned team</div>
              <div style={{ fontFamily: F.mono, fontSize: 17, color: palette.text, marginTop: 2 }}>
                {victim.team || "Unassigned"}
              </div>
            </div>
            <div>
              <div style={{ fontFamily: F.body, fontSize: 11.5, color: palette.textMute }}>ETA</div>
              <div style={{ fontFamily: F.mono, fontSize: 17, color: eta === 0 ? palette.stable : palette.text, marginTop: 2 }}>
                {eta != null ? (eta === 0 ? "Arriving" : `${eta} min`) : "—"}
              </div>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}

/* --------------------------- teams list ------------------------ */

function TeamsList({ onOpenTeam }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
      {Object.values(teamsData).map((t) => (
        <Panel key={t.id} style={{ padding: 16, cursor: "pointer" }} onClick={() => onOpenTeam(t.id)}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Truck size={18} color={palette.accent} />
              <span style={{ fontFamily: F.display, fontWeight: 700, fontSize: 16, color: palette.text }}>
                Team {t.id}
              </span>
            </div>
            <Badge tone="stable">{t.status}</Badge>
          </div>
          <div style={{ display: "flex", gap: 18, marginTop: 14, fontFamily: F.mono, fontSize: 12.5, color: palette.textMute }}>
            <span>Zone {t.zone}</span>
            <span>Capacity {t.capacity[0]}/{t.capacity[1]}</span>
            <span>ETA {t.etaBase} min</span>
          </div>
          <div style={{ marginTop: 10, fontFamily: F.body, fontSize: 12.5, color: palette.textDim }}>
            {t.route.join("  →  ")}
          </div>
        </Panel>
      ))}
    </div>
  );
}

/* --------------------------- route diagram ------------------------ */

function RouteNode({ label, kind }) {
  const map = {
    base: { bg: palette.raised2, fg: palette.text, border: palette.border },
    victim: { bg: palette.criticalDim, fg: palette.critical, border: `${palette.critical}55` },
    victimAlt: { bg: palette.warningDim, fg: palette.warning, border: `${palette.warning}55` },
    hospital: { bg: palette.accentDim, fg: palette.accent, border: `${palette.accent}55` },
    alt: { bg: palette.stableDim, fg: palette.stable, border: `${palette.stable}55` },
  };
  const s = map[kind] || map.base;
  return (
    <div
      style={{
        padding: "8px 16px",
        borderRadius: 8,
        background: s.bg,
        color: s.fg,
        border: `1px solid ${s.border}`,
        fontFamily: F.mono,
        fontWeight: 600,
        fontSize: 13.5,
        textAlign: "center",
        minWidth: 140,
      }}
    >
      {label}
    </div>
  );
}

function RouteFlow({ stops, blocked }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      {stops.map((s, i) => (
        <React.Fragment key={i}>
          <RouteNode label={s.label} kind={s.kind} />
          {i < stops.length - 1 && (
            <div style={{ position: "relative", height: 30, display: "flex", alignItems: "center" }}>
              <div
                style={{
                  width: 1.5,
                  height: 30,
                  background: blocked === i ? palette.critical : palette.border,
                  opacity: blocked === i ? 0.5 : 1,
                }}
              />
              <ArrowRight
                size={13}
                color={blocked === i ? palette.critical : palette.textDim}
                style={{ position: "absolute", left: -6, top: "50%", transform: "translateY(-50%) rotate(90deg)" }}
              />
              {blocked === i && (
                <X
                  size={18}
                  color={palette.critical}
                  style={{ position: "absolute", left: -9, top: "50%", transform: "translateY(-50%)" }}
                  strokeWidth={3}
                />
              )}
            </div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

/* --------------------------- team detail ------------------------ */

function TeamDetail({ team, onBack, onSimulate }) {
  return (
    <div>
      <button
        onClick={onBack}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          background: "none",
          border: "none",
          color: palette.textMute,
          fontFamily: F.body,
          fontSize: 13,
          cursor: "pointer",
          marginBottom: 14,
          padding: 0,
        }}
      >
        <ChevronLeft size={15} /> Back
      </button>

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <h2 style={{ fontFamily: F.display, fontWeight: 700, fontSize: 22, color: palette.text, margin: 0 }}>
          Rescue team {team.id}
        </h2>
        <Badge tone="stable">{team.status}</Badge>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 12 }}>
        <Panel style={{ padding: 18 }}>
          <Eyebrow>Status</Eyebrow>
          <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 14 }}>
            {[
              ["Zone", team.zone],
              ["Capacity", `${team.capacity[0]} / ${team.capacity[1]}`],
              ["ETA to next stop", `${team.etaBase} min`],
            ].map(([label, val]) => (
              <div key={label}>
                <div style={{ fontFamily: F.body, fontSize: 11.5, color: palette.textMute }}>{label}</div>
                <div style={{ fontFamily: F.mono, fontSize: 17, color: palette.text, marginTop: 2 }}>{val}</div>
              </div>
            ))}
          </div>
          <button
            onClick={() => onSimulate(team.id)}
            style={{
              marginTop: 20,
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              padding: "10px 14px",
              borderRadius: 8,
              border: `1px solid ${palette.critical}55`,
              background: palette.criticalDim,
              color: palette.critical,
              fontFamily: F.display,
              fontWeight: 700,
              fontSize: 12.5,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              cursor: "pointer",
            }}
          >
            <AlertTriangle size={14} /> Simulate road closure
          </button>
        </Panel>

        <Panel style={{ padding: 18 }}>
          <Eyebrow>Current route</Eyebrow>
          <div style={{ marginTop: 16 }}>
            <RouteFlow
              stops={team.route.map((r, i) => ({
                label: r,
                kind: i === 0 ? "base" : r.startsWith("HOSPITAL") ? "hospital" : "victim",
              }))}
            />
          </div>
        </Panel>
      </div>
    </div>
  );
}

/* --------------------------- adaptive replanning ------------------------ */

function ReplanningView({ teamId, onTeamChange }) {
  const [stage, setStage] = useState("idle"); // idle | blocked | replanned
  const team = teamsData[teamId];
  const before = team.route.map((r, i) => ({
    label: r,
    kind: i === 0 ? "base" : r.startsWith("HOSPITAL") ? "hospital" : "victim",
  }));
  const after = [
    ...before.slice(0, -1),
    { label: "Alt. road — Sector 9", kind: "alt" },
    before[before.length - 1],
  ];

  const eta = stage === "replanned" ? team.etaBase + 3 : team.etaBase;

  function simulate() {
    setStage("blocked");
    setTimeout(() => setStage("replanned"), 1200);
  }
  function reset() {
    setStage("idle");
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <Eyebrow>Adaptive replanning</Eyebrow>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
            <span style={{ fontFamily: F.body, fontSize: 13, color: palette.textMute }}>Team</span>
            <select
              value={teamId}
              onChange={(e) => {
                onTeamChange(e.target.value);
                setStage("idle");
              }}
              style={{
                background: palette.raised2,
                color: palette.text,
                border: `1px solid ${palette.border}`,
                borderRadius: 6,
                padding: "5px 10px",
                fontFamily: F.mono,
                fontSize: 13,
              }}
            >
              {Object.keys(teamsData).map((id) => (
                <option key={id} value={id}>
                  {id}
                </option>
              ))}
            </select>
          </div>
        </div>
        {stage === "idle" ? (
          <button
            onClick={simulate}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 16px",
              borderRadius: 8,
              border: `1px solid ${palette.critical}55`,
              background: palette.criticalDim,
              color: palette.critical,
              fontFamily: F.display,
              fontWeight: 700,
              fontSize: 12.5,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              cursor: "pointer",
            }}
          >
            <AlertTriangle size={14} /> Simulate road R17 blocked
          </button>
        ) : (
          <button
            onClick={reset}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 16px",
              borderRadius: 8,
              border: `1px solid ${palette.border}`,
              background: palette.raised2,
              color: palette.textMute,
              fontFamily: F.display,
              fontWeight: 700,
              fontSize: 12.5,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              cursor: "pointer",
            }}
          >
            <RefreshCw size={13} /> Reset
          </button>
        )}
      </div>

      {stage !== "idle" && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 16px",
            marginBottom: 16,
            borderRadius: 8,
            background: palette.criticalDim,
            border: `1px solid ${palette.critical}44`,
            color: palette.critical,
            fontFamily: F.mono,
            fontSize: 13,
          }}
        >
          <ShieldAlert size={16} />
          ROAD R17 BLOCKED — reason: debris obstruction, sector 9
          {stage === "blocked" && (
            <span style={{ marginLeft: "auto", color: palette.textMute, fontFamily: F.body }}>Recomputing route…</span>
          )}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Panel style={{ padding: 18 }}>
          <Eyebrow>Before</Eyebrow>
          <div style={{ marginTop: 16 }}>
            <RouteFlow stops={before} blocked={stage !== "idle" ? before.length - 2 : null} />
          </div>
        </Panel>
        <Panel style={{ padding: 18 }}>
          <Eyebrow>{stage === "replanned" ? "After" : "Pending"}</Eyebrow>
          <div style={{ marginTop: 16, opacity: stage === "replanned" ? 1 : 0.3, transition: "opacity 0.4s" }}>
            <RouteFlow stops={stage === "replanned" ? after : before} />
          </div>
        </Panel>
      </div>

      <Panel style={{ padding: 18, marginTop: 12 }}>
        <div style={{ display: "flex", gap: 40 }}>
          <div>
            <div style={{ fontFamily: F.body, fontSize: 11.5, color: palette.textMute }}>ETA</div>
            <div style={{ fontFamily: F.mono, fontSize: 20, color: palette.text, marginTop: 2 }}>
              {team.etaBase} min {stage === "replanned" && (
                <>
                  <ArrowRight size={14} style={{ display: "inline", verticalAlign: "middle", margin: "0 6px" }} color={palette.textDim} />
                  <span style={{ color: palette.warning }}>{eta} min</span>
                </>
              )}
            </div>
          </div>
          <div>
            <div style={{ fontFamily: F.body, fontSize: 11.5, color: palette.textMute }}>Affected team</div>
            <div style={{ fontFamily: F.mono, fontSize: 20, color: palette.text, marginTop: 2 }}>{team.id}</div>
          </div>
          <div>
            <div style={{ fontFamily: F.body, fontSize: 11.5, color: palette.textMute }}>Status</div>
            <div style={{ fontFamily: F.mono, fontSize: 20, color: stage === "replanned" ? palette.stable : palette.textMute, marginTop: 2 }}>
              {stage === "idle" ? "Nominal" : stage === "blocked" ? "Recomputing" : "Route updated"}
            </div>
          </div>
        </div>
      </Panel>
    </div>
  );
}

/* --------------------------- zones / hospitals / events / network ------------------------ */

function ZonesView() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
      {zones.map((z) => (
        <Panel key={z.id} style={{ padding: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontFamily: F.display, fontWeight: 700, fontSize: 18, color: palette.text }}>Zone {z.id}</span>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: sevColor(z.status) }} />
          </div>
          <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 8, fontFamily: F.mono, fontSize: 13, color: palette.textMute }}>
            <span>{z.teams} teams active</span>
            <span>{z.victims} victims pending</span>
          </div>
        </Panel>
      ))}
    </div>
  );
}

function HospitalsView() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
      {hospitals.map((h) => {
        const pct = Math.round((h.used / h.cap) * 100);
        const tone = pct >= 90 ? "critical" : pct >= 70 ? "warning" : "stable";
        return (
          <Panel key={h.id} style={{ padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <BedDouble size={16} color={palette.accent} />
              <span style={{ fontFamily: F.display, fontWeight: 700, fontSize: 16, color: palette.text }}>
                Hospital {h.id}
              </span>
            </div>
            <div style={{ fontFamily: F.body, fontSize: 12, color: palette.textMute, marginTop: 4 }}>Zone {h.zone}</div>
            <div style={{ marginTop: 14 }}>
              <div style={{ height: 6, borderRadius: 4, background: palette.borderSoft, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${pct}%`, background: sevColor(tone), transition: "width 0.6s" }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontFamily: F.mono, fontSize: 12.5, color: palette.textMute }}>
                <span>{h.used} / {h.cap} beds</span>
                <span style={{ color: sevColor(tone) }}>{pct}%</span>
              </div>
            </div>
          </Panel>
        );
      })}
    </div>
  );
}

function EventsView({ events }) {
  return (
    <Panel style={{ padding: 0 }}>
      {events.map((e, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: "13px 18px",
            borderBottom: i < events.length - 1 ? `1px solid ${palette.borderSoft}` : "none",
          }}
        >
          <span style={{ fontFamily: F.mono, fontSize: 12.5, color: palette.textDim, width: 52 }}>{e.t}</span>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: sevColor(e.tone === "info" ? "stable" : e.tone), flexShrink: 0 }} />
          <span style={{ fontFamily: F.body, fontSize: 13.5, color: palette.text }}>{e.label}</span>
        </div>
      ))}
    </Panel>
  );
}

function NetworkView() {
  const radios = [
    { id: "R1", signal: 4 },
    { id: "R2", signal: 4 },
    { id: "R3", signal: 2 },
    { id: "R4", signal: 3 },
  ];
  return (
    <Panel style={{ padding: 0 }}>
      {radios.map((r, i) => (
        <div
          key={r.id}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 18px",
            borderBottom: i < radios.length - 1 ? `1px solid ${palette.borderSoft}` : "none",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {r.signal >= 3 ? <Wifi size={15} color={palette.stable} /> : <WifiOff size={15} color={palette.warning} />}
            <span style={{ fontFamily: F.mono, fontSize: 14, color: palette.text }}>Team {r.id}</span>
          </div>
          <div style={{ display: "flex", gap: 3, alignItems: "flex-end" }}>
            {[1, 2, 3, 4].map((bar) => (
              <div
                key={bar}
                style={{
                  width: 4,
                  height: 6 + bar * 3,
                  borderRadius: 2,
                  background: bar <= r.signal ? (r.signal >= 3 ? palette.stable : palette.warning) : palette.borderSoft,
                }}
              />
            ))}
          </div>
        </div>
      ))}
    </Panel>
  );
}

/* --------------------------- app shell ------------------------ */

export default function AtlasCommandCenter() {
  useFonts();
  const [view, setView] = useState("overview");
  const [openVictim, setOpenVictim] = useState(null);
  const [openTeam, setOpenTeam] = useState(null);
  const [replanTeam, setReplanTeam] = useState("R4");
  const [clock, setClock] = useState(() => new Date());
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setElapsed((e) => e + 1), 4000);
    return () => clearInterval(t);
  }, []);

  const victims = initialVictims;
  const [events] = useState(initialEvents);

  const clockStr = clock.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });

  function handleNav(id) {
    setView(id);
    setOpenVictim(null);
    setOpenTeam(null);
  }

  function handleSimulate(teamId) {
    setReplanTeam(teamId);
    setView("routes");
    setOpenTeam(null);
  }

  let content;
  if (view === "overview") {
    content = openVictim ? (
      <VictimDetail victim={victims.find((v) => v.id === openVictim)} onBack={() => setOpenVictim(null)} elapsed={elapsed} />
    ) : (
      <Overview victims={victims} onOpenVictim={setOpenVictim} elapsed={elapsed} />
    );
  } else if (view === "victims") {
    content = openVictim ? (
      <VictimDetail victim={victims.find((v) => v.id === openVictim)} onBack={() => setOpenVictim(null)} elapsed={elapsed} />
    ) : (
      <VictimsList victims={victims} onOpenVictim={setOpenVictim} elapsed={elapsed} />
    );
  } else if (view === "teams") {
    content = openTeam ? (
      <TeamDetail team={teamsData[openTeam]} onBack={() => setOpenTeam(null)} onSimulate={handleSimulate} />
    ) : (
      <TeamsList onOpenTeam={setOpenTeam} />
    );
  } else if (view === "zones") {
    content = <ZonesView />;
  } else if (view === "hospitals") {
    content = <HospitalsView />;
  } else if (view === "routes") {
    content = <ReplanningView teamId={replanTeam} onTeamChange={setReplanTeam} />;
  } else if (view === "events") {
    content = <EventsView events={events} />;
  } else if (view === "network") {
    content = <NetworkView />;
  }

  const activeLabel = NAV.find((n) => n.id === view)?.label;

  return (
    <div
      style={{
        width: "100%",
        height: "100vh",
        minHeight: 640,
        display: "flex",
        flexDirection: "column",
        background: palette.base,
        fontFamily: F.body,
      }}
    >
      <style>{`
        @keyframes atlas-scroll { from { transform: translateX(0); } to { transform: translateX(-400px); } }
        @keyframes atlas-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }
        @media (prefers-reduced-motion: reduce) {
          * { animation: none !important; }
        }
        ::selection { background: ${palette.accent}44; }
      `}</style>
      <TopBar clock={clockStr} />
      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        <NavRail active={view} onSelect={handleNav} />
        <div style={{ flex: 1, overflowY: "auto", padding: "22px 26px" }}>
          <div style={{ marginBottom: 18 }}>
            <h1 style={{ fontFamily: F.display, fontWeight: 700, fontSize: 20, color: palette.text, margin: 0, textTransform: "uppercase", letterSpacing: "0.04em" }}>
              {activeLabel}
            </h1>
          </div>
          {content}
        </div>
      </div>
    </div>
  );
}
