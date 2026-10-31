"use client";
import { useState } from "react";
import { ChevronDown, Info, TrendingUp } from "lucide-react";

const activity = [61, 68, 65, 74, 71, 81, 75, 78];
const risks = [24, 27, 21, 23, 17, 19, 14, 11.5];
function smoothPath(points: [number, number][]) {
  return points.map((p, i) => {
    if (!i) return `M${p[0]},${p[1]}`;
    const prev = points[i - 1], mid = (prev[0] + p[0]) / 2;
    return `C${mid},${prev[1]} ${mid},${p[1]} ${p[0]},${p[1]}`;
  }).join(" ");
}
export function Sparkline({ color = "#3c8b67", variant = 0 }: { color?: string; variant?: number }) {
  const lines = ["0,27 10,25 19,29 29,18 39,22 49,10 60,14 71,4 82,8", "0,8 10,12 19,7 29,17 39,12 49,23 60,19 71,29 82,25", "0,28 10,20 19,25 29,15 39,19 49,9 60,13 71,4 82,6", "0,28 10,25 19,27 29,19 39,21 49,12 60,16 71,6 82,9"];
  return <svg className="sparkline" viewBox="0 0 84 36" fill="none" aria-hidden="true"><polyline points={lines[variant % 4]} stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
export function EngagementChart({ studentValues, title = "Engagement & risk trends" }: { studentValues?: number[]; title?: string }) {
  const [period, setPeriod] = useState("8");
  const [hover, setHover] = useState<number | null>(null);
  const values = (studentValues || activity).slice(-Number(period));
  const riskValues = risks.slice(-Number(period));
  const x = (i: number) => 41 + i * (560 / Math.max(values.length - 1, 1));
  const y = (v: number) => 163 - v * 1.38;
  const points = values.map((v, i) => [x(i), y(v)] as [number, number]);
  const rp = riskValues.map((v, i) => [x(i), y(v)] as [number, number]);
  const path = smoothPath(points);
  return <section className="panel engagement-panel"><div className="panel-heading"><div><h2>{title}</h2><p>{studentValues ? "Your learning activity, one week at a time." : "Small signals. A bigger picture of student progress."}</p></div><div className="select-wrap small"><select aria-label="Chart time range" value={period} onChange={e => setPeriod(e.target.value)}><option value="8">Last 8 weeks</option><option value="4">Last 4 weeks</option></select><ChevronDown size={13} /></div></div><div className="chart-legend"><span><i className="legend-dot green" />Engagement</span>{!studentValues && <span><i className="legend-line" />At-risk share</span>}<span className="chart-insight"><TrendingUp size={13} />{studentValues ? "Keep moving forward" : "+7 pts engagement this month"}</span></div><div className="line-chart"><svg viewBox="0 0 638 201" role="img" aria-label="Weekly engagement trend chart"><defs><linearGradient id={studentValues ? "studentArea" : "engagementArea"} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#5f9e78" stopOpacity="0.21" /><stop offset="100%" stopColor="#8fba9c" stopOpacity="0.015" /></linearGradient></defs>{[0, 25, 50, 75, 100].map(v => <g key={v}><text x="27" y={y(v) + 3} textAnchor="end" className="axis-label">{v}%</text><line x1="41" x2="610" y1={y(v)} y2={y(v)} stroke="#e8ece7" strokeDasharray="3 4" /></g>)}<path d={`${path} L${x(values.length - 1)},163 L41,163 Z`} fill={`url(#${studentValues ? "studentArea" : "engagementArea"})`} /><path d={path} fill="none" stroke="#43825e" strokeWidth="2.6" strokeLinecap="round" />{!studentValues && <path d={smoothPath(rp)} fill="none" stroke="#d79274" strokeWidth="2" strokeDasharray="5 5" strokeLinecap="round" />}{values.map((v, i) => <g key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}><rect x={x(i) - 30} y="10" width="60" height="165" fill="transparent" /><text x={x(i)} y="189" textAnchor="middle" className="axis-label">Week {8 - values.length + i + 1}</text>{hover === i && <><line x1={x(i)} x2={x(i)} y1="20" y2="164" stroke="#8aac95" strokeDasharray="3 3" /><circle cx={x(i)} cy={y(v)} r="4" fill="#43825e" stroke="white" strokeWidth="2" /><rect x={Math.min(552, Math.max(38, x(i) - 25))} y={Math.max(0, y(v) - 33)} width="51" height="23" rx="5" fill="#183c30" /><text x={Math.min(577, Math.max(63, x(i)))} y={Math.max(15, y(v) - 18)} textAnchor="middle" fontSize="10" fill="white">{v}%</text></>}</g>)}</svg></div></section>;
}
export function RiskDonut({ high, moderate, low, onFilter, onInfo }: { high: number; moderate: number; low: number; onFilter: (risk: string) => void; onInfo: () => void }) {
  const total = high + moderate + low;
  const c = 2 * Math.PI * 69;
  let offset = 0;
  const segments = [{ n: low, color: "#78a387", label: "Low risk", key: "low" }, { n: moderate, color: "#e7c17b", label: "Moderate", key: "moderate" }, { n: high, color: "#d9907b", label: "High risk", key: "high" }];
  return <section className="panel risk-panel"><div className="panel-heading"><div><h2>Risk distribution</h2><p>Every student has a story.</p></div><button className="icon-button subtle" onClick={onInfo} aria-label="About risk categories"><Info size={16} /></button></div><div className="donut-wrap"><svg viewBox="0 0 180 180" role="img" aria-label={`${low} low risk, ${moderate} moderate risk, ${high} high risk students`}><circle cx="90" cy="90" r="69" fill="none" stroke="#f1f3ed" strokeWidth="20" />{segments.map(s => { const start = offset; offset += s.n / Math.max(total, 1) * c; return <circle className="donut-segment" key={s.key} cx="90" cy="90" r="69" fill="none" stroke={s.color} strokeWidth="20" strokeDasharray={`${Math.max(0, s.n / Math.max(total, 1) * c - 5)} ${c}`} strokeDashoffset={-start} transform="rotate(-90 90 90)" onClick={() => onFilter(s.key)}><title>{s.label}: {s.n}</title></circle>; })}<text x="90" y="88" textAnchor="middle" className="donut-total">{total.toLocaleString()}</text><text x="90" y="108" textAnchor="middle" className="donut-label">total students</text></svg><span className="donut-caption"><i />{Math.round(low / Math.max(total, 1) * 100)}% are on a steady path</span></div><div className="donut-legend">{segments.map(s => <button key={s.key} onClick={() => onFilter(s.key)}><span><i style={{ background: s.color }} />{s.label}</span><strong>{s.n.toLocaleString()}<small>{Math.round(s.n / Math.max(total, 1) * 100)}%</small></strong></button>)}</div></section>;
}
