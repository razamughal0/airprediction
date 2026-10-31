"use client";
import { useEffect, useMemo, useState } from "react";
import { Search, ChevronDown, ArrowUpDown, ArrowUpRight, ChevronLeft, ChevronRight, Plus, Download, X, Clock3 } from "lucide-react";
import { Avatar, RiskBadge, EmptyState, CrBadge } from "./ui";
import { COURSES, getStudentBadge, type Student, type Role } from "@/lib/types";
import { primaryFactor } from "@/lib/risk-model";
import { getProgramInfo } from "@/lib/air-university";

export function exportStudents(students: Student[], filename = "air-university-student-report") {
  const cells = [
    [
      "Registration ID",
      "Name",
      "Role / Badge",
      "Email",
      "Program",
      "Semester",
      "Class Advisor",
      "Risk Score (%)",
      "Engagement (%)",
      "Quiz Average (%)",
      "Attendance (%)",
      "Late Submissions",
      "Missed Assessments",
    ],
    ...students.map((s) => {
      const info = getProgramInfo(s.course);
      return [
        s.studentId,
        s.name,
        getStudentBadge(s) || "Student",
        s.email,
        s.course,
        info.semester,
        info.advisor,
        s.riskScore,
        s.engagement,
        s.quizScore,
        s.attendance,
        s.lateSubmissions,
        s.missedAssessments,
      ];
    }),
  ];
  const csv = cells.map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function timeAgo(value: string) {
  const hours = Math.max(1, Math.floor((Date.now() - new Date(value).getTime()) / 3600000));
  return hours < 24 ? `${hours} hours ago` : `${Math.floor(hours / 24)} ${Math.floor(hours / 24) === 1 ? "day" : "days"} ago`;
}

export function StudentTable({
  students,
  compact = false,
  role,
  initialFilter = "all",
  onSelect,
  onIntervention,
  onViewAll,
}: {
  students: Student[];
  compact?: boolean;
  role: Role;
  initialFilter?: string;
  onSelect: (s: Student) => void;
  onIntervention: (s: Student) => void;
  onViewAll?: () => void;
}) {
  const [search, setSearch] = useState("");
  const [risk, setRisk] = useState(initialFilter);
  const [course, setCourse] = useState("all");
  const [page, setPage] = useState(0);
  const [sort, setSort] = useState(false);
  const [selected, setSelected] = useState<number[]>([]);
  useEffect(() => {
    setRisk(initialFilter);
    setPage(0);
  }, [initialFilter]);

  const filtered = useMemo(
    () =>
      students
        .filter(
          (s) =>
            (!compact || s.riskScore >= 65 || Boolean(getStudentBadge(s))) &&
            (s.name + s.studentId + s.email + s.course).toLowerCase().includes(search.toLowerCase()) &&
            (course === "all" || s.course === course) &&
            (risk === "all" ||
              (risk === "high" ? s.riskScore >= 65 : risk === "moderate" ? s.riskScore >= 40 && s.riskScore < 65 : s.riskScore < 40)),
        )
        .sort((a, b) => (sort ? b.riskScore - a.riskScore : a.id - b.id)),
    [students, compact, search, course, risk, sort],
  );
  const size = compact ? 6 : 12;
  const visible = filtered.slice(page * size, (page + 1) * size);
  function toggle(id: number) {
    setSelected((ids) => (ids.includes(id) ? ids.filter((n) => n !== id) : [...ids, id]));
  }
  return (
    <section className={`panel students-panel ${compact ? "compact-table" : "directory-table"}`}>
      <div className="panel-heading">
        <div>
          <h2>
            {compact ? "Students who could use a little support" : "Air University student directory"}
            {compact && <span className="count-tag">{filtered.length}</span>}
          </h2>
          <p>
            {compact
              ? "Early academic warning signals across BSAI, BSCS, BSDS, BSSE & BSCYS."
              : "Filter by program (BSAI, BSCS, BSDS, BSSE, BSCYS) or search by registration ID and name."}
          </p>
        </div>
        {compact ? (
          <button className="text-button" onClick={onViewAll}>
            View all students <ArrowUpRight size={15} />
          </button>
        ) : (
          <button className="button secondary small-button" onClick={() => exportStudents(filtered)}>
            <Download size={14} />
            Export CSV
          </button>
        )}
      </div>
      {!compact && (
        <div className="table-toolbar">
          <div className="input-with-icon">
            <Search size={16} />
            <input
              aria-label="Search student directory"
              placeholder="Search by name (e.g. Abdul Hadi, M. Raza Mughal), Reg ID, or program…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
            />
            {search && (
              <button className="icon-button" aria-label="Clear search" onClick={() => setSearch("")}>
                <X size={14} />
              </button>
            )}
          </div>
          <div className="select-wrap">
            <select
              aria-label="Filter by risk level"
              value={risk}
              onChange={(e) => {
                setRisk(e.target.value);
                setPage(0);
              }}
            >
              <option value="all">All risk levels</option>
              <option value="high">High risk</option>
              <option value="moderate">Moderate risk</option>
              <option value="low">Low risk</option>
            </select>
            <ChevronDown size={14} />
          </div>
          <div className="select-wrap">
            <select
              aria-label="Filter by course"
              value={course}
              onChange={(e) => {
                setCourse(e.target.value);
                setPage(0);
              }}
            >
              <option value="all">All programs</option>
              {COURSES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <ChevronDown size={14} />
          </div>
        </div>
      )}
      {selected.length > 0 && (
        <div className="selection-bar">
          <span>{selected.length} students selected</span>
          <button className="text-button" onClick={() => exportStudents(students.filter((s) => selected.includes(s.id)))}>
            <Download size={13} />
            Export selection
          </button>
          <button className="icon-button" onClick={() => setSelected([])} aria-label="Clear selection">
            <X size={15} />
          </button>
        </div>
      )}
      <div className="table-scroll">
        <table className="student-table">
          <thead>
            <tr>
              <th className="checkbox-cell">
                <input
                  type="checkbox"
                  aria-label="Select visible students"
                  checked={visible.length > 0 && visible.every((s) => selected.includes(s.id))}
                  onChange={(e) =>
                    setSelected(
                      e.target.checked
                        ? [...new Set([...selected, ...visible.map((s) => s.id)])]
                        : selected.filter((id) => !visible.some((s) => s.id === id)),
                    )
                  }
                />
              </th>
              <th>Student</th>
              <th>Program & Advisor</th>
              <th>
                <button onClick={() => setSort(!sort)}>
                  Risk score <ArrowUpDown size={11} />
                </button>
              </th>
              <th>Key risk factor</th>
              <th className="last-active">Last active</th>
              <th className="action-cell">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {visible.map((s) => {
              const info = getProgramInfo(s.course);
              const badge = getStudentBadge(s);
              return (
                <tr
                  key={s.id}
                  onClick={() => onSelect(s)}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && e.target === e.currentTarget) onSelect(s);
                  }}
                >
                  <td className="checkbox-cell" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      aria-label={`Select ${s.name}`}
                      checked={selected.includes(s.id)}
                      onChange={() => toggle(s.id)}
                    />
                  </td>
                  <td>
                    <div className="student-name-cell">
                      <Avatar name={s.name} color={s.avatarColor} small />
                      <div>
                        <strong className="student-name-with-badge">
                          {s.name}
                          <CrBadge label={badge} />
                        </strong>
                        <small>{s.studentId}</small>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="course-name">
                      {s.course} · {info.section}
                    </span>
                    <small className="table-secondary">
                      {info.semester} · Advisor: {info.advisor}
                    </small>
                  </td>
                  <td>
                    <RiskBadge score={s.riskScore} />
                  </td>
                  <td>
                    <span className="factor-cell">
                      <i className={s.riskScore >= 65 ? "adverse" : "protective"} />
                      {s.riskScore < 40 ? "On a steady path" : primaryFactor(s)}
                    </span>
                  </td>
                  <td className="last-active">{timeAgo(s.lastActive)}</td>
                  <td className="action-cell">
                    <div className="row-actions">
                      {!compact && role !== "student" && (
                        <button
                          className="icon-button"
                          title={`Create intervention for ${s.name}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onIntervention(s);
                          }}
                        >
                          <Plus size={15} />
                        </button>
                      )}
                      <button
                        className="icon-button row-arrow"
                        aria-label={`View ${s.name}'s record`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelect(s);
                        }}
                      >
                        <ArrowUpRight size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {!filtered.length && (
        <EmptyState title="No students found" text="Try a different student name, registration ID, program, or risk filter.">
          <button
            className="button secondary"
            onClick={() => {
              setSearch("");
              setRisk("all");
              setCourse("all");
            }}
          >
            Clear filters
          </button>
        </EmptyState>
      )}
      <div className="table-footer">
        <span>
          Showing <strong>{filtered.length ? page * size + 1 : 0}–{Math.min((page + 1) * size, filtered.length)}</strong> of{" "}
          <strong>{filtered.length.toLocaleString()}</strong> students
        </span>
        {compact ? (
          <span className="updated-note">
            <Clock3 size={12} />
            Air University Early-Warning Index · Live
          </span>
        ) : (
          <div className="pagination">
            <button className="icon-button" aria-label="Previous page" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft size={16} />
            </button>
            <span>
              Page {page + 1} of {Math.max(1, Math.ceil(filtered.length / size))}
            </span>
            <button
              className="icon-button"
              aria-label="Next page"
              disabled={(page + 1) * size >= filtered.length}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
