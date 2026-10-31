"use client";
import { useState, type FormEvent } from "react";
import {
  Award,
  BookOpen,
  Building2,
  Check,
  ClipboardCheck,
  Clock3,
  GraduationCap,
  Layers,
  MapPin,
  Plus,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { Avatar, CrBadge, RiskBadge, api, Busy } from "./ui";
import { FIXED_SESSIONS, WEEK_DAYS } from "@/lib/air-university";
import { type Workspace, type EnrollmentDTO } from "@/lib/types";

export function CoursesAndCrPanel({ data, onReload, onToast }: { data: Workspace; onReload: () => Promise<void>; onToast: (msg: string) => void }) {
  const [progFilter, setProgFilter] = useState<string>("ALL");
  const [reqType, setReqType] = useState("Academic Request");
  const [reqSubject, setReqSubject] = useState("");
  const [reqDesc, setReqDesc] = useState("");
  const [busy, setBusy] = useState(false);

  const isStudent = data.user.role === "student";
  const myStudent = isStudent ? data.students[0] : null;
  const coursesList = (data.courses || []).filter((c) => progFilter === "ALL" || c.programCode === progFilter);
  const teachersList = data.teachers || [];
  const timetable = data.timetableEntries || [];
  const crList = data.crAssignments || [];
  const requests = data.requests || [];

  async function handleAssignCr(sectionId: number, studentId: number) {
    setBusy(true);
    try {
      await api("/api/ecosystem", "POST", { action: "assign_cr", sectionId, studentId });
      await onReload();
      onToast("Section Class Representative (CR) updated and logged.");
    } catch (err) {
      onToast((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function submitCrRequest(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api("/api/ecosystem", "POST", {
        action: "submit_request",
        requestType: reqType,
        subject: reqSubject,
        description: reqDesc,
      });
      setReqSubject("");
      setReqDesc("");
      await onReload();
      onToast("Request submitted to Air University administration.");
    } catch (err) {
      onToast((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function resolveRequest(requestId: number, status: string) {
    setBusy(true);
    try {
      await api("/api/ecosystem", "POST", {
        action: "resolve_request",
        requestId,
        status,
        responseNote: status === "resolved" ? "Verified and resolved by University Administration." : "Reviewed by Administration.",
      });
      await onReload();
      onToast(`Request marked ${status}.`);
    } catch (err) {
      onToast((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {/* 1. Departments & Degree Programs Summary (Scoped for Student vs Teacher/Admin) */}
      {!isStudent ? (
        <div className="metrics-grid" style={{ marginBottom: 18 }}>
          {(data.programs || []).map((prog) => {
            const dept = (data.departments || []).find((d) => d.id === prog.departmentId);
            const progStudents = data.students.filter((s) => s.course === prog.code);
            const progSections = (data.sections || []).filter((s) => s.programCode === prog.code);
            const progCourses = (data.courses || []).filter((c) => c.programCode === prog.code);
            return (
              <div className="panel" key={prog.code} style={{ padding: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span className="eyebrow">{dept?.code} · {dept?.buildingCode}</span>
                  <span className="count-tag">{prog.totalCredits} Cr Hrs</span>
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginTop: 6 }}>{prog.code} — {prog.name}</h3>
                <p style={{ fontSize: 10.5, color: "#6e8064", marginTop: 4 }}>
                  Head: <strong>{dept?.headName}</strong> · {progStudents.length} Active Students · {progSections.length} Sections · {progCourses.length} Courses
                </p>
              </div>
            );
          })}
          <div className="panel" style={{ padding: 16 }}>
            <span className="eyebrow">ECOSYSTEM SCOPE</span>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginTop: 6 }}>
              {data.user.role === "admin" ? "3 Departments · 5 Sections" : "Assigned Teaching Scope"}
            </h3>
            <p style={{ fontSize: 10.5, color: "#6e8064", marginTop: 4 }}>
              <strong>{(data.courses || []).length}</strong> Courses · <strong>{teachersList.length}</strong> Faculty · <strong>{crList.length}</strong> Active CRs
            </p>
          </div>
        </div>
      ) : (
        myStudent && (
          <div className="panel" style={{ padding: 16, marginBottom: 18 }}>
            <span className="eyebrow">MY ENROLLED PROGRAM &amp; SECTION</span>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginTop: 6 }}>
              {myStudent.name} ({myStudent.studentId}) — {myStudent.course} · Semester {myStudent.semesterNumber} · Section {myStudent.sectionCode}
            </h3>
            <p style={{ fontSize: 10.5, color: "#6e8064", marginTop: 4 }}>
              Enrolled Courses: <strong>{coursesList.length}</strong> · Assigned Section Teachers: <strong>{teachersList.length}</strong> · Section CR:{" "}
              <strong>{crList[0]?.studentName || "Assigned"}</strong>
            </p>
          </div>
        )
      )}

      {/* 2. Teacher Cross-Department Workload Management */}
      <section className="panel" style={{ marginBottom: 18 }}>
        <div className="panel-heading">
          <div>
            <h2>{isStudent ? `My Section Teachers (${myStudent?.sectionCode})` : "Cross-Department Faculty Workload & Availability"}</h2>
            <p>
              {isStudent
                ? "Teachers assigned to your enrolled courses and section."
                : "Teachers teach across BSAI, BSCS, and BSDS with zero overlapping classes across the 10 weekly slots."}
            </p>
          </div>
          <span className="count-tag">{teachersList.length} teachers</span>
        </div>
        <div className="table-scroll">
          <table className="team-table">
            <thead>
              <tr>
                <th>Teacher</th>
                <th>Primary Dept</th>
                <th>Additional Depts</th>
                <th>Assigned Programs</th>
                <th>Weekly Classes</th>
                <th>Weekly Hours</th>
                <th>Available Slots (of 10)</th>
                <th>Office</th>
              </tr>
            </thead>
            <tbody>
              {teachersList.map((t) => {
                const assignedSlots = timetable.filter((e) => e.teacherId === t.id);
                const weeklyClasses = assignedSlots.length;
                const weeklyHours = weeklyClasses * 3;
                const freeSlots = Math.max(0, 10 - weeklyClasses);
                return (
                  <tr key={t.id}>
                    <td>
                      <div className="student-name-cell">
                        <Avatar name={t.name} color="sage" small />
                        <div>
                          <strong>{t.name}</strong>
                          <small>{t.email} · {t.employeeId}</small>
                        </div>
                      </div>
                    </td>
                    <td><strong>{t.primaryDepartmentCode}</strong></td>
                    <td>{t.additionalDepartments.join(", ") || "—"}</td>
                    <td>
                      {t.assignedPrograms.map((p) => (
                        <span key={p} className="cr-badge" style={{ marginRight: 4 }}>{p}</span>
                      ))}
                    </td>
                    <td><strong>{weeklyClasses} sessions</strong></td>
                    <td>{weeklyHours} / {t.maxWeeklyHours} hrs</td>
                    <td><span className="status-label completed">{freeSlots} slots open</span></td>
                    <td>{t.officeRoom}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* 3. Semester-wise Course Catalog */}
      <section className="panel" style={{ marginBottom: 18 }}>
        <div className="panel-heading">
          <div>
            <h2>{isStudent ? `My Enrolled Courses (${myStudent?.course} · Semester ${myStudent?.semesterNumber})` : "Semester-Wise Course Catalog (BSAI · BSCS · BSDS)"}</h2>
            <p>Every course has a code, program, department, semester, credit hours, assigned teacher, classroom, and weekly schedule.</p>
          </div>
          {!isStudent && (
            <div className="segmented-tabs">
              {["ALL", "BSAI", "BSCS", "BSDS"].map((p) => (
                <button key={p} className={progFilter === p ? "active" : ""} onClick={() => setProgFilter(p)}>
                  {p}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="table-scroll">
          <table className="record-table">
            <thead>
              <tr>
                <th>Course Code</th>
                <th>Course Name</th>
                <th>Program</th>
                <th>Semester</th>
                <th>Credit Hours</th>
                <th>Assigned Teacher(s)</th>
                <th>Classroom</th>
                <th>Scheduled Sessions</th>
              </tr>
            </thead>
            <tbody>
              {coursesList.map((c) => {
                const slots = timetable.filter((t) => t.courseId === c.id);
                const teacherNames = [...new Set(slots.map((s) => s.teacherName))].join(", ") || "Assigned Faculty";
                const roomCodes = [...new Set(slots.map((s) => s.classroomCode))].join(", ") || "Room-B-117";
                const schedSummary = slots.map((s) => `${s.dayOfWeek.slice(0, 3)} (${s.sessionSlot === "SESSION_1" ? "08:40" : "11:40"})`).join(", ");
                return (
                  <tr key={c.id}>
                    <td><strong>{c.code.replace(/-(AI|CS)$/, "")}</strong></td>
                    <td>{c.name}</td>
                    <td><span className="cr-badge">{c.programCode}</span></td>
                    <td>Semester {c.semesterNumber}</td>
                    <td>{c.creditHours} Cr Hrs</td>
                    <td><strong>{teacherNames}</strong></td>
                    <td>{roomCodes}</td>
                    <td><small>{schedSummary || "2 sessions/week"}</small></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* 4. Class Representative (CR) Hierarchy & Management */}
      <div className="insights-grid">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Section Class Representatives (CR Management)</h2>
              <p>Hierarchy: Department → Program → Semester → Section → Active CR (1 CR per section).</p>
            </div>
            <Award size={18} />
          </div>
          <div className="table-scroll">
            <table className="record-table">
              <thead>
                <tr>
                  <th>Section</th>
                  <th>Program &amp; Sem</th>
                  <th>Active CR</th>
                  <th>Registration No</th>
                  {data.user.role === "admin" && <th>Reassign CR</th>}
                </tr>
              </thead>
              <tbody>
                {(data.sections || []).map((sec) => {
                  const cr = crList.find((c) => c.sectionId === sec.id);
                  const secStudents = data.students.filter((s) => s.sectionCode === sec.code);
                  return (
                    <tr key={sec.id}>
                      <td><strong>{sec.code}</strong></td>
                      <td>{sec.programCode} · Sem {sec.semesterNumber}</td>
                      <td>
                        <strong>{cr?.studentName || "Assigned"}</strong>{" "}
                        <CrBadge label={`CR · ${sec.code}`} />
                      </td>
                      <td>{cr?.studentRegNo || "—"}</td>
                      {data.user.role === "admin" && (
                        <td>
                          <select
                            aria-label={`Assign CR for ${sec.code}`}
                            value={cr?.studentId ?? ""}
                            disabled={busy}
                            onChange={(e) => handleAssignCr(sec.id, Number(e.target.value))}
                            style={{ fontSize: 10, padding: "4px 6px", border: "1px solid #d5e0c8", borderRadius: 5 }}
                          >
                            {secStudents.map((st) => (
                              <option key={st.id} value={st.id}>
                                {st.name} ({st.studentId})
                              </option>
                            ))}
                          </select>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>CR Complaints, Room Issues &amp; Academic Requests</h2>
              <p>Class Representatives can report classroom issues, timetable conflicts, or class-wide requests.</p>
            </div>
          </div>
          <form onSubmit={submitCrRequest} className="app-form" style={{ paddingBottom: 12 }}>
            <div className="form-row">
              <label>
                Category
                <select value={reqType} onChange={(e) => setReqType(e.target.value)}>
                  <option>Academic Request</option>
                  <option>Class Complaint</option>
                  <option>Classroom Issue</option>
                  <option>Timetable Conflict</option>
                </select>
              </label>
              <label>
                Subject <span>*</span>
                <input
                  value={reqSubject}
                  onChange={(e) => setReqSubject(e.target.value)}
                  placeholder="e.g. Lab-B-001 workstation check"
                  required
                />
              </label>
            </div>
            <label>
              Details <span>*</span>
              <input
                value={reqDesc}
                onChange={(e) => setReqDesc(e.target.value)}
                placeholder="Describe the class-wide request or room issue…"
                required
              />
            </label>
            <div className="form-footer" style={{ marginTop: 10, paddingTop: 10 }}>
              <button type="submit" className="button primary small-button" disabled={busy}>
                {busy ? <Busy /> : <><Plus size={14} />Submit Request</>}
              </button>
            </div>
          </form>
          <div style={{ padding: "0 20px 16px" }}>
            {requests.slice(0, 4).map((req) => (
              <div key={req.id} style={{ borderTop: "1px solid #edf1e5", padding: "10px 0", display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                <div>
                  <span className="eyebrow">{req.requestType} · {req.sectionCode} · {req.studentName} {req.submittedByCr ? "(CR)" : ""}</span>
                  <strong style={{ display: "block", fontSize: 11, marginTop: 2 }}>{req.subject}</strong>
                  <small style={{ color: "#7f9072", fontSize: 9.5 }}>{req.description}</small>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span className={`status-label ${req.status === "resolved" ? "completed" : "scheduled"}`}>{req.status}</span>
                  {data.user.role !== "student" && req.status !== "resolved" && (
                    <button className="text-button" onClick={() => resolveRequest(req.id, "resolved")} disabled={busy}>
                      Resolve
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}

export function AcademicsAndGpaPanel({ data, onReload, onToast }: { data: Workspace; onReload: () => Promise<void>; onToast: (msg: string) => void }) {
  const [selectedStudentId, setSelectedStudentId] = useState<number>(data.students[0]?.id ?? 1);
  const [busy, setBusy] = useState(false);

  const activeStudent = data.students.find((s) => s.id === selectedStudentId) ?? data.students[0];
  const studentEnrollments = (data.enrollments || []).filter((e) => e.studentId === activeStudent?.id);
  const studentGpa = (data.gpaRecords || []).find((g) => g.studentId === activeStudent?.id);
  const allBacklogs = data.backlogs || [];
  const allWithdrawals = data.withdrawals || [];
  const allWarnings = data.warnings || [];
  const courseMap = Object.fromEntries((data.courses || []).map((c) => [c.id, c]));
  const studentMap = Object.fromEntries(data.students.map((s) => [s.id, s]));

  async function quickGradeBump(enr: EnrollmentDTO, deltaQuiz: number, deltaMid: number) {
    setBusy(true);
    try {
      const res = await api<{ gpa: number; letterGrade: string; totalMarks: number }>("/api/ecosystem", "POST", {
        action: "update_enrollment",
        enrollmentId: enr.id,
        attendancePct: Math.min(100, enr.attendancePct + 2),
        quizMarks: Math.min(15, Number(enr.quizMarks) + deltaQuiz),
        assignmentMarks: Number(enr.assignmentMarks),
        midtermMarks: Math.min(30, Number(enr.midtermMarks) + deltaMid),
        finalMarks: Number(enr.finalMarks),
      });
      await onReload();
      onToast(`Updated marks (${res.totalMarks}% · ${res.letterGrade}). Recalculated GPA: ${res.gpa.toFixed(2)}`);
    } catch (err) {
      onToast((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function clearBacklog(backlogId: number) {
    setBusy(true);
    try {
      await api("/api/ecosystem", "POST", { action: "update_backlog", backlogId, status: "cleared" });
      await onReload();
      onToast("Backlog marked cleared and academic history updated.");
    } catch (err) {
      onToast((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {/* 1. GPA & CGPA Engine + 4.00 Grading Scale */}
      <div className="insights-grid" style={{ marginBottom: 18 }}>
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Credit-Hour Weighted 4.00 GPA &amp; CGPA Engine</h2>
              <p>Formula: GPA = Σ(Grade Points × Credit Hours) / Total Credit Hours.</p>
            </div>
            {data.user.role !== "student" && (
              <div className="select-wrap small">
                <select
                  aria-label="Select student for GPA inspection"
                  value={activeStudent?.id ?? ""}
                  onChange={(e) => setSelectedStudentId(Number(e.target.value))}
                >
                  {data.students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.studentId} · {s.course})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
          {activeStudent && (
            <div style={{ padding: "12px 20px 18px" }}>
              <div style={{ display: "flex", gap: 18, alignItems: "center", marginBottom: 14, flexWrap: "wrap" }}>
                <Avatar name={activeStudent.name} color={activeStudent.avatarColor} />
                <div>
                  <strong style={{ fontSize: 14 }}>{activeStudent.name}</strong>
                  <p style={{ fontSize: 10, color: "#7c8d70" }}>
                    {activeStudent.studentId} · {activeStudent.course} ({activeStudent.sectionCode}) · Credits: {studentGpa?.creditHours || 15}
                  </p>
                </div>
                <div style={{ marginLeft: "auto", display: "flex", gap: 14 }}>
                  <div className="detail-record-stat" style={{ padding: "8px 14px" }}>
                    <strong style={{ fontSize: 20, marginTop: 0 }}>{Number(activeStudent.gpa).toFixed(2)}</strong>
                    <span>Semester GPA</span>
                  </div>
                  <div className="detail-record-stat" style={{ padding: "8px 14px" }}>
                    <strong style={{ fontSize: 20, marginTop: 0 }}>{Number(activeStudent.cgpa).toFixed(2)}</strong>
                    <span>Cumulative CGPA</span>
                  </div>
                </div>
              </div>
              <div className="table-scroll">
                <table className="record-table">
                  <thead>
                    <tr>
                      <th>Course</th>
                      <th>Cr Hrs</th>
                      <th>Att %</th>
                      <th>Quiz (15)</th>
                      <th>Assign (15)</th>
                      <th>Mid (30)</th>
                      <th>Final (40)</th>
                      <th>Total &amp; Grade</th>
                      <th>GP</th>
                      {data.user.role !== "student" && <th>Action</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {studentEnrollments.map((enr) => {
                      const c = courseMap[enr.courseId];
                      return (
                        <tr key={enr.id}>
                          <td>
                            <strong>{(c?.code || "CS").replace(/-(AI|CS)$/, "")}</strong> · {c?.name || "Course"}
                          </td>
                          <td>{c?.creditHours || 3}</td>
                          <td>{enr.attendancePct}%</td>
                          <td>{Number(enr.quizMarks).toFixed(1)}</td>
                          <td>{Number(enr.assignmentMarks).toFixed(1)}</td>
                          <td>{Number(enr.midtermMarks).toFixed(1)}</td>
                          <td>{Number(enr.finalMarks).toFixed(1)}</td>
                          <td><strong>{Number(enr.totalMarks).toFixed(0)}% ({enr.letterGrade})</strong></td>
                          <td>{Number(enr.gradePoints).toFixed(2)}</td>
                          {data.user.role !== "student" && (
                            <td>
                              <button
                                className="text-button"
                                disabled={busy}
                                onClick={() => quickGradeBump(enr, 1, 2)}
                              >
                                +Marks / Recalc
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Official 4.00 Grading Scale Boundaries</h2>
              <p>Configurable Air University letter grade and quality point table.</p>
            </div>
            <GraduationCap size={18} />
          </div>
          <div className="table-scroll">
            <table className="record-table">
              <thead>
                <tr>
                  <th>Letter Grade</th>
                  <th>Percentage Range</th>
                  <th>Grade Points (4.00)</th>
                </tr>
              </thead>
              <tbody>
                {(data.gradingScale || []).map((g) => (
                  <tr key={g.letterGrade}>
                    <td><strong>{g.letterGrade}</strong></td>
                    <td>{g.minPercentage}% – {g.maxPercentage}%</td>
                    <td><strong>{Number(g.gradePoints).toFixed(2)}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* 2. Backlog Intelligence & Separate Dropped-Course Module */}
      <div className="insights-grid" style={{ marginBottom: 18 }}>
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Backlog &amp; Repeat Course Intelligence</h2>
              <p>Tracks failed, uncleared, repeated, and cleared backlog courses.</p>
            </div>
            <span className="count-tag">{allBacklogs.length} records</span>
          </div>
          <div className="table-scroll">
            <table className="record-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Course</th>
                  <th>Sem</th>
                  <th>Attempts</th>
                  <th>Status</th>
                  {data.user.role !== "student" && <th>Action</th>}
                </tr>
              </thead>
              <tbody>
                {allBacklogs.map((b) => {
                  const st = studentMap[b.studentId];
                  return (
                    <tr key={b.id}>
                      <td><strong>{st?.name || `Student #${b.studentId}`}</strong></td>
                      <td><strong>{b.courseCode}</strong> · {b.courseName}</td>
                      <td>Sem {b.semesterNumber}</td>
                      <td>{b.attempts}</td>
                      <td>
                        <span className={`status-label ${b.status === "cleared" ? "completed" : "late"}`}>
                          {b.status}
                        </span>
                      </td>
                      {data.user.role !== "student" && (
                        <td>
                          {b.status !== "cleared" ? (
                            <button className="text-button" disabled={busy} onClick={() => clearBacklog(b.id)}>
                              Mark Cleared
                            </button>
                          ) : (
                            <small>Cleared</small>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Dropped &amp; Withdrawn Courses Module</h2>
              <p>Official withdrawals and approved drops are tracked separately and never counted as failed courses.</p>
            </div>
            <span className="count-tag">{allWithdrawals.length} drops</span>
          </div>
          <div className="table-scroll">
            <table className="record-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Course</th>
                  <th>Withdrawal Type</th>
                  <th>Status</th>
                  <th>GPA Impact</th>
                </tr>
              </thead>
              <tbody>
                {allWithdrawals.map((w) => {
                  const st = studentMap[w.studentId];
                  return (
                    <tr key={w.id}>
                      <td><strong>{st?.name || `Student #${w.studentId}`}</strong></td>
                      <td><strong>{w.courseCode}</strong> · {w.courseName}</td>
                      <td>{w.withdrawalType}</td>
                      <td><span className="status-label completed">{w.status}</span></td>
                      <td><small>W (Non-punitive · Not a Failure)</small></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* 3. Academic Early Warning Engine */}
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Academic Early-Warning Intelligence (Low / Medium / High / Critical Risk)</h2>
            <p>Automated triggers for Low CGPA, Poor Attendance, Uncleared Backlogs, and Course Withdrawals.</p>
          </div>
          <ShieldAlert size={18} />
        </div>
        <div className="table-scroll">
          <table className="record-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Program &amp; Section</th>
                <th>CGPA</th>
                <th>Attendance</th>
                <th>Warning Level</th>
                <th>Diagnostic Triggers &amp; Reasons</th>
              </tr>
            </thead>
            <tbody>
              {allWarnings.slice(0, 15).map((w) => {
                const st = studentMap[w.studentId];
                if (!st) return null;
                return (
                  <tr key={w.id}>
                    <td><strong>{st.name}</strong> <small>({st.studentId})</small></td>
                    <td>{st.course} · {st.sectionCode}</td>
                    <td><strong>{Number(st.cgpa).toFixed(2)}</strong></td>
                    <td>{st.attendance}%</td>
                    <td><RiskBadge score={w.riskScore} /> <small>({w.riskLevel})</small></td>
                    <td>{w.reasons.join(" · ")}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

export function DigitalCampusPanel({ data }: { data: Workspace }) {
  const buildingsList = data.buildings || [];
  const roomsList = data.classrooms || [];
  const timetable = data.timetableEntries || [];
  const [selectedBuildingId, setSelectedBuildingId] = useState<number>(buildingsList[0]?.id ?? 1);
  const [activeDay, setActiveDay] = useState<string>("Monday");
  const [activeSlot, setActiveSlot] = useState<"SESSION_1" | "SESSION_2">("SESSION_1");

  const activeBuilding = buildingsList.find((b) => b.id === selectedBuildingId) ?? buildingsList[0];
  const buildingRooms = roomsList.filter((r) => !activeBuilding || r.buildingId === activeBuilding.id);

  return (
    <>
      <section className="panel" style={{ padding: 20, marginBottom: 18 }}>
        <div className="panel-heading" style={{ padding: "0 0 16px" }}>
          <div>
            <h2>Air University 3D Isometric Digital Campus &amp; Live Room Allocation</h2>
            <p>Interactive campus map connecting academic buildings, departments, laboratories, classrooms, and live session schedules.</p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <select
              aria-label="Filter campus occupancy by day"
              value={activeDay}
              onChange={(e) => setActiveDay(e.target.value)}
              style={{ fontSize: 10.5, padding: "6px 10px", border: "1px solid #d5e0c8", borderRadius: 6 }}
            >
              {WEEK_DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
            <select
              aria-label="Filter campus occupancy by session"
              value={activeSlot}
              onChange={(e) => setActiveSlot(e.target.value as "SESSION_1" | "SESSION_2")}
              style={{ fontSize: 10.5, padding: "6px 10px", border: "1px solid #d5e0c8", borderRadius: 6 }}
            >
              {FIXED_SESSIONS.map((s) => <option key={s.slot} value={s.slot}>{s.label} ({s.timeRange})</option>)}
            </select>
          </div>
        </div>

        {/* Interactive 3D Isometric SVG Campus Scene */}
        <div style={{ background: "linear-gradient(180deg,#0d2238 0%,#15344f 100%)", borderRadius: 12, padding: 18, color: "#e6f2ff" }}>
          <svg viewBox="0 0 820 300" style={{ width: "100%", height: "auto", maxHeight: 300 }} role="img" aria-label="Air University 3D Digital Campus Map">
            {/* Isometric Campus Grid */}
            <defs>
              <pattern id="campusGrid" width="40" height="24" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 40 12 L 20 24 L 0 12 Z" fill="none" stroke="rgba(148, 210, 255, 0.12)" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="820" height="300" fill="url(#campusGrid)" rx="10" />
            <ellipse cx="410" cy="155" rx="340" ry="115" fill="rgba(42, 157, 143, 0.12)" stroke="rgba(148, 210, 255, 0.25)" strokeDasharray="5 5" />

            {buildingsList.map((b, idx) => {
              const positions = [
                { x: 155, y: 95 },
                { x: 645, y: 95 },
                { x: 175, y: 215 },
                { x: 410, y: 150 },
                { x: 635, y: 215 },
              ];
              const pos = positions[idx % positions.length];
              const isSelected = activeBuilding?.id === b.id;
              return (
                <g
                  key={b.id}
                  transform={`translate(${pos.x}, ${pos.y})`}
                  style={{ cursor: "pointer" }}
                  onClick={() => setSelectedBuildingId(b.id)}
                >
                  {/* 3D Isometric Extruded Building Block */}
                  <polygon points="0,-42 64,-12 0,18 -64,-12" fill={b.color} opacity={isSelected ? 1 : 0.85} stroke="#fff" strokeWidth={isSelected ? 2.2 : 0.8} />
                  <polygon points="-64,-12 0,18 0,56 -64,26" fill={b.color} filter="brightness(0.78)" />
                  <polygon points="64,-12 0,18 0,56 64,26" fill={b.color} filter="brightness(0.62)" />
                  <text x="0" y="-12" textAnchor="middle" fill="#ffffff" fontSize="11" fontWeight="700">{b.code}</text>
                  <text x="0" y="3" textAnchor="middle" fill="#e2f1ff" fontSize="8.5">{b.name.split("—")[0]}</text>
                  <text x="0" y="72" textAnchor="middle" fill="#bae6fd" fontSize="9.5" fontWeight="600">{b.name}</text>
                </g>
              );
            })}
          </svg>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginTop: 10 }}>
            {buildingsList.map((b) => (
              <button
                key={b.id}
                onClick={() => setSelectedBuildingId(b.id)}
                style={{
                  padding: "6px 12px",
                  borderRadius: 6,
                  border: activeBuilding?.id === b.id ? "1.5px solid #7dd3fc" : "1px solid rgba(255,255,255,0.2)",
                  background: activeBuilding?.id === b.id ? "rgba(56, 189, 248, 0.22)" : "rgba(15, 34, 56, 0.65)",
                  color: "#f0f9ff",
                  fontSize: 10.5,
                }}
              >
                <strong>{b.code}</strong> · {b.name} ({b.floors} floors)
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Classroom Occupancy & Schedule Drill-Down */}
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>
              {activeBuilding ? `${activeBuilding.name} — Classrooms & Laboratories` : "University Classrooms"} ({activeDay} · {activeSlot === "SESSION_1" ? "08:40 AM–11:40 AM" : "11:40 AM–02:40 PM"})
            </h2>
            <p>{activeBuilding?.description}</p>
          </div>
          <span className="count-tag">{buildingRooms.length} rooms in building</span>
        </div>
        <div className="table-scroll">
          <table className="record-table">
            <thead>
              <tr>
                <th>Room Code</th>
                <th>Room Name</th>
                <th>Type &amp; Floor</th>
                <th>Capacity</th>
                <th>Live Status ({activeDay} · {activeSlot === "SESSION_1" ? "Session 1" : "Session 2"})</th>
                <th>Scheduled Course, Section &amp; Teacher</th>
              </tr>
            </thead>
            <tbody>
              {roomsList.map((room) => {
                const occ = timetable.find(
                  (t) => t.classroomId === room.id && t.dayOfWeek === activeDay && t.sessionSlot === activeSlot,
                );
                return (
                  <tr key={room.id}>
                    <td><strong>{room.code}</strong></td>
                    <td>{room.name}</td>
                    <td>{room.roomType} · Floor {room.floor}</td>
                    <td>{room.capacity} seats</td>
                    <td>
                      <span className={`status-label ${occ ? "in_progress" : "completed"}`}>
                        <i />
                        {occ ? "Occupied in Session" : "Available"}
                      </span>
                    </td>
                    <td>
                      {occ ? (
                        <>
                          <strong>{occ.courseCode} · {occ.courseName}</strong> ({occ.sectionCode} · {occ.programCode}) — <strong>{occ.teacherName}</strong>
                        </>
                      ) : (
                        <small style={{ color: "#879878" }}>Free for makeup lecture or lab reservation</small>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
