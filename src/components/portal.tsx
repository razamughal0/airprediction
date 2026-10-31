"use client";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Bell,
  BookOpen,
  Building2,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  ChevronsUpDown,
  CircleHelp,
  Download,
  GraduationCap,
  HeartHandshake,
  KeyRound,
  Layers,
  LayoutDashboard,
  Leaf,
  LoaderCircle,
  LogIn,
  Menu,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
  UsersRound,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  Brand,
  Avatar,
  Modal,
  CrBadge,
  AirLogoMark,
  api,
  authHeaders,
  bumpAuthEpoch,
  getAuthEpoch,
  getCachedWorkspace,
  getSessionToken,
  setCachedWorkspace,
  setSessionToken,
  Busy,
} from "./ui";
import { EngagementChart, RiskDonut, Sparkline } from "./charts";
import { StudentTable, exportStudents } from "./student-table";
import { StudentDetail } from "./student-detail";
import { InterventionForm, StudentForm, UserForm } from "./forms";
import {
  AcademicRecord,
  InsightsPanel,
  InterventionPanel,
  ResourcesPanel,
  RESOURCE_GUIDES,
  SettingsPanel,
  StudentOverview,
  TeamPanel,
  TimetablePanel,
} from "./workspace-panels";
import { AcademicsAndGpaPanel, CoursesAndCrPanel, DigitalCampusPanel } from "./ecosystem-panels";
import { type Workspace, type View, type Role, type Student, getStudentBadge } from "@/lib/types";
import { AIR_FACULTY } from "@/lib/air-university";
import Assistant from "./assistant";

type NavItem = { id: View; label: string; icon: LucideIcon; badge?: number };
type Dialog = "intervention" | "student" | "invite" | "help" | "model" | "login" | null;

export const ROUTES: Record<View, string> = {
  overview: "/",
  students: "/students",
  timetable: "/timetable",
  courses: "/courses",
  academics: "/academics",
  campus: "/campus",
  interventions: "/interventions",
  insights: "/insights",
  users: "/users",
  settings: "/settings",
  records: "/records",
  resources: "/resources",
};

const VIEW_TITLES: Record<View, { title: string; description: string; label: string }> = {
  overview: {
    title: "Student success, in focus.",
    description: "Air University Academic Intelligence & Management Ecosystem — 60 Active Students across BSAI, BSCS & BSDS.",
    label: "Overview",
  },
  students: {
    title: "Every student has a story.",
    description: "60 Active Demo Students (20 BSAI, 20 BSCS, 20 BSDS) with GPA/CGPA, SHAP risk explanations & subject records.",
    label: "Students",
  },
  timetable: {
    title: "Fixed Two-Session Weekly Timetable.",
    description: "50 conflict-free weekly classes across BSAI, BSCS, and BSDS — Session 1 (08:40–11:40) & Session 2 (11:40–02:40) Mon–Fri.",
    label: "Timetable",
  },
  courses: {
    title: "Courses, Faculty Workload & CR Management.",
    description: "Departments, degree programs, semester course catalog, cross-department teacher workloads, and Section CRs.",
    label: "Courses & CRs",
  },
  academics: {
    title: "GPA Engine, Backlogs & Dropped Courses.",
    description: "4.00 credit-hour weighted GPA/CGPA engine, backlog tracking, separate course withdrawals, and early-warning triggers.",
    label: "GPA & Backlogs",
  },
  campus: {
    title: "3D Digital Campus & Classroom Allocation.",
    description: "Interactive 3D isometric map of Air University academic blocks, laboratories, library, and live session occupancy.",
    label: "3D Campus",
  },
  interventions: {
    title: "Turn care into action.",
    description: "Advisor check-ins, lab recovery plans, and academic mentorship.",
    label: "Interventions",
  },
  insights: {
    title: "Understand the why.",
    description: "University-wide analytics, SHAP feature attributions, GPA averages, and pass/backlog ratios from PostgreSQL.",
    label: "Insights & analytics",
  },
  users: {
    title: "Faculty, Advisors & Roles.",
    description: "Cross-department teachers (Ahmed Khan, Sara Ahmed, Usman Ali, Dr. Humaira), CRs, and role permissions.",
    label: "Faculty & roles",
  },
  settings: {
    title: "Make yourself at home.",
    description: "Manage your Air University portal profile and notification preferences.",
    label: "Settings",
  },
  records: {
    title: "Your effort, in perspective.",
    description: "Your overall GPA/CGPA standing and per-subject attendance, quiz, midterm, final, and teacher records.",
    label: "Academic record",
  },
  resources: {
    title: "A little guidance goes a long way.",
    description: "Study guides, advisory information, and academic support resources.",
    label: "Resources",
  },
};

const QUICK_ACCOUNTS: {
  role: Role;
  name: string;
  identifier: string;
  password: string;
  subtitle: string;
  badge?: string;
}[] = [
  {
    role: "student",
    name: "Raza Mughal",
    identifier: "raza.student@demo.edu",
    password: "Student@123",
    subtitle: "AU-BSAI-24001 · BSAI Sem 3 (Primary Demo Student)",
    badge: "Primary Demo",
  },
  {
    role: "student",
    name: "Abdul Hadi",
    identifier: "abdul.hadi@students.au.edu.pk",
    password: "Student@123",
    subtitle: "AU-BSAI-24002 · BSAI Sem 3 (BSAI-S3-A)",
    badge: "CR · BSAI-S3-A",
  },
  {
    role: "student",
    name: "Farooq Ahmed",
    identifier: "farooq.ahmed@students.au.edu.pk",
    password: "Student@123",
    subtitle: "AU-BSAI-24013 · BSAI Sem 1 (BSAI-S1-A)",
    badge: "CR · BSAI-S1-A",
  },
  {
    role: "student",
    name: "Ali Hassan",
    identifier: "ali.hassan@students.au.edu.pk",
    password: "Student@123",
    subtitle: "AU-BSCS-24021 · BSCS Sem 3 (BSCS-S3-A)",
    badge: "CR · BSCS-S3-A",
  },
  {
    role: "student",
    name: "Rehan Ahmed",
    identifier: "rehan.ahmed@students.au.edu.pk",
    password: "Student@123",
    subtitle: "AU-BSDS-24041 · BSDS Sem 3 (BSDS-S3-A)",
    badge: "CR · BSDS-S3-A",
  },
  {
    role: "teacher",
    name: "Ahmed Khan",
    identifier: "ahmed.teacher@demo.edu",
    password: "Teacher@123",
    subtitle: "Primary Demo Teacher · BSAI, BSCS, BSDS (OOP, PF, DS Prog)",
    badge: "Primary Demo",
  },
  {
    role: "teacher",
    name: "Sara Ahmed",
    identifier: "sara.teacher@demo.edu",
    password: "Teacher@123",
    subtitle: "BSAI Linear Algebra · BSCS Discrete · BSDS Prob & Stats",
  },
  {
    role: "teacher",
    name: "Usman Ali",
    identifier: "usman.teacher@demo.edu",
    password: "Teacher@123",
    subtitle: "BSAI Data Structures · BSCS DB Systems · BSDS DB Mgmt",
  },
  {
    role: "teacher",
    name: "Dr. Humaira",
    identifier: "humaira@au.edu.pk",
    password: "Teacher@123",
    subtitle: "Class Advisor BSAI · AI232 Intro to AI & AI105",
    badge: "Advisor · BSAI",
  },
  {
    role: "admin",
    name: "System Administrator",
    identifier: "admin@demo.edu",
    password: "Admin@123",
    subtitle: "Complete University Access · 60 Students · 10 Teachers · 50 Sessions",
    badge: "Primary Admin",
  },
];

