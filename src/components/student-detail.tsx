"use client";
import { useRef, useState } from "react";
import {
  X,
  ArrowRight,
  Sparkles,
  Info,
  CalendarDays,
  BookOpen,
  Activity,
  ClipboardCheck,
  RotateCcw,
  Plus,
  ArrowDown,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import { Avatar, RiskBadge, CrBadge, useDialogFocus } from "./ui";
import { explainRisk, predictRisk, predictRaw, REFERENCE } from "@/lib/risk-model";
import { formatDate, getStudentBadge, type Student, type Intervention, type Role } from "@/lib/types";
import { buildStudentSubjectRecords, getProgramInfo } from "@/lib/air-university";

export function StudentDetail({
  student,
  interventions,
  role,
  onClose,
  onIntervention,
}: {
  student: Student;
  interventions: Intervention[];
  role: Role;
  onClose: () => void;
  onIntervention: (student: Student) => void;
}) {
  const drawerRef = useRef<HTMLElement>(null);
  useDialogFocus(drawerRef, onClose);
  const [tab, setTab] = useState("insights");
  const [quiz, setQuiz] = useState(student.quizScore);
  const [engagement, setEngagement] = useState(student.engagement);
  const [late, setLate] = useState(student.lateSubmissions);
  const predicted = predictRisk({ ...student, quizScore: quiz, engagement, lateSubmissions: late });
  const drivers = explainRisk(student);
  const changed = quiz !== student.quizScore || engagement !== student.engagement || late !== student.lateSubmissions;
  const programInfo = getProgramInfo(student.course);
  const subjectRecords = buildStudentSubjectRecords(student);
  const crBadge = getStudentBadge(student);

  return (
    <div
      className="drawer-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <aside
        ref={drawerRef}
        className="student-drawer"
        role="dialog"
        aria-modal="true"
        aria-label={`${student.name}'s student record`}
        onKeyDown={(e) => {
          if (e.key === "Escape") onClose();
        }}
      >
        <div className="drawer-top">
          <span className="eyebrow">AIR UNIVERSITY · STUDENT ACADEMIC & RISK RECORD</span>
          <button className="icon-button" onClick={onClose} aria-label="Close student profile" autoFocus>
            <X size={20} />
          </button>
        </div>
        <div className="student-profile">
          <Avatar name={student.name} color={student.avatarColor} />
          <div>
            <h2 className="student-name-with-badge">
              {student.name}
              <CrBadge label={crBadge} />
            </h2>
            <p>
              {student.studentId} <span>·</span> {student.course} ({programInfo.section})
            </p>
          </div>
        </div>
        <div className="profile-meta">
          <span>
            <BookOpen size={14} />
            {programInfo.semester}
          </span>
          <span>
            <UserCheck size={14} />
            Advisor: {programInfo.advisor}
          </span>
          <span className="profile-email">{student.email}</span>
        </div>
        <div className="drawer-tabs">
          {["insights", "record", "support"].map((t) => (
            <button key={t} className={tab === t ? "active" : ""} onClick={() => setTab(t)}>
              {t === "insights"
                ? "Risk & SHAP insights"
                : t === "record"
                  ? `Subject records (${subjectRecords.length})`
                  : `Support plan (${interventions.length})`}
            </button>
          ))}
        </div>
        <div className="drawer-body">
          {tab === "insights" && (
            <>
              <div className={`risk-summary ${student.riskScore >= 65 ? "high" : ""}`}>
                <div>
                  <span className="eyebrow">OVERALL EARLY-WARNING RISK SCORE</span>
                  <div className="big-risk">
                    {student.riskScore}
                    <small>%</small>
                    <RiskBadge score={student.riskScore} />
                  </div>
                  <p>
                    Class Advisor: <strong>{programInfo.advisor}</strong> · Section {programInfo.section}
                  </p>
                </div>
                <div className="risk-gauge">
                  <svg viewBox="0 0 100 62">
                    <path d="M12 53a38 38 0 0 1 76 0" fill="none" stroke="#ecd9cf" strokeWidth="9" strokeLinecap="round" />
                    <path
                      d="M12 53a38 38 0 0 1 76 0"
                      fill="none"
                      stroke={student.riskScore >= 65 ? "#c97d64" : "#649774"}
                      strokeWidth="9"
                      strokeLinecap="round"
                      pathLength="100"
                      strokeDasharray={`${student.riskScore} 100`}
                    />
                  </svg>
                  <span>
                    0 <span>100</span>
                  </span>
                </div>
              </div>
              <section className="detail-section">
                <div className="section-line">
                  <h3>What’s behind the score?</h3>
                  <span className="mini-tag">
                    <Sparkles size={11} />
                    SHAP attribution
                  </span>
                </div>
                <p className="muted">Exact Shapley contribution of each academic indicator relative to the Air University benchmark.</p>
                <div className="driver-list">
                  {drivers.map((d) => (
                    <div className="driver" key={d.key}>
                      <div>
                        <span>{d.label}</span>
                        <strong className={d.value > 0 ? "risk-text" : "green-text"}>
                          {d.value > 0 ? "+" : ""}
                          {d.value.toFixed(1)}
                          <small> pts</small>
                        </strong>
                      </div>
                      <div className="driver-track">
                        <i
                          className={d.value > 0 ? "adverse" : "protective"}
                          style={{ width: `${Math.min(100, (Math.abs(d.value) / 30) * 100)}%` }}
                        />
                      </div>
                      <small>
                        {d.key === "lateSubmissions"
                          ? `${d.actual} assignments/labs submitted late`
                          : d.key === "missedAssessments"
                            ? `${d.actual} assessments not submitted`
                            : `${d.actual}% ${
                                d.key === "engagement" ? "VLE / lab activity" : d.key === "quizScore" ? "average quiz score" : "class attendance"
                              }`}
                      </small>
                    </div>
                  ))}
                </div>
                <div className="model-note">
                  <Info size={14} />
                  <span>
                    Reference baseline {predictRaw(REFERENCE).toFixed(1)}% + feature contributions = {predictRaw(student).toFixed(1)}%.
                  </span>
                </div>
              </section>
              <section className="whatif-card">
                <div className="section-line">
                  <h3>
                    <Sparkles size={16} />
                    What-If Risk Simulator
                  </h3>
                  <button
                    className="text-button"
                    onClick={() => {
                      setQuiz(student.quizScore);
                      setEngagement(student.engagement);
                      setLate(student.lateSubmissions);
                    }}
                  >
                    <RotateCcw size={12} />
                    Reset
                  </button>
                </div>
                <p>Simulate how improving quiz performance, lab engagement, or on-time submissions reduces academic risk.</p>
                <div className="slider-field">
                  <label htmlFor="quiz-slider">
                    Average quiz score<strong>{quiz}%</strong>
                  </label>
                  <input
                    id="quiz-slider"
                    type="range"
                    min="0"
                    max="100"
                    value={quiz}
                    onChange={(e) => setQuiz(Number(e.target.value))}
                    style={{ backgroundSize: `${quiz}% 100%` }}
                  />
                  <div>
                    <span>0%</span>
                    <span>100%</span>
                  </div>
                </div>
                <div className="slider-field">
                  <label htmlFor="engagement-slider">
                    Online & lab engagement<strong>{engagement}%</strong>
                  </label>
                  <input
                    id="engagement-slider"
                    type="range"
                    min="0"
                    max="100"
                    value={engagement}
                    onChange={(e) => setEngagement(Number(e.target.value))}
                  />
                  <div>
                    <span>0%</span>
                    <span>100%</span>
                  </div>
                </div>
                <div className="slider-field">
                  <label htmlFor="late-slider">
                    Late submissions<strong>{late}</strong>
                  </label>
                  <input id="late-slider" type="range" min="0" max="10" value={late} onChange={(e) => setLate(Number(e.target.value))} />
                  <div>
                    <span>0</span>
                    <span>10</span>
                  </div>
                </div>
                <div className="whatif-result">
                  <div>
                    <span>Current risk</span>
                    <strong>{student.riskScore}%</strong>
                  </div>
                  <ArrowRight size={22} />
                  <div>
                    <span>Projected risk</span>
                    <strong className={predicted < student.riskScore ? "green-text" : ""}>{predicted}%</strong>
                  </div>
                  {changed && (
                    <span className={`change-pill ${predicted > student.riskScore ? "worse" : ""}`}>
                      <ArrowDown size={12} />
                      {Math.abs(student.riskScore - predicted)} pts
                    </span>
                  )}
                </div>
              </section>
            </>
          )}
          {tab === "record" && (
            <>
              <div className="detail-record-grid">
                {[
                  { label: "Overall Quiz Avg", value: student.quizScore, icon: BookOpen },
                  { label: "Lab & Portal Engagement", value: student.engagement, icon: Activity },
                  { label: "Overall Attendance", value: student.attendance, icon: ClipboardCheck },
                ].map((v) => (
                  <div className="detail-record-stat" key={v.label}>
                    <v.icon size={20} />
                    <strong>{v.value}%</strong>
                    <span>{v.label}</span>
                  </div>
                ))}
              </div>
              <section className="detail-section">
                <h3>Subject-wise record & assigned faculty ({student.course})</h3>
                <p className="muted">
                  Complete per-subject attendance, quiz, midterm, and total marks with assigned subject teacher and room.
                </p>
                <div className="assessment-list">
                  {subjectRecords.map((sub) => (
                    <div key={sub.code}>
                      <span className="assessment-icon">
                        <BookOpen size={16} />
                      </span>
                      <div>
                        <strong>
                          {sub.code} · {sub.title}
                        </strong>
                        <small>
                          Teacher: <b>{sub.teacherName}</b> · {sub.room} · {sub.schedule}
                        </small>
                        <small>
                          Attendance: {sub.attendance}% · Quiz: {sub.quizScore}% · Midterm: {sub.midtermScore}%
                        </small>
                      </div>
                      <span>
                        {sub.totalScore}% ({sub.grade})
                      </span>
                      <span
                        className={`status-label ${
                          sub.status === "At Risk" ? "late" : sub.status === "Needs Attention" ? "scheduled" : "completed"
                        }`}
                      >
                        {sub.status}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
              <section className="detail-section">
                <h3>Weekly learning activity (8 weeks)</h3>
                <div className="activity-bars">
                  {student.weeklyActivity.map((n, i) => (
                    <div key={i}>
                      <span>{n}%</span>
                      <i style={{ height: `${n * 1.2}px` }} />
                      <small>W{i + 1}</small>
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}
          {tab === "support" && (
            <section className="detail-section">
              <h3>Advisor & teacher support plans</h3>
              <p className="muted">Academic interventions and advisory follow-ups coordinated with {programInfo.advisor}.</p>
              {interventions.length ? (
                interventions.map((p) => (
                  <article className="support-item" key={p.id}>
                    <div className="support-item-icon">
                      <ClipboardCheck size={19} />
                    </div>
                    <div>
                      <span className="eyebrow">{p.type}</span>
                      <h4>{p.title}</h4>
                      <p>{p.notes}</p>
                      <span className={`status-label ${p.status}`}>{p.status.replace("_", " ")}</span>
                      <small>Due {formatDate(p.dueDate)}</small>
                    </div>
                  </article>
                ))
              ) : (
                <div className="empty-state">
                  <ShieldCheck size={30} />
                  <h3>On a steady track</h3>
                  <p>No active academic warnings or interventions for this student.</p>
                </div>
              )}
            </section>
          )}
        </div>
        <div className="drawer-footer">
          <span>
            <ShieldCheck size={14} />
            Air University Student Advisory System · {programInfo.section}
          </span>
          {role !== "student" && (
            <button className="button primary" onClick={() => onIntervention(student)}>
              <Plus size={16} />
              Create intervention
            </button>
          )}
        </div>
      </aside>
    </div>
  );
}
