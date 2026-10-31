"use client";
import { useMemo, useState, type FormEvent } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  Check,
  CheckCheck,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  GraduationCap,
  HeartHandshake,
  Lightbulb,
  ShieldCheck,
  Sparkles,
  Activity,
  Bell,
  LockKeyhole,
  ExternalLink,
  BrainCircuit,
  Target,
  Edit3,
} from "lucide-react";
import { Avatar, RiskBadge, EmptyState, CrBadge, AirLogoMark, Modal, api, authHeaders, Busy } from "./ui";
import { EngagementChart } from "./charts";
import { explainRisk } from "@/lib/risk-model";
import { formatDate, getStudentBadge, type Workspace, type Intervention, type Student, type TimetableEntryDTO } from "@/lib/types";
import {
  AIR_FACULTY,
  AIR_PROGRAMS,
  FIXED_SESSIONS,
  WEEK_DAYS,
  buildStudentSubjectRecords,
  getProgramInfo,
} from "@/lib/air-university";

export function TimetablePanel({
  data,
  onReload,
  onToast,
}: {
  data: Workspace;
  onReload?: () => Promise<void>;
  onToast?: (msg: string) => void;
}) {
  const entries = data.timetableEntries || [];
  const sectionsList = data.sections || [];
  const teachersList = data.teachers || [];
  const roomsList = data.classrooms || [];

  const isStudent = data.user.role === "student";
  const isTeacher = data.user.role === "teacher";
  const [mode, setMode] = useState<"master" | "program" | "section" | "teacher" | "classroom">(
    isStudent ? "section" : isTeacher ? "teacher" : "master",
  );
  const [selectedProgram, setSelectedProgram] = useState<string>(data.students[0]?.course || "BSAI");
  const [selectedSection, setSelectedSection] = useState<string>(data.students[0]?.sectionCode || "BSAI-S3-A");
  const [selectedTeacher, setSelectedTeacher] = useState<string>(
    isTeacher ? data.user.name : teachersList[0]?.name || "Ahmed Khan",
  );
  const [selectedRoom, setSelectedRoom] = useState<string>(roomsList[0]?.code || "Room-B-117");

  const [editingEntry, setEditingEntry] = useState<TimetableEntryDTO | null>(null);
  const [editTeacherId, setEditTeacherId] = useState<number>(0);
  const [editRoomId, setEditRoomId] = useState<number>(0);
  const [conflictError, setConflictError] = useState<string>("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const filteredEntries = useMemo(() => {
    if (mode === "program") return entries.filter((e) => e.programCode === selectedProgram);
    if (mode === "section") return entries.filter((e) => e.sectionCode === selectedSection);
    if (mode === "teacher") return entries.filter((e) => e.teacherName === selectedTeacher);
    if (mode === "classroom") return entries.filter((e) => e.classroomCode === selectedRoom);
    return entries;
  }, [entries, mode, selectedProgram, selectedSection, selectedTeacher, selectedRoom]);

  function openEditSlot(entry: TimetableEntryDTO) {
    if (data.user.role !== "admin") return;
    setEditingEntry(entry);
    setEditTeacherId(entry.teacherId);
    setEditRoomId(entry.classroomId);
    setConflictError("");
    setSuggestions([]);
  }

  async function saveSlotEdit(e: FormEvent) {
    e.preventDefault();
    if (!editingEntry) return;
    setBusy(true);
    setConflictError("");
    setSuggestions([]);
    try {
      const response = await fetch("/api/ecosystem", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        credentials: "include",
        body: JSON.stringify({
          action: "update_timetable",
          entryId: editingEntry.id,
          teacherId: editTeacherId,
          classroomId: editRoomId,
        }),
      });
      const res = await response.json();
      if (!response.ok) {
        setConflictError(res.error || "Schedule conflict detected.");
        setSuggestions(Array.isArray(res.suggestions) ? res.suggestions : []);
        return;
      }
      setEditingEntry(null);
      if (onReload) await onReload();
      if (onToast) onToast("Timetable updated and verified conflict-free.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <section className="panel timetable-header-card">
        <div className="timetable-brand-row">
          <div className="timetable-logo-title">
            <AirLogoMark size={52} />
            <div>
              <span className="eyebrow">
                AIR UNIVERSITY · FIXED 5-DAY × 2-SESSION SCHEDULING ENGINE ({entries.length} WEEKLY SESSIONS)
              </span>
              <h2>
                BSAI, BSCS &amp; BSDS Weekly Schedule — Session 1 (08:40 AM–11:40 AM) &amp; Session 2 (11:40 AM–02:40 PM)
              </h2>
              <p>
                Every active program (<strong>BSAI, BSCS, BSDS</strong>) has two 3-hour sessions every working day (Monday–Friday) with zero teacher, classroom, or section overlaps.
              </p>
            </div>
          </div>

          {!isStudent ? (
            <div className="segmented-tabs">
              <button className={mode === "master" ? "active" : ""} onClick={() => setMode("master")}>
                {isTeacher ? `Assigned Scope (${entries.length})` : "University Master (50)"}
              </button>
              <button className={mode === "program" ? "active" : ""} onClick={() => setMode("program")}>
                Program-wise
              </button>
              <button className={mode === "section" ? "active" : ""} onClick={() => setMode("section")}>
                Section-wise
              </button>
              <button className={mode === "teacher" ? "active" : ""} onClick={() => setMode("teacher")}>
                Teacher-wise
              </button>
              <button className={mode === "classroom" ? "active" : ""} onClick={() => setMode("classroom")}>
                Classroom-wise
              </button>
            </div>
          ) : (
            <span className="cr-badge">
              My Section Schedule: {data.students[0]?.sectionCode} ({data.students[0]?.course} · Semester {data.students[0]?.semesterNumber})
            </span>
          )}
        </div>

        {/* Sub-filter bar for Program / Section / Teacher / Classroom (Staff/Admin only) */}
        {!isStudent && mode !== "master" && (
          <div style={{ display: "flex", gap: 10, alignItems: "center", paddingTop: 14, flexWrap: "wrap" }}>
            {mode === "program" &&
              AIR_PROGRAMS.map((p) => (
                <button
                  key={p.code}
                  className={`button ${selectedProgram === p.code ? "primary" : "secondary"} small-button`}
                  onClick={() => setSelectedProgram(p.code)}
                >
                  {p.code} — {p.name}
                </button>
              ))}
            {mode === "section" &&
              sectionsList.map((s) => (
                <button
                  key={s.code}
                  className={`button ${selectedSection === s.code ? "primary" : "secondary"} small-button`}
                  onClick={() => setSelectedSection(s.code)}
                >
                  {s.code} ({s.programCode} Sem {s.semesterNumber})
                </button>
              ))}
            {mode === "teacher" &&
              teachersList.map((t) => (
                <button
                  key={t.name}
                  className={`button ${selectedTeacher === t.name ? "primary" : "secondary"} small-button`}
                  onClick={() => setSelectedTeacher(t.name)}
                >
                  {t.name} ({t.assignedPrograms.join("/")})
                </button>
              ))}
            {mode === "classroom" &&
              roomsList.map((r) => (
                <button
                  key={r.code}
                  className={`button ${selectedRoom === r.code ? "primary" : "secondary"} small-button`}
                  onClick={() => setSelectedRoom(r.code)}
                >
                  {r.code}
                </button>
              ))}
          </div>
        )}

        {/* Fixed Two-Session Weekly Timetable Grid */}
        <div className="table-scroll timetable-scroll">
          <table className="au-timetable" aria-label="Air University Fixed Two-Session Weekly Schedule">
            <thead>
              <tr>
                <th className="day-col">Working Day</th>
                {FIXED_SESSIONS.map((sess) => (
                  <th key={sess.slot} style={{ width: "44%" }}>
                    <div>{sess.label.toUpperCase()}</div>
                    <small style={{ fontWeight: 600, color: "#2d523a" }}>{sess.timeRange} (3 Hours)</small>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {WEEK_DAYS.map((day) => (
                <tr key={day}>
                  <th className="day-row-header">{day}</th>
                  {FIXED_SESSIONS.map((sess) => {
                    const slotItems = filteredEntries.filter(
                      (e) => e.dayOfWeek === day && e.sessionSlot === sess.slot,
                    );
                    return (
                      <td key={`${day}-${sess.slot}`} className="tt-cell occupied" style={{ verticalAlign: "top", padding: 10 }}>
                        {slotItems.length === 0 ? (
                          <span style={{ color: "#95a388", fontSize: 10 }}>No class scheduled for this filter</span>
                        ) : (
                          <div style={{ display: "grid", gridTemplateColumns: slotItems.length > 1 ? "repeat(auto-fit, minmax(175px, 1fr))" : "1fr", gap: 8 }}>
                            {slotItems.map((item) => (
                              <div
                                key={item.id}
                                className="tt-slot-box"
                                style={{
                                  border: "1px solid #cfe0c2",
                                  borderRadius: 7,
                                  padding: "8px 10px",
                                  background:
                                    item.programCode === "BSAI"
                                      ? "#eef7e6"
                                      : item.programCode === "BSCS"
                                        ? "#e8f3fc"
                                        : "#f3eef8",
                                  cursor: data.user.role === "admin" ? "pointer" : "default",
                                }}
                                onClick={() => openEditSlot(item)}
                                title={data.user.role === "admin" ? "Click to modify teacher or classroom (with conflict check)" : undefined}
                              >
                                <div style={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
                                  <span className="cr-badge">{item.programCode} · {item.sectionCode}</span>
                                  <small style={{ fontWeight: 700, fontSize: 9.5 }}>{item.classroomCode}</small>
                                </div>
                                <strong className="tt-title" style={{ marginTop: 4 }}>
                                  {item.courseCode} — {item.courseName}
                                </strong>
                                <span className="tt-teacher">Teacher: {item.teacherName}</span>
                                <small className="tt-room">
                                  {item.startTime} – {item.endTime} · {item.creditHours} Cr Hrs
                                  {data.user.role === "admin" && <Edit3 size={10} style={{ display: "inline", marginLeft: 5 }} />}
                                </small>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {editingEntry && (
        <Modal
          title={`Modify Schedule Slot — ${editingEntry.sectionCode} (${editingEntry.dayOfWeek} · ${editingEntry.sessionSlot === "SESSION_1" ? "08:40 AM–11:40 AM" : "11:40 AM–02:40 PM"})`}
          subtitle="The conflict engine prevents teacher, classroom, and section double-booking across all departments."
          onClose={() => setEditingEntry(null)}
        >
          <form onSubmit={saveSlotEdit} className="app-form">
            <div className="form-callout">
              <ShieldCheck size={18} />
              <p>
                Course: <strong>{editingEntry.courseCode} — {editingEntry.courseName}</strong> ({editingEntry.programCode} · {editingEntry.sectionCode})
              </p>
            </div>
            <label>
              Assigned Teacher
              <select value={editTeacherId} onChange={(e) => setEditTeacherId(Number(e.target.value))}>
                {teachersList.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.assignedPrograms.join(", ")})
                  </option>
                ))}
              </select>
            </label>
            <label>
              Assigned Classroom / Lab
              <select value={editRoomId} onChange={(e) => setEditRoomId(Number(e.target.value))}>
                {roomsList.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.code} — {r.name} ({r.capacity} seats)
                  </option>
                ))}
              </select>
            </label>
            {conflictError && (
              <div className="form-error" role="alert">
                <strong>Schedule Conflict Detected:</strong> {conflictError}
                {suggestions.length > 0 && (
                  <div style={{ marginTop: 6 }}>
                    <strong>Available alternatives in this slot:</strong> {suggestions.join(", ")}
                  </div>
                )}
              </div>
            )}
            <div className="form-footer">
              <button type="button" className="button secondary" onClick={() => setEditingEntry(null)}>
                Cancel
              </button>
              <button type="submit" className="button primary" disabled={busy}>
                {busy ? <Busy /> : "Verify & Save Schedule"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}

export function InterventionPanel({
  data,
  onStatus,
  onStudent,
}: {
  data: Workspace;
  onStatus: (id: number, status: string) => Promise<void>;
  onStudent: (s: Student) => void;
}) {
  const [filter, setFilter] = useState("all"),
    [busy, setBusy] = useState<number | null>(null);
  const plans = data.interventions.filter((p) => filter === "all" || p.status === filter);
  async function update(p: Intervention, status: string) {
    setBusy(p.id);
    try {
      await onStatus(p.id, status);
    } finally {
      setBusy(null);
    }
  }
  return (
    <>
      <div className="section-toolbar">
        <div className="segmented-tabs">
          {[
            { key: "all", title: "All plans" },
            { key: "in_progress", title: "In progress" },
            { key: "scheduled", title: "Scheduled" },
            { key: "completed", title: "Completed" },
          ].map((t) => (
            <button className={filter === t.key ? "active" : ""} onClick={() => setFilter(t.key)} key={t.key}>
              {t.title}
              <span>{data.interventions.filter((p) => t.key === "all" || p.status === t.key).length}</span>
            </button>
          ))}
        </div>
        <span className="quiet-label">
          <ShieldCheck size={14} />
          Air University Advisory &amp; Early Intervention System
        </span>
      </div>
      {!plans.length ? (
        <section className="panel">
          <EmptyState
            title={filter === "completed" ? "Progress starts with a first step" : "No support plans in this category"}
            text={
              filter === "completed"
                ? "Completed advisory plans will appear here."
                : "No academic support plans match the current filter."
            }
          />
        </section>
      ) : (
        <div className="intervention-grid">
          {plans.map((p) => {
            const student = data.students.find((s) => s.id === p.studentId);
            return (
              <article className={`panel intervention-card ${p.status === "completed" ? "finished" : ""}`} key={p.id}>
                <div className="intervention-card-top">
                  <span className={`intervention-type ${p.type === "Study plan" ? "purple" : ""}`}>
                    <HeartHandshake size={14} />
                    {p.type}
                  </span>
                  <span className={`status-label ${p.status}`}>
                    <i />
                    {p.status.replace("_", " ")}
                  </span>
                </div>
                <h3>{p.title}</h3>
                <p>{p.notes}</p>
                {student && (
                  <button className="intervention-student" onClick={() => onStudent(student)}>
                    <Avatar name={student.name} color={student.avatarColor} small />
                    <span>
                      {student.name} <CrBadge label={getStudentBadge(student)} />
                      <small>
                        {student.studentId} · {student.course}
                      </small>
                    </span>
                    <ArrowUpRight size={15} />
                  </button>
                )}
                <div className="intervention-card-bottom">
                  <span>
                    <CalendarDays size={14} />
                    Due {formatDate(p.dueDate)}
                  </span>
                  {p.status === "completed" ? (
                    <span className="completed-message">
                      <CheckCheck size={15} />
                      One step forward
                    </span>
                  ) : (
                    <button
                      className="text-button"
                      disabled={busy === p.id}
                      onClick={() => update(p, data.user.role !== "student" && p.status === "scheduled" ? "in_progress" : "completed")}
                    >
                      {busy === p.id ? "Updating…" : data.user.role !== "student" && p.status === "scheduled" ? "Start plan" : "Mark complete"}
                      <ChevronRight size={14} />
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}

export function InsightsPanel({ data, onAbout }: { data: Workspace; onAbout: () => void }) {
  const features = useMemo(() => {
    const scores = new Map<string, { label: string; value: number }>();
    data.students.forEach((s) =>
      explainRisk(s).forEach((f) => scores.set(f.key, { label: f.label, value: (scores.get(f.key)?.value || 0) + Math.abs(f.value) })),
    );
    return [...scores.values()].map((f) => ({ ...f, value: f.value / Math.max(data.students.length, 1) })).sort((a, b) => b.value - a.value);
  }, [data.students]);
  return (
    <>
      <section className="insights-banner">
        <div className="insights-orbit">
          <BrainCircuit size={36} />
          <span />
          <i />
        </div>
        <div>
          <span className="eyebrow">UNIVERSITY-WIDE ACADEMIC INTELLIGENCE &amp; ANALYTICS</span>
          <h2>Behind every signal, there’s a reason.</h2>
          <p>
            Live database analytics across <strong>{data.stats.total} active students</strong>,{" "}
            <strong>{data.stats.totalTeachers || 10} teachers</strong>,{" "}
            <strong>{data.stats.totalCourses || 24} courses</strong>,{" "}
            <strong>{data.stats.totalSections || 5} sections</strong>,{" "}
            <strong>{data.stats.totalCrs || 5} CRs</strong>, and{" "}
            <strong>{data.stats.weeklyScheduledClasses || 50} weekly scheduled classes</strong>.
          </p>
          <button className="text-button" onClick={onAbout}>
            Methodology &amp; SHAP model <ArrowUpRight size={15} />
          </button>
        </div>
        <span className="model-version">
          <i />
          Pass Rate: {data.stats.passRate ?? 96}% · Avg CGPA: {data.stats.avgCgpa ?? 3.12}
        </span>
      </section>

      <div className="metrics-grid" style={{ marginBottom: 18 }}>
        <div className="panel" style={{ padding: 15 }}>
          <span className="eyebrow">WEEKLY SCHEDULED CLASSES</span>
          <strong className="metric-number">{data.stats.weeklyScheduledClasses || 50}</strong>
          <small style={{ color: "#788a6b" }}>10 sessions/section · Mon–Fri (08:40–14:40)</small>
        </div>
        <div className="panel" style={{ padding: 15 }}>
          <span className="eyebrow">AVERAGE UNIVERSITY CGPA</span>
          <strong className="metric-number">{(data.stats.avgCgpa || 3.12).toFixed(2)}</strong>
          <small style={{ color: "#788a6b" }}>4.00 Credit-Hour Weighted Scale</small>
        </div>
        <div className="panel" style={{ padding: 15 }}>
          <span className="eyebrow">ACTIVE BACKLOGS</span>
          <strong className="metric-number">{data.stats.unclearedBacklogs ?? 0}</strong>
          <small style={{ color: "#788a6b" }}>Uncleared &amp; repeated courses</small>
        </div>
        <div className="panel" style={{ padding: 15 }}>
          <span className="eyebrow">APPROVED COURSE DROPS</span>
          <strong className="metric-number">{data.stats.approvedDrops ?? 0}</strong>
          <small style={{ color: "#788a6b" }}>Tracked separately from failures</small>
        </div>
      </div>

      <div className="insights-grid">
        <section className="panel feature-panel">
          <div className="panel-heading">
            <div>
              <h2>What shapes the bigger picture?</h2>
              <p>Mean absolute Shapley contribution across your cohort.</p>
            </div>
            <Sparkles size={18} />
          </div>
          <div className="global-features">
            {features.map((f, i) => (
              <div key={f.label}>
                <div>
                  <span>{f.label}</span>
                  <strong>
                    {f.value.toFixed(1)} <small>pts</small>
                  </strong>
                </div>
                <div className="feature-track">
                  <i
                    style={{
                      width: `${(f.value / Math.max(features[0]?.value || 1, 1)) * 100}%`,
                      background: ["#648c71", "#8aa58a", "#b0b99b", "#d4bd90", "#dbad93"][i],
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="model-note">
            <ShieldCheck size={15} />
            Computed from live academic engagement, quiz averages, attendance, and lab submissions.
          </div>
        </section>
        <section className="panel model-facts">
          <div className="panel-heading">
            <div>
              <h2>Program-wise GPA, Risk &amp; CR Summary</h2>
              <p>Real-time statistics across BSAI (20), BSCS (20), and BSDS (20).</p>
            </div>
          </div>
          {AIR_PROGRAMS.map((prog) => {
            const progStudents = data.students.filter((s) => s.course === prog.code);
            const highRisk = progStudents.filter((s) => s.riskScore >= 65).length;
            const progAvgCgpa =
              progStudents.length > 0
                ? (progStudents.reduce((acc, s) => acc + Number(s.cgpa || 3.0), 0) / progStudents.length).toFixed(2)
                : "3.15";
            return (
              <div className="model-fact" key={prog.code}>
                <span>
                  <GraduationCap size={18} />
                </span>
                <div>
                  <h3>
                    {prog.code} — {prog.name} ({progStudents.length} students)
                  </h3>
                  <p>
                    Avg CGPA: <strong>{progAvgCgpa}</strong> · Advisor: <strong>{prog.advisor}</strong> · Primary CR: <strong>{prog.crName}</strong> · High Risk: <strong>{highRisk}</strong>
                  </p>
                </div>
              </div>
            );
          })}
        </section>
      </div>
      <section className="panel research-panel">
        <span className="research-icon">
          <GraduationCap size={28} />
        </span>
        <div>
          <h3>OULAD &amp; UCI Early-Warning Architecture for Air University</h3>
          <p>
            Combines weekly VLE/lab activity tracking (OULAD #99) and semester academic indicators (UCI Student Dropout #100) with exact
            Shapley attributions and interactive What-If simulation.
          </p>
          <div>
            <a href="https://analyse.kmi.open.ac.uk/open-dataset" target="_blank" rel="noreferrer">
              OULAD Reference <ExternalLink size={12} />
            </a>
            <a href="https://archive.ics.uci.edu/dataset/697/predict+students+dropout+and+academic+success" target="_blank" rel="noreferrer">
              UCI Dropout Dataset <ExternalLink size={12} />
            </a>
          </div>
        </div>
      </section>
    </>
  );
}

export function TeamPanel({ data }: { data: Workspace }) {
  return (
    <>
      <section className="panel team-panel">
        <div className="panel-heading">
          <div>
            <h2>Air University Cross-Department Faculty &amp; Subject Directory</h2>
            <p>Teachers across BSAI, BSCS, and BSDS, including Ahmed Khan, Sara Ahmed, Usman Ali, and Dr. Humaira.</p>
          </div>
          <span className="count-tag">{AIR_FACULTY.length} faculty members</span>
        </div>
        <div className="table-scroll">
          <table className="team-table">
            <thead>
              <tr>
                <th>Faculty Member</th>
                <th>Designation &amp; Department</th>
                <th>Assigned Subjects &amp; Sections</th>
                <th>Programs</th>
                <th>Office</th>
              </tr>
            </thead>
            <tbody>
              {AIR_FACULTY.map((fac) => (
                <tr key={fac.email}>
                  <td>
                    <div className="student-name-cell">
                      <Avatar name={fac.name} color={fac.advisoryClass ? "blue" : "sage"} />
                      <div>
                        <strong>
                          {fac.name}
                          {fac.email === data.user.email && <span className="you-label">You</span>}
                        </strong>
                        <small>{fac.email} · {fac.employeeId}</small>
                      </div>
                    </div>
                  </td>
                  <td>
                    <strong>{fac.designation}</strong>
                    <small className="table-secondary">
                      Primary: {fac.primaryDepartmentCode} · Additional: {fac.additionalDepartments.join(", ") || "—"}
                    </small>
                  </td>
                  <td>
                    {fac.subjects.map((s) => (
                      <div key={`${s.section}-${s.code}`} style={{ marginBottom: 3 }}>
                        <strong>{s.code}</strong> · {s.title} <small>({s.section} · {s.schedule})</small>
                      </div>
                    ))}
                  </td>
                  <td>{fac.programs.join(", ")}</td>
                  <td>{fac.officeRoom}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel team-panel" style={{ marginTop: 18 }}>
        <div className="panel-heading">
          <div>
            <h2>Portal Accounts, Class Representatives &amp; Audit Trail</h2>
            <p>Active administrator, faculty, CR, and demo student accounts.</p>
          </div>
          <span className="count-tag">{data.users.length} accounts</span>
        </div>
        <div className="table-scroll">
          <table className="team-table">
            <thead>
              <tr>
                <th>Account Holder</th>
                <th>Role</th>
                <th>Program Scope</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.users.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div className="student-name-cell">
                      <Avatar name={u.name} color={u.role === "admin" ? "peach" : u.role === "teacher" ? "sage" : "blue"} />
                      <div>
                        <strong>
                          {u.name}
                          {u.id === data.user.id && <span className="you-label">You</span>}
                          {u.isCr && <CrBadge label="CR" />}
                        </strong>
                        <small>{u.email}</small>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`role-tag ${u.role}`}>
                      {u.role === "admin" ? <ShieldCheck size={13} /> : u.role === "teacher" ? <BookOpen size={13} /> : <GraduationCap size={13} />}
                      {u.role === "admin" ? "Administrator" : u.role === "teacher" ? "Faculty / Teacher" : "Student"}
                    </span>
                  </td>
                  <td>{u.role === "admin" ? "All Programs & Faculty" : u.courses.join(", ") || "Own Student Record"}</td>
                  <td>
                    <span className="status-label completed">
                      <i />
                      Active Account
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

export function SettingsPanel({ data, onSaved }: { data: Workspace; onSaved: () => Promise<void> }) {
  const [name, setName] = useState(data.user.name),
    [notifications, setNotifications] = useState(data.user.notificationsEnabled),
    [digest, setDigest] = useState(data.user.weeklyDigest),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("/api/settings", "PATCH", { name, notificationsEnabled: notifications, weeklyDigest: digest });
      await onSaved();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="settings-grid" onSubmit={submit}>
      <section className="panel settings-card">
        <div className="panel-heading">
          <div>
            <h2>Account profile</h2>
            <p>Your official Air University portal identity.</p>
          </div>
          <Avatar name={name || data.user.name} color="peach" />
        </div>
        <div className="settings-body">
          <label>
            Full name
            <input value={name} onChange={(e) => setName(e.target.value)} required minLength={2} maxLength={120} />
          </label>
          <label>
            University email
            <input value={data.user.email} disabled />
            <small>Your Air University email address identifies your portal account.</small>
          </label>
          <label>
            Portal role
            <input
              value={data.user.role === "admin" ? "Administrator" : data.user.role === "teacher" ? "Faculty / Teacher" : "Student"}
              disabled
            />
          </label>
          <div className="form-callout">
            <ShieldCheck size={20} />
            <p>Role-based permissions are enforced by the server. Students only see their own academic record.</p>
          </div>
        </div>
      </section>
      <section className="panel settings-card">
        <div className="panel-heading">
          <div>
            <h2>Portal notifications</h2>
            <p>Configure early-warning alerts and weekly academic summaries.</p>
          </div>
          <Bell size={19} />
        </div>
        <div className="settings-body">
          <div className="toggle-row">
            <div>
              <h3>Workspace notifications</h3>
              <p>Show student risk signals and advisory updates in your notification panel.</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={notifications}
              aria-label="Workspace notifications"
              className={`toggle ${notifications ? "on" : ""}`}
              onClick={() => setNotifications(!notifications)}
            >
              <i />
            </button>
          </div>
          <div className="toggle-row">
            <div>
              <h3>Weekly progress digest</h3>
              <p>Enable weekly attendance, quiz, and intervention summaries.</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={digest}
              aria-label="Weekly progress digest"
              className={`toggle ${digest ? "on" : ""}`}
              onClick={() => setDigest(!digest)}
            >
              <i />
            </button>
          </div>
          <div className="privacy-box">
            <LockKeyhole size={23} />
            <h3>Strict Role-Based Privacy</h3>
            <p>Each student account is strictly bound to their own registration ID. Faculty and administrators access records according to their university role.</p>
          </div>
        </div>
      </section>
      <div className="settings-save">
        {error && <p className="form-error">{error}</p>}
        <span>Changes apply immediately to your Air University account.</span>
        <button className="button primary" disabled={busy}>
          {busy ? (
            <Busy />
          ) : (
            <>
              <Check size={15} />
              Save preferences
            </>
          )}
        </button>
      </div>
    </form>
  );
}

export function StudentOverview({
  data,
  onRecord,
  onPlan,
}: {
  data: Workspace;
  onRecord: () => void;
  onPlan: () => void;
}) {
  const s = data.students[0];
  if (!s) return <EmptyState title="Your record is on its way" text="Ask your university administrator to link your academic record." />;
  const drivers = explainRisk(s).slice(0, 3);
  const info = getProgramInfo(s.course);
  const badge = getStudentBadge(s);
  const subjectRecords = buildStudentSubjectRecords(s);
  const myBacklogs = (data.backlogs || []).filter((b) => b.studentId === s.id);
  const myDrops = (data.withdrawals || []).filter((w) => w.studentId === s.id);

  return (
    <>
      <section className="student-encouragement">
        <span className="encouragement-icon">
          <Sparkles size={27} />
        </span>
        <div>
          <span className="eyebrow">
            AIR UNIVERSITY · {s.course} ({s.sectionCode}) · SEMESTER {s.semesterNumber}
          </span>
          <h2 className="student-name-with-badge">
            Welcome, {s.name} <CrBadge label={badge} />
          </h2>
          <p>
            Reg No: <strong>{s.studentId}</strong> · Semester GPA: <strong>{Number(s.gpa || 3.0).toFixed(2)}</strong> · Cumulative CGPA:{" "}
            <strong>{Number(s.cgpa || 3.0).toFixed(2)}</strong> · Advisor: <strong>{info.advisor}</strong>
          </p>
        </div>
        <button className="button primary" onClick={onPlan}>
          See my support plan <ArrowRight size={15} />
        </button>
      </section>

      <div className="student-metrics">
        {[
          { label: "Cumulative CGPA (4.00)", value: Number(s.cgpa || 3.0).toFixed(2), icon: GraduationCap, tone: "sage", helper: `Semester GPA: ${Number(s.gpa || 3.0).toFixed(2)}`, isRaw: true },
          { label: "Average quiz score", value: s.quizScore, icon: BookOpen, tone: "blue", helper: `${subjectRecords.length} enrolled courses` },
          { label: "Class attendance", value: s.attendance, icon: Activity, tone: "lavender", helper: `Section ${s.sectionCode}` },
          {
            label: "Backlogs / Drops",
            value: `${myBacklogs.filter((b) => b.status !== "cleared").length} / ${myDrops.length}`,
            icon: HeartHandshake,
            tone: "peach",
            helper: `${data.interventions.filter((p) => p.status !== "completed").length} active support plans`,
            isRaw: true,
          },
        ].map((v, i) => (
          <button className="metric-card" key={v.label} onClick={i === 3 ? onPlan : onRecord}>
            <div className="metric-top">
              <span>{v.label}</span>
              <span className={`metric-icon ${v.tone}`}>
                <v.icon size={19} />
              </span>
            </div>
            <strong className="metric-number">
              {v.value}
              {!v.isRaw && <small>%</small>}
            </strong>
            <span className="metric-foot">{v.helper}</span>
          </button>
        ))}
      </div>

      <div className="student-chart-row">
        <EngagementChart studentValues={s.weeklyActivity} title="Your weekly learning & lab rhythm" />
        <section className="panel personal-risk">
          <div className="panel-heading">
            <div>
              <h2>Your Early-Warning Status ({s.warningLevel})</h2>
              <p>SHAP explanation of your overall academic indicators.</p>
            </div>
            <HeartHandshake size={19} />
          </div>
          <div className="personal-risk-score">
            <strong>
              {s.riskScore}
              <small>%</small>
            </strong>
            <RiskBadge score={s.riskScore} />
          </div>
          <p className="muted">Your score combines quiz averages, attendance, lab engagement, and on-time submissions.</p>
          {drivers.map((d) => (
            <div className="personal-driver" key={d.key}>
              <span>{d.label}</span>
              <strong>
                {d.value > 0 ? "+" : ""}
                {d.value.toFixed(0)} pts
              </strong>
            </div>
          ))}
          <button className="text-button" onClick={onRecord}>
            Understand my score &amp; explore what-if <ArrowUpRight size={14} />
          </button>
        </section>
      </div>

      <section className="panel" style={{ marginBottom: 20 }}>
        <div className="panel-heading">
          <div>
            <h2>Your Enrolled Courses, Marks &amp; Teachers (Semester {s.semesterNumber})</h2>
            <p>Subject-by-subject attendance, quiz, midterm, final, and grade points with your assigned faculty.</p>
          </div>
          <button className="text-button" onClick={onRecord}>
            Open full transcript <ArrowUpRight size={14} />
          </button>
        </div>
        <div className="table-scroll">
          <table className="record-table">
            <thead>
              <tr>
                <th>Code &amp; Course</th>
                <th>Assigned Teacher</th>
                <th>Room &amp; Schedule</th>
                <th>Attendance</th>
                <th>Quiz Avg</th>
                <th>Midterm</th>
                <th>Total &amp; Grade</th>
              </tr>
            </thead>
            <tbody>
              {subjectRecords.map((sub) => (
                <tr key={sub.code}>
                  <td>
                    <strong>{sub.code}</strong> · {sub.title}
                  </td>
                  <td>
                    <strong>{sub.teacherName}</strong>
                  </td>
                  <td>
                    {sub.room} · <small>{sub.schedule}</small>
                  </td>
                  <td>{sub.attendance}%</td>
                  <td>{sub.quizScore}%</td>
                  <td>{sub.midtermScore}%</td>
                  <td>
                    <strong>
                      {sub.totalScore}% ({sub.grade} · {sub.gradePoints.toFixed(2)})
                    </strong>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel next-steps">
        <div className="panel-heading">
          <div>
            <h2>Your advisory &amp; support steps</h2>
            <p>Coordinated with Class Advisor {info.advisor}.</p>
          </div>
          <button className="text-button" onClick={onPlan}>
            See full plan <ArrowUpRight size={14} />
          </button>
        </div>
        {data.interventions.slice(0, 3).map((p) => (
          <div className="next-step" key={p.id}>
            <span className={`next-step-check ${p.status === "completed" ? "checked" : ""}`}>
              {p.status === "completed" ? <Check size={16} /> : <ClipboardCheck size={16} />}
            </span>
            <div>
              <strong>{p.title}</strong>
              <p>{p.type}</p>
            </div>
            <span className={`status-label ${p.status}`}>{p.status.replace("_", " ")}</span>
            <span>
              <CalendarDays size={13} />
              {formatDate(p.dueDate)}
            </span>
            <button className="icon-button" onClick={onPlan} aria-label={`View ${p.title}`}>
              <ArrowUpRight size={16} />
            </button>
          </div>
        ))}
      </section>
    </>
  );
}

export function AcademicRecord({ student, onExplore }: { student: Student; onExplore: () => void }) {
  const info = getProgramInfo(student.course);
  const badge = getStudentBadge(student);
  const subjectRecords = buildStudentSubjectRecords(student);
  return (
    <>
      <section className="panel record-profile">
        <Avatar name={student.name} color={student.avatarColor} />
        <div>
          <h2 className="student-name-with-badge">
            {student.name} <CrBadge label={badge} />
          </h2>
          <p>
            {student.studentId} · {student.course} ({student.sectionCode}) · Semester {student.semesterNumber} · GPA:{" "}
            <strong>{Number(student.gpa || 3.0).toFixed(2)}</strong> · CGPA: <strong>{Number(student.cgpa || 3.0).toFixed(2)}</strong>
          </p>
        </div>
        <span className="semester-tag">
          <CalendarDays size={14} />
          Semester {student.semesterNumber}
        </span>
        <button className="button primary" onClick={onExplore}>
          <Sparkles size={15} />
          Explore SHAP &amp; What-If
        </button>
      </section>
      <div className="record-summary">
        {[
          { title: "Cumulative CGPA", value: Number(student.cgpa || 3.0).toFixed(2), icon: GraduationCap },
          { title: "Overall Attendance", value: `${student.attendance}%`, icon: Clock3 },
          { title: "Overall Quiz Average", value: `${student.quizScore}%`, icon: BookOpen },
          { title: "Earned Credits", value: `${student.earnedCredits || 34} Cr`, icon: ClipboardCheck },
        ].map((v) => (
          <div className="panel" key={v.title}>
            <v.icon size={20} />
            <span>{v.title}</span>
            <strong>{v.value}</strong>
          </div>
        ))}
      </div>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Official Semester Transcript &amp; Subject Teachers ({student.course})</h2>
            <p>Complete breakdown of every course, credit hours, assigned teacher, attendance, quiz, assignment, midterm, final, and grade points.</p>
          </div>
          <BookOpen size={19} />
        </div>
        <div className="table-scroll">
          <table className="record-table">
            <thead>
              <tr>
                <th>Course Code &amp; Title</th>
                <th>Assigned Teacher</th>
                <th>Room &amp; Schedule</th>
                <th>Attendance</th>
                <th>Quiz</th>
                <th>Assignment</th>
                <th>Midterm</th>
                <th>Final</th>
                <th>Total &amp; Grade</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {subjectRecords.map((sub) => (
                <tr key={sub.code}>
                  <td>
                    <BookOpen size={15} />
                    <strong>{sub.code}</strong> · {sub.title}
                  </td>
                  <td>
                    <strong>{sub.teacherName}</strong>
                    <small className="table-secondary">{sub.teacherEmail}</small>
                  </td>
                  <td>
                    {sub.room}
                    <small className="table-secondary">{sub.schedule}</small>
                  </td>
                  <td>{sub.attendance}%</td>
                  <td>{sub.quizScore}%</td>
                  <td>{sub.assignmentScore}%</td>
                  <td>{sub.midtermScore}%</td>
                  <td>{sub.finalScore}%</td>
                  <td>
                    <strong>
                      {sub.totalScore}% ({sub.grade} · {sub.gradePoints.toFixed(2)})
                    </strong>
                  </td>
                  <td>
                    <span
                      className={`status-label ${
                        sub.status === "At Risk" ? "late" : sub.status === "Needs Attention" ? "scheduled" : "completed"
                      }`}
                    >
                      {sub.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <EngagementChart studentValues={student.weeklyActivity} title="Your weekly activity" />
    </>
  );
}

export const RESOURCE_GUIDES = [
  {
    title: "Find your learning rhythm",
    category: "STUDY SKILLS · BSAI, BSCS & BSDS",
    icon: BookOpen,
    color: "sage",
    text: "Structure your preparation around Session 1 (08:40–11:40) and Session 2 (11:40–02:40).",
    body: [
      "Review lecture slides before each 3-hour session in Block B (AI), Block C (CS), and Block D (DS).",
      "Practice dry-running code and algorithms immediately after afternoon Session 2 classes.",
      "Coordinate with your Section Class Representative (CR) for shared lab notes and practice sheets.",
    ],
  },
  {
    title: "Get back on track",
    category: "BACKLOGS & COURSEWORK",
    icon: Target,
    color: "peach",
    text: "Overdue lab or uncleared backlog? Turn pending coursework into an achievable weekly plan.",
    body: [
      "Check the GPA & Backlogs tab to inspect credit hours, grade points, and any uncleared or repeated courses.",
      "Remember that an official course withdrawal ('W') is tracked separately and does not count as an F grade.",
      "Use the What-If simulator in your record to see how clearing late submissions lowers your risk score.",
    ],
  },
  {
    title: "Advisory & CR communication",
    category: "SECTION ADVISORY",
    icon: HeartHandshake,
    color: "lavender",
    text: "Connect with your Class Advisor or submit class-wide requests through your Section CR.",
    body: [
      "Every section has an assigned Class Advisor and an active student Class Representative (CR).",
      "CRs can submit classroom issues, timetable conflict alerts, and academic requests directly to administration.",
      "Check your Support Plan tab to track agreed goals and mark completed steps.",
    ],
  },
  {
    title: "Make the most of feedback",
    category: "GPA & MIDTERM GROWTH",
    icon: Lightbulb,
    color: "sand",
    text: "Understand how credit hours and grade points shape your Semester GPA and CGPA.",
    body: [
      "GPA is calculated as Sum(Grade Points × Credit Hours) / Total Credit Hours on a 4.00 scale.",
      "Focus extra study hours on 3-credit-hour core courses where moving from C+ to B+ lifts your cumulative CGPA fastest.",
      "Reach out to your teacher early if your attendance or quiz average drops below 75%.",
    ],
  },
];

export function ResourcesPanel({ onOpen }: { onOpen: (index: number) => void }) {
  return (
    <>
      <section className="resource-intro">
        <span>
          <HeartHandshake size={28} />
        </span>
        <div>
          <h2>Air University Student Success &amp; Advisory Resources</h2>
          <p>Practical academic guides for BSAI, BSCS, and BSDS students.</p>
        </div>
      </section>
      <div className="resource-grid">
        {RESOURCE_GUIDES.map((r, i) => (
          <button className="panel resource-card" key={r.title} onClick={() => onOpen(i)}>
            <span className={`resource-icon ${r.color}`}>
              <r.icon size={24} />
            </span>
            <span className="eyebrow">{r.category}</span>
            <h3>{r.title}</h3>
            <p>{r.text}</p>
            <span className="text-button">
              Read the guide <ArrowUpRight size={15} />
            </span>
          </button>
        ))}
      </div>
      <div className="support-reminder">
        <ShieldCheck size={20} />
        <p>For personal academic counseling, visit your Class Advisor during scheduled advisory hours at Air University.</p>
      </div>
    </>
  );
}
