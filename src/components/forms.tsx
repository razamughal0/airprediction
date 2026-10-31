"use client";
import { useState, type FormEvent } from "react";
import { CalendarDays, ShieldCheck, Plus, UserPlus } from "lucide-react";
import { api, Busy } from "./ui";
import { COURSES, type Student } from "@/lib/types";
type Props = { onSaved: () => Promise<void>; onClose: () => void };

export function InterventionForm({ students, selected, onSaved, onClose }: Props & { students: Student[]; selected?: Student | null }) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const values = Object.fromEntries(new FormData(e.currentTarget));
    try {
      await api("/api/interventions", "POST", { ...values, studentId: Number(values.studentId) });
      await onSaved();
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="app-form">
      <div className="form-callout">
        <ShieldCheck size={20} />
        <p>Coordinate an academic support plan with the student and their Class Advisor.</p>
      </div>
      <label>
        Student <span>*</span>
        <select name="studentId" required defaultValue={selected?.id ?? ""}>
          <option value="" disabled>
            Select a student
          </option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} · {s.studentId} ({s.course})
            </option>
          ))}
        </select>
      </label>
      <label>
        Intervention title <span>*</span>
        <input name="title" placeholder="e.g. AI232 & Data Structures academic check-in" minLength={3} maxLength={180} required />
      </label>
      <div className="form-row">
        <label>
          Support type
          <select name="type">
            <option>Academic check-in</option>
            <option>Study plan</option>
            <option>Academic support</option>
            <option>Mentoring</option>
            <option>Lab recovery</option>
            <option>Advisory counseling</option>
          </select>
        </label>
        <label>
          Follow-up date <span>*</span>
          <input
            type="date"
            name="dueDate"
            min={new Date().toISOString().slice(0, 10)}
            defaultValue={new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10)}
            required
          />
        </label>
      </div>
      <label>
        Action plan &amp; notes <span>*</span>
        <textarea
          name="notes"
          rows={4}
          required
          maxLength={4000}
          placeholder="Describe the academic support step, room/lab timing, and target goal…"
        />
      </label>
      <p className="form-hint">
        <CalendarDays size={13} />
        This plan appears immediately in the student’s personal Air University portal.
      </p>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="form-footer">
        <button type="button" className="button secondary" onClick={onClose}>
          Cancel
        </button>
        <button className="button primary" disabled={busy}>
          {busy ? (
            <Busy />
          ) : (
            <>
              <Plus size={16} />
              Create intervention
            </>
          )}
        </button>
      </div>
    </form>
  );
}

export function StudentForm({ onSaved, onClose }: Props) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const b = Object.fromEntries(new FormData(e.currentTarget));
    try {
      await api("/api/students", "POST", b);
      await onSaved();
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="app-form" onSubmit={submit}>
      <div className="form-row">
        <label>
          Full name <span>*</span>
          <input name="name" required minLength={2} maxLength={120} placeholder="e.g. Muhammad Bilal Khan" />
        </label>
        <label>
          Student email <span>*</span>
          <input name="email" type="email" required maxLength={180} placeholder="bilal.khan@students.au.edu.pk" />
        </label>
      </div>
      <div className="form-row">
        <label>
          Degree Program
          <select name="course">
            {COURSES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label>
          Academic year
          <select name="year" defaultValue="2">
            {[1, 2, 3, 4].map((n) => (
              <option key={n} value={n}>
                Year {n} ({n === 2 ? "3rd Semester" : `Year ${n}`})
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="form-divider">Academic &amp; engagement indicators</div>
      <div className="form-row three">
        <label>
          Engagement (%)
          <input name="engagement" type="number" min="0" max="100" defaultValue="85" required />
        </label>
        <label>
          Quiz average (%)
          <input name="quizScore" type="number" min="0" max="100" defaultValue="78" required />
        </label>
        <label>
          Attendance (%)
          <input name="attendance" type="number" min="0" max="100" defaultValue="90" required />
        </label>
      </div>
      <div className="form-row">
        <label>
          Late submissions
          <input name="lateSubmissions" type="number" min="0" max="20" defaultValue="0" required />
        </label>
        <label>
          Missed assessments
          <input name="missedAssessments" type="number" min="0" max="20" defaultValue="0" required />
        </label>
      </div>
      <p className="form-hint">
        <ShieldCheck size={14} />
        The student’s risk score, SHAP explanation, and per-subject records are generated automatically.
      </p>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="form-footer">
        <button type="button" className="button secondary" onClick={onClose}>
          Cancel
        </button>
        <button className="button primary" disabled={busy}>
          {busy ? (
            <Busy />
          ) : (
            <>
              <UserPlus size={15} />
              Add student
            </>
          )}
        </button>
      </div>
    </form>
  );
}

export function UserForm({ onSaved, onClose }: Props) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [role, setRole] = useState("teacher");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("/api/users", "POST", Object.fromEntries(new FormData(e.currentTarget)));
      await onSaved();
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="app-form" onSubmit={submit}>
      <label>
        Full name
        <input name="name" required minLength={2} maxLength={120} placeholder="e.g. Dr. Ayesha Siddiqa" />
      </label>
      <label>
        Air University email
        <input name="email" type="email" required maxLength={180} placeholder="ayesha.siddiqa@au.edu.pk" />
      </label>
      <label>
        Portal role
        <select name="role" value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="teacher">Teacher / Faculty Advisor</option>
          <option value="admin">Administrator</option>
        </select>
      </label>
      {role === "teacher" && (
        <label>
          Assigned program
          <select name="course">
            {COURSES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
      )}
      <div className="form-callout">
        <ShieldCheck size={19} />
        <p>Adds a faculty or administrator account to the Air University portal directory.</p>
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="form-footer">
        <button type="button" className="button secondary" onClick={onClose}>
          Cancel
        </button>
        <button className="button primary" disabled={busy}>
          {busy ? (
            <Busy />
          ) : (
            <>
              <UserPlus size={15} />
              Add faculty member
            </>
          )}
        </button>
      </div>
    </form>
  );
}