export default function Portal({
  initialView = "overview",
  openLoginOnMount = false,
}: {
  initialView?: View;
  openLoginOnMount?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [data, setData] = useState<Workspace | null>(() => getCachedWorkspace());
  const [loadError, setLoadError] = useState("");
  const [view, setView] = useState<View>(initialView);
  const [dialog, setDialog] = useState<Dialog>(openLoginOnMount ? "login" : null);
  const [selected, setSelected] = useState<Student | null>(null);
  const [interventionStudent, setInterventionStudent] = useState<Student | null>(null);
  const [riskFilter, setRiskFilter] = useState("all");
  const [roleMenu, setRoleMenu] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [notifications, setNotifications] = useState(false);
  const [hasUnread, setHasUnread] = useState(true);
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [guide, setGuide] = useState<number | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const role = data?.user.role || "admin";

  const applyWorkspace = useCallback((ws: Workspace) => {
    setCachedWorkspace(ws);
    setData(ws);
    setLoadError("");
  }, []);

  const reload = useCallback(async () => {
    const epochAtStart = getAuthEpoch();
    const response = await fetch("/api/workspace", {
      cache: "no-store",
      credentials: "include",
      headers: authHeaders(),
    });
    const result = (await response.json()) as Workspace & { error?: string };
    if (!response.ok) throw new Error(result.error || "Your workspace could not be loaded.");

    // Ignore stale responses that started before a login, role switch, or logout
    if (epochAtStart !== getAuthEpoch()) {
      return;
    }

    // Never allow a background fetch to overwrite an active authenticated session with authenticated: false
    const cached = getCachedWorkspace();
    if (result.authenticated === false && (cached?.authenticated === true || Boolean(getSessionToken()))) {
      return;
    }

    setCachedWorkspace(result);
    setData(result);
    setLoadError("");
  }, []);

  useEffect(() => {
    setView(initialView);
  }, [initialView]);
  useEffect(() => {
    reload().catch((err) => setLoadError(err.message));
  }, [reload]);
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(""), 4800);
      return () => clearTimeout(t);
    }
  }, [toast]);
  useEffect(() => {
    try {
      setHasUnread(localStorage.getItem(`uplift-read-${role}`) !== "yes");
    } catch {
      /* optional local preference */
    }
  }, [role]);
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === "Escape") {
        setSearchOpen(false);
        setRoleMenu(false);
        setNotifications(false);
        setMobileMenu(false);
        if (!dialog) setSelected(null);
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [dialog]);

  useEffect(() => {
    if (!data || data.authenticated === false) return;
    const blockedForStudent = data.user.role === "student" && ["students", "users", "insights"].includes(view);
    const blockedForTeacher = data.user.role === "teacher" && ["records"].includes(view);
    if (blockedForStudent || blockedForTeacher) {
      setView("overview");
      if (typeof window !== "undefined" && window.location.pathname !== "/") {
        window.history.replaceState(null, "", "/");
      }
    }
  }, [data, view]);

  async function handleLogout() {
    setSwitching(true);
    try {
      bumpAuthEpoch();
      setSessionToken(null);
      setCachedWorkspace(null);
      const res = await api<{ ok: boolean; workspace?: Workspace }>("/api/session", "POST", { action: "logout" });
      setSessionToken(null);
      if (res.workspace) {
        setCachedWorkspace(res.workspace);
        setData(res.workspace);
      } else {
        await reload();
      }
      setSelected(null);
      setDialog(null);
      setRoleMenu(false);
    } finally {
      setSwitching(false);
    }
  }

  function navigate(next: View) {
    setView(next);
    setMobileMenu(false);
    setSearchOpen(false);
    setNotifications(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (typeof window !== "undefined" && window.location.pathname !== ROUTES[next]) {
      window.history.pushState(null, "", ROUTES[next]);
    }
  }
  function showStudents(filter = "all") {
    setRiskFilter(filter);
    navigate("students");
  }
  function newIntervention(student?: Student) {
    setInterventionStudent(student || null);
    setDialog("intervention");
  }

  async function switchRole(next: Role, identifier?: string) {
    setSwitching(true);
    try {
      const res = await api<{ ok: boolean; token?: string; workspace?: Workspace }>("/api/session", "POST", {
        role: next,
        ...(identifier ? { identifier } : {}),
      });
      if (res.token) setSessionToken(res.token);
      if (res.workspace) applyWorkspace(res.workspace);
      else await reload();
      setSelected(null);
      setDialog(null);
      setRoleMenu(false);
      setSearch("");
      navigate("overview");
      setToast(`Signed in to the ${next === "admin" ? "administrator" : next} workspace.`);
    } catch (error) {
      setToast((error as Error).message);
    } finally {
      setSwitching(false);
    }
  }

  async function updateStatus(id: number, status: string) {
    try {
      await api("/api/interventions", "PATCH", { id, status });
      await reload();
      setToast(status === "completed" ? "One small step forward. Plan marked complete." : "Support plan is now in progress.");
    } catch (error) {
      setToast((error as Error).message);
    }
  }

  function download() {
    if (data) {
      exportStudents(data.students);
      setToast("Your Air University student report is ready. Exported as CSV.");
    }
  }

  const nav: NavItem[] =
    role === "student"
      ? [
          { id: "overview", label: "My overview", icon: LayoutDashboard },
          { id: "records", label: "Academic record", icon: BookOpen },
          { id: "timetable", label: "Class timetable", icon: CalendarDays },
          { id: "academics", label: "GPA & backlogs", icon: GraduationCap },
          { id: "courses", label: "CR & requests", icon: Layers },
          { id: "campus", label: "3D campus map", icon: Building2 },
          { id: "interventions", label: "My support plan", icon: HeartHandshake },
          { id: "resources", label: "Resources", icon: Sparkles },
        ]
      : [
          { id: "overview", label: "Overview", icon: LayoutDashboard },
          { id: "students", label: "Students", icon: Users, badge: data?.stats.high },
          { id: "timetable", label: "Weekly timetable", icon: CalendarDays },
          { id: "courses", label: "Courses & CRs", icon: Layers },
          { id: "academics", label: "GPA & backlogs", icon: GraduationCap },
          { id: "campus", label: "3D campus map", icon: Building2 },
          { id: "interventions", label: "Interventions", icon: HeartHandshake },
          { id: "insights", label: "Insights & analytics", icon: Activity },
        ];

  const found =
    data?.students
      .filter((s) => (s.name + s.studentId + s.email + s.course + s.sectionCode).toLowerCase().includes(search.toLowerCase()))
      .slice(0, 6) || [];
  const firstName = data?.user.name.replace(/^(Dr\.|Prof\.|Engr\.)\s+/i, "").split(" ")[0] || "Raza";
  const title =
    role === "student" && view === "overview"
      ? {
          title: `You’ve got this, ${firstName}.`,
          description: "Your Air University academic record, GPA/CGPA, subject performance, and advisor support plan.",
          label: "My overview",
        }
      : VIEW_TITLES[view];

  const roleSwitcherOptions: { key: Role; title: string; description: string; icon: LucideIcon }[] = [
    { key: "admin", title: "Administrator", description: "The whole student success picture", icon: ShieldCheck },
    { key: "teacher", title: "Teacher / advisor", description: "Your courses. Your students.", icon: BookOpen },
    { key: "student", title: "Student", description: "Your record. Your way forward.", icon: GraduationCap },
  ];

  const loggedInFaculty =
    role === "teacher" ? AIR_FACULTY.find((f) => f.email.toLowerCase() === data?.user.email.toLowerCase()) ?? AIR_FACULTY[0] : null;
  const loggedInStudentBadge = role === "student" && data?.students[0] ? getStudentBadge(data.students[0]) : null;

  // Full-Screen Login Gate: When no user is signed in yet, require authentication first instead of opening Admin automatically.
  if (data && data.authenticated === false) {
    return (
      <div className="login-gate-screen" style={{ minHeight: "100dvh", display: "grid", placeItems: "center", padding: "24px 16px", background: "linear-gradient(145deg, #0b1f33 0%, #16382c 60%, #1b4135 100%)" }}>
        <div className="panel" style={{ width: "100%", maxWidth: 680, borderRadius: 16, overflow: "hidden", boxShadow: "0 24px 80px rgba(0,0,0,0.45)", border: "1px solid rgba(125,211,252,0.22)" }}>
          <div style={{ padding: "22px 26px 14px", borderBottom: "1px solid #e7ece0", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div>
              <span className="eyebrow">AIR UNIVERSITY ISLAMABAD · ACADEMIC INTELLIGENCE PORTAL</span>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: "#1d3828", marginTop: 4 }}>Sign In to Your Air University Account</h1>
              <p style={{ fontSize: 11.5, color: "#6e8064", marginTop: 3 }}>
                Select Student, Teacher, or Administrator. Entering a Student ID or Email opens only that student’s personal record.
              </p>
            </div>
            <Brand compact />
          </div>
          <LoginModalContent
            isGate
            directory={data.loginDirectory}
            onSuccess={async (msg, ws) => {
              if (ws) applyWorkspace(ws);
              else await reload();
              setSelected(null);
              setDialog(null);
              navigate("overview");
              setToast(msg);
            }}
            onClose={() => {}}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      {mobileMenu && <div className="sidebar-mask" onClick={() => setMobileMenu(false)} />}
      <aside className={`sidebar ${mobileMenu ? "mobile-open" : ""}`}>
        <div className="sidebar-brand">
          <Brand />
          <span className="brand-tagline">Air University Academic Intelligence &amp; Management Ecosystem</span>
        </div>
        <div className="workspace-name">
          <span className="university-mark">
            <AirLogoMark size={26} />
          </span>
          <div>
            <strong>Air University (AU)</strong>
            <span>BSAI · BSCS · BSDS (60 Students)</span>
          </div>
          <span className="workspace-dot" />
        </div>
        <div className="nav-section-label">{role === "student" ? "STUDENT PORTAL" : "ACADEMIC ECOSYSTEM"}</div>
        <nav className="main-nav">
          {nav.map((n) => (
            <button
              key={n.id}
              className={view === n.id ? "active" : ""}
              onClick={() => {
                if (n.id === "students") setRiskFilter("all");
                navigate(n.id);
              }}
            >
              <n.icon size={18} strokeWidth={1.65} />
              <span>{n.label}</span>
              {n.badge ? <span className="nav-count">{n.badge}</span> : null}
            </button>
          ))}
        </nav>
        <div className="nav-section-label second">{role === "student" ? "ACCOUNT" : "FACULTY & ADMIN"}</div>
        <nav className="main-nav">
          {role !== "student" && (
            <button className={view === "users" ? "active" : ""} onClick={() => navigate("users")}>
              <UsersRound size={18} strokeWidth={1.65} />
              <span>Users &amp; roles</span>
            </button>
          )}
          <button className={view === "settings" ? "active" : ""} onClick={() => navigate("settings")}>
            <Settings size={18} strokeWidth={1.65} />
            <span>Settings</span>
          </button>
          <button onClick={() => setDialog("login")}>
            <KeyRound size={18} strokeWidth={1.65} />
            <span>Switch Account</span>
          </button>
          <button onClick={handleLogout}>
            <LogIn size={18} strokeWidth={1.65} />
            <span>Sign Out</span>
          </button>
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <svg className="plant-drawing" viewBox="0 0 100 78" fill="none">
              <path
                d="M43 75c-1-33 10-52 30-67M47 52C17 47 17 27 24 27c19-1 23 25 23 25Zm8-17C42 12 51 2 58 6c12 8-3 29-3 29Zm7-13C76 3 89 8 85 17c-4 11-23 5-23 5Zm-13 24c25-24 39-11 29-2-10 10-29 2-29 2Z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="sidebar-note-label">50 WEEKLY CLASSES</span>
            <h3>Fixed 2-Session Schedule.</h3>
            <p>
              08:40–11:40 &amp; 11:40–02:40
              <br />
              BSAI · BSCS · BSDS (Mon–Fri)
            </p>
            <button onClick={() => navigate("timetable")}>
              View master schedule <ArrowUpRight size={14} />
            </button>
          </div>
          <button className="help-link" onClick={() => setDialog("help")}>
            <CircleHelp size={17} />
            Help &amp; portal guide
            <ArrowUpRight size={14} />
          </button>
          <div className="sidebar-profile-wrap">
            {roleMenu && (
              <div className="role-menu">
                <div className="role-menu-header">
                  <span className="eyebrow">AIR UNIVERSITY PORTAL</span>
                  <strong>Switch portal perspective</strong>
                  <p>Select a role (Raza Mughal, Ahmed Khan, System Administrator) or open full login.</p>
                </div>
                {roleSwitcherOptions.map((r) => (
                  <button key={r.key} onClick={() => switchRole(r.key)} disabled={switching}>
                    <span className={`role-option-icon ${role === r.key ? "selected" : ""}`}>
                      <r.icon size={19} />
                    </span>
                    <span>
                      <strong>{r.title}</strong>
                      <small>{r.description}</small>
                    </span>
                    {role === r.key && <Check size={16} />}
                  </button>
                ))}
                <div className="role-menu-quick">
                  <button
                    className="quick-login-trigger"
                    onClick={() => {
                      setRoleMenu(false);
                      setDialog("login");
                    }}
                  >
                    <LogIn size={14} />
                    Sign in with Email / Password (Raza, Ahmed, Admin…)
                  </button>
                </div>
                <div className="role-menu-foot">
                  <ShieldCheck size={12} />
                  Air University Role-Based Access Control
                </div>
              </div>
            )}
            <button
              className={`sidebar-profile ${roleMenu ? "open" : ""}`}
              onClick={() => setRoleMenu(!roleMenu)}
              aria-label="Switch demo workspace role"
              aria-expanded={roleMenu}
            >
              <Avatar name={data?.user.name || "System Administrator"} color="blue" />
              <span>
                <strong>{data?.user.name || "System Administrator"}</strong>
                <small>
                  {role === "admin" ? "Administrator" : role === "teacher" ? "Faculty / Teacher" : "Student"}
                  <i>{loggedInStudentBadge || "AU"}</i>
                </small>
              </span>
              {switching ? <LoaderCircle size={15} className="spin" /> : <ChevronsUpDown size={15} />}
            </button>
          </div>
        </div>
      </aside>
      <div className="main-workspace">
        <header className="topbar">
          <div className="breadcrumb">
            <button className="icon-button mobile-toggle" aria-label="Open navigation" onClick={() => setMobileMenu(true)}>
              <Menu size={21} />
            </button>
            <span className="breadcrumb-home">Air University</span>
            <ChevronRight size={13} />
            <strong>{title.label}</strong>
          </div>
          <div className="topbar-actions">
            <div
              className="global-search"
              onBlur={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget)) setSearchOpen(false);
              }}
            >
              <Search size={16} />
              <input
                ref={searchRef}
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setSearchOpen(true);
                }}
                onFocus={() => setSearchOpen(true)}
                placeholder={role === "student" ? "Find your record…" : "Search Raza Mughal, Abdul Hadi, BSAI…"}
                aria-label="Search all accessible students"
              />
              <kbd>⌘ K</kbd>
              {searchOpen && data && (
                <div className="search-popover">
                  <span className="eyebrow">{search ? "SEARCH RESULTS" : "QUICK STUDENT LOOKUP"}</span>
                  {found.length ? (
                    found.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => {
                          setSelected(s);
                          setSearchOpen(false);
                          setSearch("");
                        }}
                      >
                        <Avatar name={s.name} color={s.avatarColor} small />
                        <span>
                          <strong>
                            {s.name} <CrBadge label={getStudentBadge(s)} />
                          </strong>
                          <small>
                            {s.studentId} · {s.course} ({s.sectionCode})
                          </small>
                        </span>
                        <ArrowUpRight size={15} />
                      </button>
                    ))
                  ) : (
                    <p>No matching students. Try another name or Registration ID.</p>
                  )}
                </div>
              )}
            </div>
            <span className="topbar-divider" />
            <span className="semester-label">
              <span className="status-live-dot" />
              Spring 2026 · 60 Students
              <span className="week-label">50 Classes/Wk</span>
            </span>
            <button className="button secondary small-button" onClick={() => setDialog("login")}>
              <LogIn size={13} />
              {data ? `${data.user.name.split(" ")[0]} (${role.toUpperCase()})` : "Sign In"}
            </button>
            <div className="notification-wrap">
              <button
                className={`icon-button notification-button ${notifications ? "pressed" : ""}`}
                aria-label="View notifications"
                onClick={() => setNotifications(!notifications)}
              >
                <Bell size={19} />
                {hasUnread && data?.user.notificationsEnabled && <i />}
              </button>
              {notifications && (
                <div className="notification-popover">
                  <div>
                    <h3>Advisory alerts</h3>
                    <button
                      className="text-button"
                      onClick={() => {
                        setHasUnread(false);
                        try {
                          localStorage.setItem(`uplift-read-${role}`, "yes");
                        } catch {
                          /* optional preference */
                        }
                      }}
                    >
                      Mark all read
                    </button>
                  </div>
                  {!data?.user.notificationsEnabled ? (
                    <p className="notifications-off">Notifications are off. You can change this in Settings.</p>
                  ) : role === "student" ? (
                    <>
                      <p className="notification-greeting">
                        <HeartHandshake size={20} />
                        Your Class Advisor is here to support you.
                      </p>
                      {data?.interventions.slice(0, 3).map((p) => (
                        <button key={p.id} onClick={() => navigate("interventions")}>
                          <span className="notification-dot" />
                          <span>
                            <strong>{p.title}</strong>
                            <small>Advisory support plan</small>
                          </span>
                          <ChevronRight size={14} />
                        </button>
                      ))}
                    </>
                  ) : (
                    data?.students
                      .filter((s) => s.riskScore >= 65)
                      .slice(0, 4)
                      .map((s) => (
                        <button
                          key={s.id}
                          onClick={() => {
                            setSelected(s);
                            setNotifications(false);
                          }}
                        >
                          <Avatar name={s.name} color={s.avatarColor} small />
                          <span>
                            <strong>{s.name} could use a check-in</strong>
                            <small>
                              {s.riskScore}% risk · {s.course} ({s.studentId})
                            </small>
                          </span>
                          <ChevronRight size={14} />
                        </button>
                      ))
                  )}
                </div>
              )}
            </div>
            <button className="topbar-profile" aria-label="Open account settings" onClick={() => navigate("settings")}>
              <Avatar name={data?.user.name || "System Administrator"} color="blue" small />
            </button>
          </div>
        </header>

        <main className={`page-content view-${view}`}>
          <div className="page-heading">
            <div>
              <div className="page-eyebrow">
                <span />
                {role === "student"
                  ? "YOUR JOURNEY, YOUR POTENTIAL"
                  : role === "teacher"
                    ? "YOUR STUDENTS. YOUR IMPACT."
                    : "AIR UNIVERSITY · ACADEMIC INTELLIGENCE & MANAGEMENT ECOSYSTEM"}
              </div>
              <h1>{title.title}</h1>
              <p>{title.description}</p>
            </div>
            <div className="page-actions">
              {role !== "student" && ["overview", "insights"].includes(view) && (
                <button className="button secondary" onClick={download} disabled={!data}>
                  <Download size={15} />
                  Export report
                </button>
              )}
              {role !== "student" && ["overview", "interventions"].includes(view) && (
                <button className="button primary" onClick={() => newIntervention()} disabled={!data}>
                  <Plus size={17} />
                  New intervention
                </button>
              )}
              {role === "admin" && view === "students" && (
                <button className="button primary" onClick={() => setDialog("student")}>
                  <Plus size={16} />
                  Add student
                </button>
              )}
              {role === "teacher" && view === "students" && (
                <button className="button primary" onClick={() => newIntervention()}>
                  <Plus size={16} />
                  New intervention
                </button>
              )}
              {role === "admin" && view === "users" && (
                <button className="button primary" onClick={() => setDialog("invite")}>
                  <Plus size={16} />
                  Add team member
                </button>
              )}
              {role === "student" && view === "overview" && (
                <button className="button secondary" onClick={() => navigate("records")}>
                  <BookOpen size={15} />
                  My academic record <ArrowUpRight size={14} />
                </button>
              )}
            </div>
          </div>

          {loadError ? (
            <section className="panel load-error">
              <Leaf size={35} />
              <h2>Let’s try that again.</h2>
              <p>{loadError}</p>
              <button
                className="button primary"
                onClick={() => {
                  setLoadError("");
                  reload().catch((err) => setLoadError(err.message));
                }}
              >
                Reload workspace
              </button>
            </section>
          ) : !data ? (
            <div className="dashboard-loading" aria-label="Loading your Air University workspace">
              <div className="metrics-grid">
                {[0, 1, 2, 3].map((n) => (
                  <div className="skeleton metric-skeleton" key={n} />
                ))}
              </div>
              <div className="chart-row">
                <div className="skeleton chart-skeleton" />
                <div className="skeleton chart-skeleton" />
              </div>
              <div className="skeleton table-skeleton" />
              <div className="loading-caption">
                <LoaderCircle size={16} className="spin" />
                Loading Air University records…
              </div>
            </div>
          ) : (
            <>
              {view === "overview" && role !== "student" && (
                <>
                  {loggedInFaculty && (
                    <section className="panel faculty-overview-strip">
                      <div className="faculty-strip-left">
                        <Avatar name={loggedInFaculty.name} color="blue" />
                        <div>
                          <span className="eyebrow">{loggedInFaculty.department.toUpperCase()}</span>
                          <h3>
                            {loggedInFaculty.name} — {loggedInFaculty.designation}
                          </h3>
                          <p>
                            Programs: <strong>{loggedInFaculty.programs.join(", ")}</strong> · Office: {loggedInFaculty.officeRoom}
                          </p>
                        </div>
                      </div>
                      <div className="faculty-strip-subjects">
                        {loggedInFaculty.subjects.map((sub) => (
                          <span key={`${sub.section}-${sub.code}`} className="faculty-subject-chip">
                            <strong>{sub.code}</strong> {sub.title} ({sub.program}) · <small>{sub.schedule}</small>
                          </span>
                        ))}
                      </div>
                      <button className="button secondary small-button" onClick={() => navigate("timetable")}>
                        <CalendarDays size={14} />
                        Weekly schedule
                      </button>
                    </section>
                  )}

                  <section className="metrics-grid">
                    <Metric
                      label="Total students"
                      value={data.stats.total.toLocaleString()}
                      icon={Users}
                      tone="sage"
                      variant={0}
                      onClick={() => showStudents()}
                      foot={
                        <>
                          <span className="metric-status">
                            <i />
                            {new Set(data.students.map((s) => s.course)).size} active programs
                          </span>
                          <span>20 BSAI · 20 BSCS · 20 BSDS</span>
                        </>
                      }
                    />
                    <Metric
                      label="At-risk students"
                      value={data.stats.high.toLocaleString()}
                      icon={ShieldCheck}
                      tone="peach"
                      variant={1}
                      onClick={() => showStudents("high")}
                      foot={
                        <>
                          <span className="metric-status peach-text">
                            <ArrowDownRight size={13} />
                            {((data.stats.high / Math.max(data.stats.total, 1)) * 100).toFixed(1)}% of students
                          </span>
                          <span>need a check-in</span>
                        </>
                      }
                    />
                    <Metric
                      label="Active interventions"
                      value={data.stats.active.toLocaleString()}
                      icon={HeartHandshake}
                      tone="lavender"
                      variant={2}
                      onClick={() => navigate("interventions")}
                      foot={
                        <>
                          <span className="metric-status purple-text">
                            {data.interventions.filter((p) => p.status === "in_progress").length} in progress
                          </span>
                          <span>{data.stats.totalCrs || 5} active CRs</span>
                        </>
                      }
                    />
                    <Metric
                      label="Average engagement"
                      value={`${data.stats.engagement}`}
                      suffix="%"
                      icon={Activity}
                      tone="sand"
                      variant={3}
                      onClick={() => navigate("insights")}
                      foot={
                        <>
                          <span className="metric-status">
                            <ArrowUpRight size={13} />
                            {data.stats.weeklyScheduledClasses || 50} weekly classes
                          </span>
                          <span>Avg CGPA {data.stats.avgCgpa || 3.12}</span>
                        </>
                      }
                    />
                  </section>
                  <div className="chart-row">
                    <EngagementChart />
                    <RiskDonut
                      high={data.stats.high}
                      moderate={data.stats.moderate}
                      low={data.stats.low}
                      onFilter={showStudents}
                      onInfo={() => setDialog("model")}
                    />
                  </div>
                  <StudentTable
                    compact
                    students={data.students}
                    role={role}
                    onSelect={setSelected}
                    onIntervention={newIntervention}
                    onViewAll={() => showStudents("all")}
                  />
                  <div className="human-first-banner">
                    <span className="human-first-icon">
                      <Sparkles size={21} />
                    </span>
                    <div>
                      <strong>Fixed 5-Day × 2-Session Schedule &amp; Academic Intelligence Engine</strong>
                      <p>
                        50 weekly scheduled classes (08:40–11:40 &amp; 11:40–02:40 Mon–Fri) · 60 Active Students · 5 Section CRs · 4.00 GPA/CGPA Engine
                      </p>
                    </div>
                    <button className="text-button" onClick={() => navigate("timetable")}>
                      Open master timetable <ArrowRight size={16} />
                    </button>
                    <span className="banner-leaf">
                      <Leaf size={54} strokeWidth={0.8} />
                    </span>
                  </div>
                </>
              )}
              {view === "overview" && role === "student" && (
                <StudentOverview data={data} onRecord={() => setSelected(data.students[0])} onPlan={() => navigate("interventions")} />
              )}
              {view === "students" && role !== "student" && (
                <>
                  <div className="directory-summary">
                    <button className={riskFilter === "all" ? "active" : ""} onClick={() => setRiskFilter("all")}>
                      <Users size={16} />
                      All students <strong>{data.stats.total.toLocaleString()}</strong>
                    </button>
                    <button className={riskFilter === "high" ? "active" : ""} onClick={() => setRiskFilter("high")}>
                      <i className="legend-dot coral" />
                      High risk <strong>{data.stats.high}</strong>
                    </button>
                    <button className={riskFilter === "moderate" ? "active" : ""} onClick={() => setRiskFilter("moderate")}>
                      <i className="legend-dot amber" />
                      Moderate <strong>{data.stats.moderate}</strong>
                    </button>
                    <button className={riskFilter === "low" ? "active" : ""} onClick={() => setRiskFilter("low")}>
                      <i className="legend-dot green" />
                      Low risk <strong>{data.stats.low}</strong>
                    </button>
                  </div>
                  <StudentTable
                    students={data.students}
                    role={role}
                    initialFilter={riskFilter}
                    onSelect={setSelected}
                    onIntervention={newIntervention}
                  />
                </>
              )}
              {view === "timetable" && <TimetablePanel data={data} onReload={reload} onToast={setToast} />}
              {view === "courses" && <CoursesAndCrPanel data={data} onReload={reload} onToast={setToast} />}
              {view === "academics" && <AcademicsAndGpaPanel data={data} onReload={reload} onToast={setToast} />}
              {view === "campus" && <DigitalCampusPanel data={data} />}
              {view === "interventions" && <InterventionPanel data={data} onStatus={updateStatus} onStudent={setSelected} />}
              {view === "insights" && role !== "student" && <InsightsPanel data={data} onAbout={() => setDialog("model")} />}
              {view === "users" && role !== "student" && <TeamPanel data={data} />}
              {view === "settings" && (
                <SettingsPanel
                  key={data.user.id}
                  data={data}
                  onSaved={async () => {
                    await reload();
                    setToast("Your preferences are saved. Make yourself at home.");
                  }}
                />
              )}
              {view === "records" && role === "student" && data.students[0] && (
                <AcademicRecord student={data.students[0]} onExplore={() => setSelected(data.students[0])} />
              )}
              {view === "resources" && <ResourcesPanel onOpen={setGuide} />}
            </>
          )}
          <footer className="page-footer">
            <span>
              <Leaf size={13} />
              Air University (AU) · Academic Intelligence &amp; Management Ecosystem
            </span>
            <button onClick={() => setDialog("model")}>
              <ShieldCheck size={12} />
              SHAP &amp; GPA Engine <i />
              BSAI (20) · BSCS (20) · BSDS (20)
            </button>
          </footer>
        </main>
      </div>

      {selected && data && (
        <StudentDetail
          key={selected.id}
          student={data.students.find((s) => s.id === selected.id) || selected}
          interventions={data.interventions.filter((p) => p.studentId === selected.id)}
          role={role}
          onClose={() => setSelected(null)}
          onIntervention={newIntervention}
        />
      )}

      {dialog === "login" && (
        <Modal
          title="Air University (AIR) Portal Sign In"
          subtitle="Demo Credentials — Student: raza.student@demo.edu (Student@123) · Teacher: ahmed.teacher@demo.edu (Teacher@123) · Admin: admin@demo.edu (Admin@123)."
          onClose={() => setDialog(null)}
          wide
        >
          <LoginModalContent
            currentEmail={data?.user.email}
            directory={data?.loginDirectory}
            onSuccess={async (msg, ws) => {
              if (ws) applyWorkspace(ws);
              else await reload();
              setSelected(null);
              setDialog(null);
              navigate("overview");
              setToast(msg);
            }}
            onClose={() => setDialog(null)}
          />
        </Modal>
      )}

      {dialog === "intervention" && data && role !== "student" && (
        <Modal
          title="Create Academic Intervention"
          subtitle="Schedule an advisory check-in or study plan for an Air University student."
          onClose={() => setDialog(null)}
        >
          <InterventionForm
            students={data.students}
            selected={interventionStudent}
            onClose={() => setDialog(null)}
            onSaved={async () => {
              await reload();
              setToast("A new support plan is ready. That's a step forward.");
            }}
          />
        </Modal>
      )}
      {dialog === "student" && data && (
        <Modal
          title="Enroll Student in AIR Portal"
          subtitle="Add a student to BSAI, BSCS, or BSDS."
          onClose={() => setDialog(null)}
        >
          <StudentForm
            onClose={() => setDialog(null)}
            onSaved={async () => {
              await reload();
              setToast("Student added. Their risk insights and subject records are ready.");
            }}
          />
        </Modal>
      )}
      {dialog === "invite" && data && (
        <Modal
          title="Add Faculty or Administrator"
          subtitle="Add a faculty advisor or administrator to the Air University directory."
          onClose={() => setDialog(null)}
        >
          <UserForm
            onClose={() => setDialog(null)}
            onSaved={async () => {
              await reload();
              setToast("Faculty member added to the Air University portal.");
            }}
          />
        </Modal>
      )}
      {dialog === "help" && (
        <Modal
          title="Air University (AIR) Academic Ecosystem Guide"
          subtitle="Role-based academic tracking for Students, Faculty Advisors, CRs, and Administration."
          onClose={() => setDialog(null)}
        >
          <div className="guide-content">
            {[
              {
                title: "Student Portal (Raza Mughal · raza.student@demo.edu / Student@123)",
                text: "Students see only their own overall record, GPA/CGPA, backlogs, dropped courses, SHAP risk explanation, What-If simulator, and section timetable.",
              },
              {
                title: "Teacher Portal (Ahmed Khan · ahmed.teacher@demo.edu / Teacher@123)",
                text: "Cross-department teachers see their assigned courses across BSAI, BSCS, and BSDS, manage marks/attendance, and monitor at-risk students.",
              },
              {
                title: "Administrator Portal (System Administrator · admin@demo.edu / Admin@123)",
                text: "Complete university-wide access to all 60 students, 10 teachers, 3 programs, 5 sections, 5 CRs, 50 weekly classes, conflict engine, and 3D campus.",
              },
            ].map((s, i) => (
              <div className="guide-step" key={s.title}>
                <span>{i + 1}</span>
                <div>
                  <h3>{s.title}</h3>
                  <p>{s.text}</p>
                </div>
              </div>
            ))}
            <button className="button primary full-width" onClick={() => setDialog(null)}>
              Continue to portal <ArrowRight size={15} />
            </button>
          </div>
        </Modal>
      )}
      {dialog === "model" && (
        <Modal
          title="SHAP & 4.00 GPA Academic Intelligence Engine"
          subtitle="Exact Shapley feature attribution, credit-hour weighted GPA/CGPA, and What-If simulation."
          onClose={() => setDialog(null)}
          wide
        >
          <div className="guide-content">
            <div className="model-modal-banner">
              <Sparkles size={25} />
              <div>
                <strong>AIR University Academic Intelligence Engine · v3.0</strong>
                <p>Exact reference-based Shapley explanations + Credit-Hour Weighted 4.00 GPA/CGPA.</p>
              </div>
            </div>
            <h3>What goes into a student’s risk score &amp; warning level?</h3>
            <p>
              Five actionable academic signals (engagement, quiz performance, attendance, late submissions, missed assessments) combined with
              CGPA, uncleared backlogs, and course withdrawals to classify Low, Medium, High, and Critical Risk.
            </p>
            <div className="risk-bands">
              <span>
                <i className="legend-dot green" />
                <strong>Low risk</strong>Below 40%
              </span>
              <span>
                <i className="legend-dot amber" />
                <strong>Moderate</strong>40–64%
              </span>
              <span>
                <i className="legend-dot coral" />
                <strong>High / Critical</strong>65% and above
              </span>
            </div>
            <h3>How is GPA &amp; CGPA calculated?</h3>
            <p>
              GPA = Sum of (Grade Points × Credit Hours) / Total Credit Hours. Dropped courses (&apos;W&apos;) are tracked in the separate
              Course Withdrawals module and never automatically treated as failed courses.
            </p>
            <div className="research-links">
              <a href="https://analyse.kmi.open.ac.uk/open-dataset" target="_blank" rel="noreferrer">
                OULAD research dataset <ArrowUpRight size={14} />
              </a>
              <a
                href="https://archive.ics.uci.edu/dataset/697/predict+students+dropout+and+academic+success"
                target="_blank"
                rel="noreferrer"
              >
                UCI Student Dropout dataset <ArrowUpRight size={14} />
              </a>
            </div>
          </div>
        </Modal>
      )}
      {guide !== null && (
        <Modal title={RESOURCE_GUIDES[guide].title} subtitle={RESOURCE_GUIDES[guide].text} onClose={() => setGuide(null)}>
          <div className="guide-content">
            {RESOURCE_GUIDES[guide].body.map((text, i) => (
              <div className="guide-step" key={i}>
                <span>{i + 1}</span>
                <p>{text}</p>
              </div>
            ))}
            <button className="button primary full-width" onClick={() => setGuide(null)}>
              Done <Check size={15} />
            </button>
          </div>
        </Modal>
      )}
      <Assistant />
      {toast && (
        <div className="toast" role="status">
          <span>
            <CheckCircle2 size={20} />
          </span>
          <p>{toast}</p>
          <button className="icon-button" onClick={() => setToast("")} aria-label="Dismiss notification">
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}

function LoginModalContent({
  currentEmail,
  directory,
  isGate = false,
  onSuccess,
  onClose,
}: {
  currentEmail?: string;
  directory?: Workspace["loginDirectory"];
  isGate?: boolean;
  onSuccess: (msg: string, ws?: Workspace) => Promise<void>;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<Role>("student");
  const [identifier, setIdentifier] = useState("raza.student@demo.edu");
  const [password, setPassword] = useState("Student@123");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await api<{ ok: boolean; token?: string; user: { name: string; role: string }; workspace?: Workspace }>(
        "/api/session",
        "POST",
        {
          identifier,
          password,
          role: tab,
        },
      );
      if (res.token) setSessionToken(res.token);
      await onSuccess(`Welcome, ${res.user.name} (${res.user.role.toUpperCase()}).`, res.workspace);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function quickPick(acc: (typeof QUICK_ACCOUNTS)[number]) {
    setBusy(true);
    setError("");
    try {
      const res = await api<{ ok: boolean; token?: string; user: { name: string; role: string }; workspace?: Workspace }>(
        "/api/session",
        "POST",
        {
          identifier: acc.identifier,
          password: acc.password,
          role: acc.role,
        },
      );
      if (res.token) setSessionToken(res.token);
      await onSuccess(`Signed in as ${res.user.name} (${res.user.role.toUpperCase()}).`, res.workspace);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const filteredAccounts = QUICK_ACCOUNTS.filter((a) => a.role === tab);

  return (
    <div className="login-modal-wrap">
      <div className="login-brand-banner">
        <AirLogoMark size={48} />
        <div>
          <strong>AIR UNIVERSITY ISLAMABAD — DEMO ECOSYSTEM</strong>
          <p>Role-Based Authentication · Student (Student@123) · Teacher (Teacher@123) · Admin (Admin@123)</p>
        </div>
      </div>

      <div className="segmented-tabs" style={{ marginBottom: 14 }}>
        <button
          type="button"
          className={tab === "student" ? "active" : ""}
          onClick={() => {
            setTab("student");
            setIdentifier("raza.student@demo.edu");
            setPassword("Student@123");
          }}
        >
          <GraduationCap size={14} />
          Student Portal
        </button>
        <button
          type="button"
          className={tab === "teacher" ? "active" : ""}
          onClick={() => {
            setTab("teacher");
            setIdentifier("ahmed.teacher@demo.edu");
            setPassword("Teacher@123");
          }}
        >
          <BookOpen size={14} />
          Teacher / Faculty
        </button>
        <button
          type="button"
          className={tab === "admin" ? "active" : ""}
          onClick={() => {
            setTab("admin");
            setIdentifier("admin@demo.edu");
            setPassword("Admin@123");
          }}
        >
          <ShieldCheck size={14} />
          Administrator
        </button>
      </div>

      <form onSubmit={handleLogin} className="app-form" style={{ padding: "4px 0 12px" }}>
        {tab === "student" && directory?.students && directory.students.length > 0 && (
          <label style={{ marginTop: 0, marginBottom: 10 }}>
            Select from 60 Active Students (or type any Student ID / Email below)
            <select
              aria-label="Choose student account"
              value={
                directory.students.find(
                  (st) =>
                    st.studentId.toLowerCase() === identifier.trim().toLowerCase() ||
                    st.email.toLowerCase() === identifier.trim().toLowerCase(),
                )?.email || ""
              }
              onChange={(e) => {
                if (e.target.value) {
                  setIdentifier(e.target.value);
                  setPassword("Student@123");
                }
              }}
            >
              <option value="">-- Choose a Student or Type Any Email / Reg ID Below --</option>
              {directory.students.map((st) => (
                <option key={st.id} value={st.email}>
                  {st.studentId} — {st.name} ({st.course} · {st.sectionCode}{st.isCr ? " · CR" : ""}) — {st.email}
                </option>
              ))}
            </select>
          </label>
        )}
        {tab === "teacher" && directory?.teachers && directory.teachers.length > 0 && (
          <label style={{ marginTop: 0, marginBottom: 10 }}>
            Select Faculty Account (or type Teacher Email / Employee ID below)
            <select
              aria-label="Choose teacher account"
              value={identifier}
              onChange={(e) => {
                setIdentifier(e.target.value);
                setPassword("Teacher@123");
              }}
            >
              {directory.teachers.map((tc) => (
                <option key={tc.id} value={tc.email}>
                  {tc.name} ({tc.employeeId} · {tc.assignedPrograms.join(", ")}) — {tc.email}
                </option>
              ))}
            </select>
          </label>
        )}
        <div className="form-row">
          <label>
            {tab === "student"
              ? "Student ID or Email (e.g. AU-BSAI-24001, AU-BSAI-24002, raza.student@demo.edu)"
              : tab === "teacher"
                ? "Teacher Email or ID (e.g. ahmed.teacher@demo.edu)"
                : "Administrator Email (admin@demo.edu)"}{" "}
            <span>*</span>
            <input
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder={tab === "student" ? "AU-BSAI-24001 or raza.student@demo.edu" : tab === "teacher" ? "ahmed.teacher@demo.edu" : "admin@demo.edu"}
              required
            />
          </label>
          <label>
            Password <span>*</span>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Student@123" required />
          </label>
        </div>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="form-footer" style={{ marginTop: 12, paddingTop: 12 }}>
          {!isGate && (
            <button type="button" className="button secondary" onClick={onClose}>
              Cancel
            </button>
          )}
          <button type="submit" className="button primary" disabled={busy}>
            {busy ? (
              <Busy label="Signing in…" />
            ) : (
              <>
                <LogIn size={15} />
                Sign In to {tab === "admin" ? "Administrator" : tab === "teacher" ? "Faculty" : "Student"} Portal
              </>
            )}
          </button>
        </div>
      </form>

      <div className="quick-accounts-section">
        <span className="eyebrow">QUICK DEMO SIGN IN ({tab.toUpperCase()})</span>
        <div className="quick-accounts-grid">
          {filteredAccounts.map((acc) => (
            <button
              key={acc.identifier}
              type="button"
              className={`quick-account-card ${currentEmail === acc.identifier ? "current" : ""}`}
              onClick={() => quickPick(acc)}
              disabled={busy}
            >
              <Avatar name={acc.name} color={acc.role === "admin" ? "peach" : acc.role === "teacher" ? "sage" : "blue"} small />
              <div>
                <strong>
                  {acc.name} {acc.badge && <CrBadge label={acc.badge} />}
                </strong>
                <small>{acc.subtitle}</small>
              </div>
              <ArrowUpRight size={14} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  suffix,
  icon: Icon,
  tone,
  variant,
  foot,
  onClick,
}: {
  label: string;
  value: string;
  suffix?: string;
  icon: LucideIcon;
  tone: string;
  variant: number;
  foot: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button className="metric-card" onClick={onClick}>
      <div className="metric-top">
        <span>{label}</span>
        <span className={`metric-icon ${tone}`}>
          <Icon size={19} strokeWidth={1.6} />
        </span>
      </div>
      <div className="metric-value-line">
        <strong className="metric-number">
          {value}
          <small>{suffix}</small>
        </strong>
        <Sparkline variant={variant} color={["#6d9679", "#ce957c", "#a89cb8", "#b5a76d"][variant]} />
      </div>
      <div className="metric-foot">{foot}</div>
    </button>
  );
}
