import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api, API } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import PageHeader from "@/components/PageHeader";
import {
  Upload, Plus, Trash2, FileText, FolderPlus, LinkIcon, BookOpen, FileArchive, GraduationCap, LogOut, ShieldCheck, ScrollText, Sparkles, BarChart2, Edit, LayoutDashboard,
  FolderOpen, UploadCloud, CheckCircle2, Loader2, Database, HardDrive, AlertTriangle
} from "lucide-react";

const TABS = [
  { key: "overview", label: "Dashboard", Icon: LayoutDashboard },
  { key: "notes", label: "Notes", Icon: BookOpen },
  { key: "tutorial", label: "Tutorials", Icon: GraduationCap },
  { key: "pyq", label: "PYQs", Icon: FileText },
  { key: "syllabus", label: "Syllabus", Icon: FileArchive },
  { key: "book", label: "Books", Icon: LinkIcon },
  { key: "manage", label: "Subjects & Modules", Icon: FolderPlus },
  { key: "folder", label: "Folder Upload", Icon: FolderOpen },
  { key: "announcements", label: "Announcements", Icon: ScrollText },
  { key: "homepage", label: "Homepage Hero", Icon: Sparkles },
  { key: "analytics", label: "Analytics", Icon: BarChart2 },
  { key: "storage", label: "Cloud & Storage", Icon: Database }
];

const DIRECT_FILE_SUBJECTS = new Set([
  "Programming for Problem Solving",
  "Workshop Practice",
  "NSS",
  "Engineering Graphics",
]);
const isDirectFilesSubject = (name) =>
  /\b(lab|laboratory)\b/i.test(name || "") || DIRECT_FILE_SUBJECTS.has(name);

export default function Admin() {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState("overview");
  const [subjects, setSubjects] = useState([]);
  const [modules, setModules] = useState([]);
  const [files, setFiles] = useState([]);
  const [resources, setResources] = useState([]);

  const loadAll = async () => {
    const [s1, s2] = await Promise.all([
      api.get("/subjects?semester=1"), api.get("/subjects?semester=2"),
    ]);
    setSubjects([...s1.data, ...s2.data]);
    const f = await api.get("/files");
    setFiles(f.data);
    const r = await api.get("/resources?resource_type=book");
    setResources(r.data);
  };
  useEffect(() => { loadAll(); }, []);

  const loadModules = async (subjectId) => {
    if (!subjectId) return setModules([]);
    const { data } = await api.get(`/subjects/${subjectId}/modules`);
    setModules(data);
  };

  return (
    <div className="page-enter mx-auto max-w-6xl px-6 pt-28 md:pt-32">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-2">
        <PageHeader
          chip="Admin Dashboard"
          title={<>Manage the <span className="text-[#00E5D4]">library</span></>}
          subtitle="Upload files, add subjects & modules, and curate books & subject material."
          testid="admin-header"
        />
        <div className="flex items-center gap-3 shrink-0">
          <div className="chip" data-testid="admin-signed-in-as">
            <ShieldCheck className="w-3 h-3" /> {user?.email || "admin"}
          </div>
          <button
            onClick={logout}
            className="btn-neon"
            style={{ padding: "0.5rem 1rem", fontSize: "0.7rem" }}
            data-testid="admin-logout"
          >
            <LogOut className="w-3.5 h-3.5" /> Sign Out
          </button>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap gap-2">
        {TABS.map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            data-testid={`admin-tab-${key}`}
            className={`px-4 py-2 rounded-full text-sm font-medium tracking-wide transition border inline-flex items-center gap-2 ${
              tab === key
                ? "bg-[#00E5D4]/15 text-[#00E5D4] border-[#00E5D4]/60 shadow-[0_0_20px_rgba(0,229,212,0.25)]"
                : "border-white/10 text-white/60 hover:text-white hover:border-white/25"
            }`}
          >
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        {tab === "overview" && (
          <DashboardOverview />
        )}
        {tab === "notes" && (
          <UploadNotes subjects={subjects} refresh={loadAll} />
        )}
        {tab === "tutorial" && (
          <UploadTutorial subjects={subjects} refresh={loadAll} />
        )}
        {tab === "pyq" && (
          <UploadPYQ subjects={subjects} refresh={loadAll} />
        )}
        {tab === "syllabus" && (
          <UploadSyllabus refresh={loadAll} />
        )}
        {tab === "book" && (
          <>
            <UploadBookFile subjects={subjects} refresh={loadAll} />
            <AddBookLink subjects={subjects} refresh={loadAll} />
          </>
        )}
        {tab === "manage" && (
          <>
            <AddSubject refresh={loadAll} />
            <AddModule subjects={subjects} refresh={loadAll} />
            <SubjectsManager subjects={subjects} refresh={loadAll} onSubject={loadModules} />
          </>
        )}
        {tab === "folder" && (
          <FolderUpload subjects={subjects} refresh={loadAll} />
        )}
        {tab === "announcements" && (
          <ManageAnnouncements />
        )}
        {tab === "homepage" && (
          <ManageHomepage />
        )}
        {tab === "analytics" && (
          <ManageAnalytics />
        )}
        {tab === "storage" && (
          <ManageStorage />
        )}

        {tab !== "overview" && tab !== "book" && tab !== "announcements" && tab !== "homepage" && tab !== "analytics" && tab !== "folder" && tab !== "storage" && (
          <ListFiles files={files} tab={tab} refresh={loadAll} />
        )}
        {tab === "book" && <ListResources resources={resources} refresh={loadAll} />}
      </div>
    </div>
  );
}

function DashboardOverview() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadStats = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/stats");
      setStats(data);
    } catch {
      toast.error("Failed to load dashboard metrics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  if (loading) {
    return (
      <div className="lg:col-span-2 flex flex-col items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-[#00E5D4] border-t-transparent animate-spin rounded-full mb-3" />
        <div className="text-white/60 font-mono text-xs">Accessing BITVERSE Core Analytics...</div>
      </div>
    );
  }

  if (!stats) return <div className="text-white/50 text-sm py-10 text-center lg:col-span-2">Could not retrieve stats.</div>;

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6 lg:col-span-2">
      {/* Overview Stats Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-5 bg-white/[0.02] border border-white/5 rounded-2xl hover:border-[#00E5D4]/20 transition group">
          <div className="text-[10px] font-mono text-white/50 uppercase tracking-widest mb-1">Total Subjects</div>
          <div className="text-3xl font-display font-semibold text-white group-hover:text-[#00E5D4] transition">{stats.subjects}</div>
        </div>
        <div className="p-5 bg-white/[0.02] border border-white/5 rounded-2xl hover:border-[#00E5D4]/20 transition group">
          <div className="text-[10px] font-mono text-white/50 uppercase tracking-widest mb-1">Semesters</div>
          <div className="text-3xl font-display font-semibold text-white group-hover:text-[#00E5D4] transition">{stats.semesters}</div>
        </div>
        <div className="p-5 bg-white/[0.02] border border-white/5 rounded-2xl hover:border-[#00E5D4]/20 transition group">
          <div className="text-[10px] font-mono text-white/50 uppercase tracking-widest mb-1">Total Modules</div>
          <div className="text-3xl font-display font-semibold text-white group-hover:text-[#00E5D4] transition">{stats.modules}</div>
        </div>
        <div className="p-5 bg-white/[0.02] border border-white/5 rounded-2xl hover:border-[#00E5D4]/20 transition group">
          <div className="text-[10px] font-mono text-white/50 uppercase tracking-widest mb-1">PDF Files</div>
          <div className="text-3xl font-display font-semibold text-white group-hover:text-[#00E5D4] transition">{stats.pdf_files}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="p-5 bg-white/[0.02] border border-white/5 rounded-2xl hover:border-[#00E5D4]/20 transition group">
          <div className="text-[10px] font-mono text-white/50 uppercase tracking-widest mb-1">Total Resources</div>
          <div className="text-2xl font-display font-semibold text-[#00E5D4]">{stats.resources}</div>
        </div>
        <div className="p-5 bg-white/[0.02] border border-white/5 rounded-2xl hover:border-[#00E5D4]/20 transition group">
          <div className="text-[10px] font-mono text-white/50 uppercase tracking-widest mb-1">Storage Used</div>
          <div className="text-2xl font-display font-semibold text-[#00E5D4]">{formatBytes(stats.storage_bytes)}</div>
        </div>
        <div className="p-5 bg-white/[0.02] border border-white/5 rounded-2xl hover:border-[#00E5D4]/20 transition group col-span-2 md:col-span-1">
          <div className="text-[10px] font-mono text-white/50 uppercase tracking-widest mb-1">Website Status</div>
          <div className="flex items-center gap-2 mt-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span className="text-xs font-semibold text-white uppercase tracking-wider">{stats.website_status?.server || "ONLINE"}</span>
            <span className="text-[10px] font-mono text-white/40">· {stats.website_status?.uptime || "99.98%"}</span>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Uploads */}
        <div className="card-glass p-6">
          <h4 className="font-display text-sm font-semibold text-white/90 mb-4 inline-flex items-center gap-2">
            <Upload className="w-4 h-4 text-[#00E5D4]" /> Recent Uploads
          </h4>
          <div className="space-y-3">
            {stats.recent_uploads?.map((f) => (
              <div key={f.id} className="flex items-center justify-between gap-3 p-3 bg-white/[0.01] border border-white/5 rounded-xl text-xs">
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-white truncate">{f.display_name}</div>
                  <div className="text-[10px] font-mono text-white/40 truncate">{f.category} · {f.original_filename}</div>
                </div>
                <div className="text-[10px] font-mono text-white/50 shrink-0">
                  {new Date(f.created_at).toLocaleDateString()}
                </div>
              </div>
            ))}
            {(!stats.recent_uploads || stats.recent_uploads.length === 0) && (
              <div className="text-center text-white/40 text-xs py-6">No uploads recorded yet.</div>
            )}
          </div>
        </div>

        {/* Most Downloaded */}
        <div className="card-glass p-6">
          <h4 className="font-display text-sm font-semibold text-white/90 mb-4 inline-flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#00E5D4]" /> Most Downloaded Resources
          </h4>
          <div className="space-y-3">
            {stats.most_downloaded?.map((f) => (
              <div key={f.id} className="flex items-center justify-between gap-3 p-3 bg-white/[0.01] border border-white/5 rounded-xl text-xs">
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-white truncate">{f.display_name}</div>
                  <div className="text-[10px] font-mono text-white/40 truncate">{f.category}</div>
                </div>
                <div className="text-xs font-mono text-[#00E5D4] font-semibold shrink-0">
                  {f.download_count || 0} downloads
                </div>
              </div>
            ))}
            {(!stats.most_downloaded || stats.most_downloaded.length === 0) && (
              <div className="text-center text-white/40 text-xs py-6">No downloads recorded yet.</div>
            )}
          </div>
        </div>
      </div>

      {/* Student Activity Feed */}
      <div className="card-glass p-6">
        <h4 className="font-display text-sm font-semibold text-white/90 mb-4">Recent Student Activity</h4>
        <div className="space-y-3">
          {stats.recent_activity?.map((act, idx) => (
            <div key={act.id || idx} className="flex items-start gap-3 p-3 bg-[#0D1117]/30 border border-white/5 rounded-xl text-xs">
              <span className="w-2 h-2 rounded-full bg-[#00E5D4] mt-1.5 shrink-0 animate-ping" />
              <div className="flex-1 min-w-0">
                <div className="text-white/85">{act.description}</div>
                <div className="text-[9px] font-mono text-white/40 mt-1">{new Date(act.time).toLocaleString()}</div>
              </div>
            </div>
          ))}
          {(!stats.recent_activity || stats.recent_activity.length === 0) && (
            <div className="text-center text-white/40 text-xs py-6">No student activity logged.</div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ----- Sub-forms ----- */
function GlassBox({ title, children, testid }) {
  return (
    <div className="card-glass p-6 md:p-8" data-testid={testid}>
      <h3 className="font-display text-lg font-semibold mb-5">{title}</h3>
      {children}
    </div>
  );
}
function Field({ label, children }) {
  return (
    <label className="block mb-4">
      <div className="text-xs font-mono uppercase tracking-widest text-white/60 mb-1.5">{label}</div>
      {children}
    </label>
  );
}
const inp = "w-full px-4 py-2.5 rounded-xl bg-[#0D1117]/70 border border-white/10 text-white text-sm focus:outline-none focus:border-[#00E5D4]/60 focus:ring-2 focus:ring-[#00E5D4]/20";

function UploadNotes({ subjects, refresh }) {
  const [subjectId, setSubjectId] = useState("");
  const [modules, setModules] = useState([]);
  const [loadingModules, setLoadingModules] = useState(false);
  const [moduleId, setModuleId] = useState("");
  const [file, setFile] = useState(null);
  const [fileUrl, setFileUrl] = useState("");
  const [fileSizeStr, setFileSizeStr] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!subjectId) {
      setModules([]);
      setLoadingModules(false);
      return;
    }
    setLoadingModules(true);
    api.get(`/subjects/${subjectId}/modules`)
      .then(({ data }) => setModules(data))
      .catch(() => setModules([]))
      .finally(() => setLoadingModules(false));
  }, [subjectId]);

  const isDirect = subjectId ? (!loadingModules && modules.length === 0) : true;

  const submit = async (e) => {
    e.preventDefault();
    if (!subjectId) return toast.error("Select subject");
    if (!file && !fileUrl) return toast.error("Please upload a file or paste a direct file URL");
    if (!isDirect && !moduleId) return toast.error("Select a module");
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("category", "notes");
      fd.append("subject_id", subjectId);
      if (moduleId && !isDirect) fd.append("module_id", moduleId);
      if (name) fd.append("display_name", name);

      if (file) {
        fd.append("file", file);
      } else {
        fd.append("file_url", fileUrl);
        let bytes = 2147483648; // default 2GB
        if (fileSizeStr) {
          const num = parseFloat(fileSizeStr);
          if (!isNaN(num)) {
            bytes = Math.round(num * 1024 * 1024);
          }
        }
        fd.append("file_size", bytes.toString());
        fd.append("file_mime", "application/pdf");
        fd.append("file_original_name", name ? `${name}.pdf` : "external-resource.pdf");
      }

      await api.post("/upload", fd);
      toast.success("Notes uploaded successfully");
      setFile(null);
      setFileUrl("");
      setFileSizeStr("");
      setName("");
      refresh();
    } catch (e) {
      toast.error(e.response?.data?.detail || e.message || "Upload failed");
    }
    setBusy(false);
  };

  return (
    <GlassBox title="Upload Notes" testid="admin-upload-notes">
      <form onSubmit={submit}>
        <Field label="Subject">
          <select className={inp} value={subjectId} onChange={(e)=>{setSubjectId(e.target.value); setModuleId("");}} data-testid="admin-notes-subject">
            <option value="">Select subject…</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>Sem {s.semester}{s.semester === 1 ? " (C)" : " (P)"} · {s.name}</option>
            ))}
          </select>
        </Field>
        {loadingModules ? (
          <div className="mb-4 text-xs font-mono text-white/50 animate-pulse">Loading modules...</div>
        ) : isDirect ? (
          <div className="mb-4 chip">Direct-file subject (No modules created)</div>
        ) : (
          <Field label="Module">
            <select className={inp} value={moduleId} onChange={(e)=>setModuleId(e.target.value)} data-testid="admin-notes-module">
              <option value="">Select module…</option>
              {modules.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </Field>
        )}
        <Field label="Display Name (optional)">
          <input className={inp} value={name} onChange={(e)=>setName(e.target.value)} placeholder="e.g., Module 1 Notes" data-testid="admin-notes-name" />
        </Field>
        <Field label="File Upload (Max 100MB)">
          <input type="file" onChange={(e)=>setFile(e.target.files?.[0] || null)} className={inp} data-testid="admin-notes-file" accept=".pdf,.ppt,.pptx,.doc,.docx,.png,.jpg,.jpeg" disabled={!!fileUrl} />
        </Field>
        <div className="text-center text-[10px] font-mono text-white/40 my-3">— OR —</div>
        <Field label="Direct File URL (Supports up to 2GB)">
          <input className={inp} value={fileUrl} onChange={(e)=>setFileUrl(e.target.value)} placeholder="e.g., https://drive.google.com/uc?export=download&id=..." disabled={!!file} />
        </Field>
        {fileUrl && (
          <Field label="Estimated File Size in Megabytes (MB) (optional)">
            <input className={inp} type="number" value={fileSizeStr} onChange={(e)=>setFileSizeStr(e.target.value)} placeholder="e.g., 2000 for 2GB" />
          </Field>
        )}
        <button type="submit" className="btn-neon primary w-full mt-2" disabled={busy} data-testid="admin-notes-submit">
          <Upload className="w-4 h-4" /> {busy ? "Uploading…" : "Upload Notes"}
        </button>
      </form>
    </GlassBox>
  );
}

function UploadTutorial({ subjects, refresh }) {
  const [subjectId, setSubjectId] = useState("");
  const [file, setFile] = useState(null);
  const [fileUrl, setFileUrl] = useState("");
  const [fileSizeStr, setFileSizeStr] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!subjectId) return toast.error("Select subject");
    if (!file && !fileUrl) return toast.error("Please upload a file or paste a direct file URL");
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("category", "tutorial");
      fd.append("subject_id", subjectId);
      if (name) fd.append("display_name", name);

      if (file) {
        fd.append("file", file);
      } else {
        fd.append("file_url", fileUrl);
        let bytes = 2147483648; // default 2GB
        if (fileSizeStr) {
          const num = parseFloat(fileSizeStr);
          if (!isNaN(num)) {
            bytes = Math.round(num * 1024 * 1024);
          }
        }
        fd.append("file_size", bytes.toString());
        fd.append("file_mime", "application/pdf");
        fd.append("file_original_name", name ? `${name}.pdf` : "external-tutorial.pdf");
      }

      await api.post("/upload", fd);
      toast.success("Tutorial uploaded successfully");
      setFile(null);
      setFileUrl("");
      setFileSizeStr("");
      setName("");
      refresh();
    } catch (e) {
      toast.error(e.response?.data?.detail || e.message || "Upload failed");
    }
    setBusy(false);
  };

  return (
    <GlassBox title="Upload Tutorial" testid="admin-upload-tutorial">
      <form onSubmit={submit}>
        <Field label="Subject">
          <select className={inp} value={subjectId} onChange={(e)=>setSubjectId(e.target.value)} data-testid="admin-tutorial-subject">
            <option value="">Select subject…</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>Sem {s.semester}{s.semester === 1 ? " (C)" : " (P)"} · {s.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Display Name (optional)">
          <input className={inp} value={name} onChange={(e)=>setName(e.target.value)} placeholder="e.g., Tutorial Sheet 1" data-testid="admin-tutorial-name" />
        </Field>
        <Field label="File Upload (Max 100MB)">
          <input type="file" onChange={(e)=>setFile(e.target.files?.[0] || null)} className={inp} data-testid="admin-tutorial-file" disabled={!!fileUrl} />
        </Field>
        <div className="text-center text-[10px] font-mono text-white/40 my-3">— OR —</div>
        <Field label="Direct File URL (Supports up to 2GB)">
          <input className={inp} value={fileUrl} onChange={(e)=>setFileUrl(e.target.value)} placeholder="e.g., https://drive.google.com/uc?export=download&id=..." disabled={!!file} />
        </Field>
        {fileUrl && (
          <Field label="Estimated File Size in Megabytes (MB) (optional)">
            <input className={inp} type="number" value={fileSizeStr} onChange={(e)=>setFileSizeStr(e.target.value)} placeholder="e.g., 2000 for 2GB" />
          </Field>
        )}
        <button type="submit" className="btn-neon primary w-full mt-2" disabled={busy} data-testid="admin-tutorial-submit">
          <Upload className="w-4 h-4" /> {busy ? "Uploading…" : "Upload Tutorial"}
        </button>
      </form>
    </GlassBox>
  );
}

function UploadPYQ({ subjects, refresh }) {
  const [subjectId, setSubjectId] = useState("");
  const [pyqType, setPyqType] = useState("mid");
  const [file, setFile] = useState(null);
  const [fileUrl, setFileUrl] = useState("");
  const [fileSizeStr, setFileSizeStr] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!subjectId) return toast.error("Select subject");
    if (!file && !fileUrl) return toast.error("Please upload a file or paste a direct file URL");
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("category", "pyq");
      fd.append("subject_id", subjectId);
      fd.append("pyq_type", pyqType);
      if (name) fd.append("display_name", name);

      if (file) {
        fd.append("file", file);
      } else {
        fd.append("file_url", fileUrl);
        let bytes = 2147483648; // default 2GB
        if (fileSizeStr) {
          const num = parseFloat(fileSizeStr);
          if (!isNaN(num)) {
            bytes = Math.round(num * 1024 * 1024);
          }
        }
        fd.append("file_size", bytes.toString());
        fd.append("file_mime", "application/pdf");
        fd.append("file_original_name", name ? `${name}.pdf` : `pyq-${pyqType}.pdf`);
      }

      await api.post("/upload", fd);
      toast.success("PYQ uploaded successfully");
      setFile(null);
      setFileUrl("");
      setFileSizeStr("");
      setName("");
      refresh();
    } catch (e) {
      toast.error(e.response?.data?.detail || e.message || "Upload failed");
    }
    setBusy(false);
  };

  return (
    <GlassBox title="Upload PYQ" testid="admin-upload-pyq">
      <form onSubmit={submit}>
        <Field label="Subject">
          <select className={inp} value={subjectId} onChange={(e)=>setSubjectId(e.target.value)} data-testid="admin-pyq-subject">
            <option value="">Select subject…</option>
            {subjects.map((s) => (<option key={s.id} value={s.id}>Sem {s.semester}{s.semester === 1 ? " (C)" : " (P)"} · {s.name}</option>))}
          </select>
        </Field>
        <Field label="Paper Type">
          <select className={inp} value={pyqType} onChange={(e)=>setPyqType(e.target.value)} data-testid="admin-pyq-type">
            <option value="mid">Mid Semester</option>
            <option value="end">End Semester</option>
            <option value="solution">Solution</option>
          </select>
        </Field>
        <Field label="Display Name (optional)">
          <input className={inp} value={name} onChange={(e)=>setName(e.target.value)} placeholder="e.g., End Sem 2023" data-testid="admin-pyq-name" />
        </Field>
        <Field label="File Upload (Max 100MB)">
          <input type="file" onChange={(e)=>setFile(e.target.files?.[0] || null)} className={inp} data-testid="admin-pyq-file" disabled={!!fileUrl} />
        </Field>
        <div className="text-center text-[10px] font-mono text-white/40 my-3">— OR —</div>
        <Field label="Direct File URL (Supports up to 2GB)">
          <input className={inp} value={fileUrl} onChange={(e)=>setFileUrl(e.target.value)} placeholder="e.g., https://drive.google.com/uc?export=download&id=..." disabled={!!file} />
        </Field>
        {fileUrl && (
          <Field label="Estimated File Size in Megabytes (MB) (optional)">
            <input className={inp} type="number" value={fileSizeStr} onChange={(e)=>setFileSizeStr(e.target.value)} placeholder="e.g., 2000 for 2GB" />
          </Field>
        )}
        <button type="submit" className="btn-neon primary w-full mt-2" disabled={busy} data-testid="admin-pyq-submit">
          <Upload className="w-4 h-4" /> {busy ? "Uploading…" : "Upload PYQ"}
        </button>
      </form>
    </GlassBox>
  );
}

function UploadSyllabus({ refresh }) {
  const [semester, setSemester] = useState(1);
  const [file, setFile] = useState(null);
  const [fileUrl, setFileUrl] = useState("");
  const [fileSizeStr, setFileSizeStr] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!file && !fileUrl) return toast.error("Please upload a file or paste a direct file URL");
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("category", "syllabus");
      fd.append("semester", semester);
      if (name) fd.append("display_name", name);

      if (file) {
        fd.append("file", file);
      } else {
        fd.append("file_url", fileUrl);
        let bytes = 2147483648; // default 2GB
        if (fileSizeStr) {
          const num = parseFloat(fileSizeStr);
          if (!isNaN(num)) {
            bytes = Math.round(num * 1024 * 1024);
          }
        }
        fd.append("file_size", bytes.toString());
        fd.append("file_mime", "application/pdf");
        fd.append("file_original_name", name ? `${name}.pdf` : "semester-syllabus.pdf");
      }

      await api.post("/upload", fd);
      toast.success("Syllabus uploaded successfully");
      setFile(null);
      setFileUrl("");
      setFileSizeStr("");
      setName("");
      refresh();
   } catch (e) {
      toast.error(e.response?.data?.detail || e.message || "Upload failed");
    }
    setBusy(false);
  };

  return (
    <GlassBox title="Upload Syllabus" testid="admin-upload-syllabus">
      <form onSubmit={submit}>
        <Field label="Semester">
          <select className={inp} value={semester} onChange={(e)=>setSemester(+e.target.value)} data-testid="admin-syl-sem">
            <option value={1}>Semester 1 (C)</option>
            <option value={2}>Semester 2 (P)</option>
          </select>
        </Field>
        <Field label="Display Name (optional)">
          <input className={inp} value={name} onChange={(e)=>setName(e.target.value)} data-testid="admin-syl-name" />
        </Field>
        <Field label="File Upload (Max 100MB)">
          <input type="file" onChange={(e)=>setFile(e.target.files?.[0] || null)} className={inp} data-testid="admin-syl-file" disabled={!!fileUrl} />
        </Field>
        <div className="text-center text-[10px] font-mono text-white/40 my-3">— OR —</div>
        <Field label="Direct File URL (Supports up to 2GB)">
          <input className={inp} value={fileUrl} onChange={(e)=>setFileUrl(e.target.value)} placeholder="e.g., https://drive.google.com/uc?export=download&id=..." disabled={!!file} />
        </Field>
        {fileUrl && (
          <Field label="Estimated File Size in Megabytes (MB) (optional)">
            <input className={inp} type="number" value={fileSizeStr} onChange={(e)=>setFileSizeStr(e.target.value)} placeholder="e.g., 2000 for 2GB" />
          </Field>
        )}
        <button type="submit" className="btn-neon primary w-full mt-2" disabled={busy} data-testid="admin-syl-submit">
          <Upload className="w-4 h-4" /> {busy ? "Uploading…" : "Upload Syllabus"}
        </button>
      </form>
    </GlassBox>
  );
}

function UploadBookFile({ subjects, refresh }) {
  const [subjectId, setSubjectId] = useState("");
  const [file, setFile] = useState(null);
  const [fileUrl, setFileUrl] = useState("");
  const [fileSizeStr, setFileSizeStr] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!subjectId) return toast.error("Select subject");
    if (!file && !fileUrl) return toast.error("Please upload a file or paste a direct book URL");
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("category", "book");
      fd.append("subject_id", subjectId);
      if (name) fd.append("display_name", name);

      if (file) {
        fd.append("file", file);
      } else {
        fd.append("file_url", fileUrl);
        let bytes = 2147483648; // default 2GB
        if (fileSizeStr) {
          const num = parseFloat(fileSizeStr);
          if (!isNaN(num)) {
            bytes = Math.round(num * 1024 * 1024);
          }
        }
        fd.append("file_size", bytes.toString());
        fd.append("file_mime", "application/pdf");
        fd.append("file_original_name", name ? `${name}.pdf` : "external-book.pdf");
      }

      await api.post("/upload", fd);
      toast.success("Book uploaded successfully");
      setFile(null);
      setFileUrl("");
      setFileSizeStr("");
      setName("");
      refresh();
    } catch (e) {
      toast.error(e.response?.data?.detail || e.message || "Upload failed");
    }
    setBusy(false);
  };

  return (
    <GlassBox title="Upload Book PDF" testid="admin-upload-book">
      <form onSubmit={submit}>
        <Field label="Subject">
          <select className={inp} value={subjectId} onChange={(e)=>setSubjectId(e.target.value)} data-testid="admin-book-subject">
            <option value="">Select subject…</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>Sem {s.semester}{s.semester === 1 ? " (C)" : " (P)"} · {s.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Book Title (optional)">
          <input className={inp} value={name} onChange={(e)=>setName(e.target.value)} placeholder="e.g., NCERT Chemistry Vol. 1" data-testid="admin-book-name" />
        </Field>
        <Field label="File Upload (Max 100MB)">
          <input type="file" onChange={(e)=>setFile(e.target.files?.[0] || null)} className={inp} data-testid="admin-book-file" disabled={!!fileUrl} />
        </Field>
        <div className="text-center text-[10px] font-mono text-white/40 my-3">— OR —</div>
        <Field label="Direct File URL (Supports up to 2GB)">
          <input className={inp} value={fileUrl} onChange={(e)=>setFileUrl(e.target.value)} placeholder="e.g., https://drive.google.com/uc?export=download&id=..." disabled={!!file} />
        </Field>
        {fileUrl && (
          <Field label="Estimated File Size in Megabytes (MB) (optional)">
            <input className={inp} type="number" value={fileSizeStr} onChange={(e)=>setFileSizeStr(e.target.value)} placeholder="e.g., 2000 for 2GB" />
          </Field>
        )}
        <button type="submit" className="btn-neon primary w-full mt-2" disabled={busy} data-testid="admin-book-submit">
          <Upload className="w-4 h-4" /> {busy ? "Uploading…" : "Upload Book"}
        </button>
      </form>
    </GlassBox>
  );
}

function AddBookLink({ subjects, refresh }) {
  const [subjectId, setSubjectId] = useState("");
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [desc, setDesc] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!subjectId || !title || !url) return toast.error("Subject, title and URL required");
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("title", title);
      fd.append("url", url);
      fd.append("resource_type", "book");
      // Tag with subject id in description prefix for subject-wise grouping on Resources page
      fd.append("description", `[${subjectId}]:: ${desc}`.trim());
      await api.post("/resources", fd);
      toast.success("Book link added");
      setTitle(""); setUrl(""); setDesc("");
      refresh();
    } catch { toast.error("Failed"); }
    setBusy(false);
  };

  return (
    <GlassBox title="Add Book Link" testid="admin-add-book-link">
      <form onSubmit={submit}>
        <Field label="Subject">
          <select className={inp} value={subjectId} onChange={(e)=>setSubjectId(e.target.value)} data-testid="admin-book-link-subject">
            <option value="">Select subject…</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>Sem {s.semester}{s.semester === 1 ? " (C)" : " (P)"} · {s.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Book Title">
          <input className={inp} value={title} onChange={(e)=>setTitle(e.target.value)} placeholder="e.g., HC Verma — Concepts of Physics" data-testid="admin-book-link-title" />
        </Field>
        <Field label="URL">
          <input className={inp} value={url} onChange={(e)=>setUrl(e.target.value)} placeholder="https://…" data-testid="admin-book-link-url" />
        </Field>
        <Field label="Description (optional)">
          <textarea className={inp} value={desc} onChange={(e)=>setDesc(e.target.value)} rows={2} data-testid="admin-book-link-desc" />
        </Field>
        <button type="submit" className="btn-neon primary w-full" disabled={busy} data-testid="admin-book-link-submit">
          <Plus className="w-4 h-4" /> {busy ? "Adding…" : "Add Book Link"}
        </button>
      </form>
    </GlassBox>
  );
}

function AddSubject({ refresh }) {
  const [name, setName] = useState("");
  const [semester, setSemester] = useState(1);
  const [credits, setCredits] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!name) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("name", name);
      fd.append("semester", semester);
      if (credits) fd.append("credits", credits);
      await api.post("/subjects", fd);
      toast.success("Subject added");
      setName(""); setCredits("");
      refresh();
    } catch { toast.error("Failed"); }
    setBusy(false);
  };

  return (
    <GlassBox title="Add Subject" testid="admin-add-subject">
      <form onSubmit={submit}>
        <Field label="Name"><input className={inp} value={name} onChange={(e)=>setName(e.target.value)} data-testid="admin-subject-name" /></Field>
        <Field label="Semester">
          <select className={inp} value={semester} onChange={(e)=>setSemester(+e.target.value)} data-testid="admin-subject-sem">
            <option value={1}>Semester 1 (C)</option>
            <option value={2}>Semester 2 (P)</option>
          </select>
        </Field>
        <Field label="Credits">
          <input className={inp} type="number" step="0.5" value={credits} onChange={(e)=>setCredits(e.target.value)} data-testid="admin-subject-credits" />
        </Field>
        <button type="submit" className="btn-neon primary w-full" disabled={busy} data-testid="admin-subject-submit">
          <Plus className="w-4 h-4" /> Add Subject
        </button>
      </form>
    </GlassBox>
  );
}

function AddModule({ subjects, refresh }) {
  const [subjectId, setSubjectId] = useState("");
  const [modules, setModules] = useState([]);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const loadLocalModules = async (subId) => {
    if (!subId) {
      setModules([]);
      return;
    }
    try {
      const { data } = await api.get(`/subjects/${subId}/modules`);
      setModules(data);
    } catch {
      setModules([]);
    }
  };

  useEffect(() => {
    loadLocalModules(subjectId);
  }, [subjectId]);

  const submit = async (e) => {
    e.preventDefault();
    if (!subjectId || !name) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("subject_id", subjectId);
      fd.append("name", name);
      await api.post("/modules", fd);
      toast.success("Module added");
      setName("");
      loadLocalModules(subjectId);
      refresh();
    } catch { toast.error("Failed"); }
    setBusy(false);
  };

  return (
    <GlassBox title="Add Module" testid="admin-add-module">
      <form onSubmit={submit}>
        <Field label="Subject">
          <select className={inp} value={subjectId} onChange={(e)=>setSubjectId(e.target.value)} data-testid="admin-module-subject">
            <option value="">Select subject…</option>
            {subjects.map((s) => (<option key={s.id} value={s.id}>Sem {s.semester}{s.semester === 1 ? " (C)" : " (P)"} · {s.name}</option>))}
          </select>
        </Field>
        <Field label="Name"><input className={inp} value={name} onChange={(e)=>setName(e.target.value)} placeholder="e.g., Module 6" data-testid="admin-module-name" /></Field>
        <button type="submit" className="btn-neon primary w-full" disabled={busy} data-testid="admin-module-submit">
          <Plus className="w-4 h-4" /> Add Module
        </button>
        {modules.length > 0 && (
          <div className="mt-4 text-xs font-mono text-white/50">Existing: {modules.map(m=>m.name).join(", ")}</div>
        )}
      </form>
    </GlassBox>
  );
}

function FileRow({ f, remove, refresh }) {
  const [replacing, setReplacing] = useState(false);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setReplacing(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      await api.post(`/files/${f.id}/replace`, fd);
      toast.success("File replaced successfully!");
      refresh();
    } catch {
      toast.error("Failed to replace file");
    } finally {
      setReplacing(false);
    }
  };

  return (
    <div key={f.id} className="file-row" data-testid={`admin-file-${f.id}`}>
      <div className="w-9 h-9 rounded-lg bg-[#00E5D4]/10 border border-[#00E5D4]/30 flex items-center justify-center shrink-0">
        <FileText className="w-4 h-4 text-[#00E5D4]" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-white truncate">{f.display_name}</div>
        <div className="text-[10px] font-mono text-white/50 uppercase tracking-widest truncate">{f.category} · {f.original_filename}</div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <a href={`${API}/files/${f.id}/download`} target="_blank" rel="noopener noreferrer" className="text-white/60 hover:text-[#00E5D4] p-2" title="Download" data-testid={`admin-file-download-${f.id}`}>
          <FileText className="w-4 h-4" />
        </a>
        <label className="text-white/60 hover:text-amber-400 p-2 cursor-pointer relative" title="Replace PDF">
          {replacing ? (
            <span className="w-4 h-4 border border-[#00E5D4] border-t-transparent animate-spin rounded-full block" />
          ) : (
            <Upload className="w-4 h-4" />
          )}
          <input type="file" onChange={handleFileChange} className="hidden" accept=".pdf,.ppt,.pptx,.doc,.docx,.png,.jpg,.jpeg" disabled={replacing} />
        </label>
        <button onClick={() => remove(f.id)} className="text-white/60 hover:text-red-400 p-2" title="Delete" data-testid={`admin-file-delete-${f.id}`}>
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function ListFiles({ files, tab, refresh }) {
  const filtered = tab === "manage" ? files : files.filter((f) => f.category === tab);
  const remove = async (id) => {
    if (!window.confirm("Are you sure you want to delete this file?")) return;
    await api.delete(`/files/${id}`);
    toast.success("File removed");
    refresh();
  };
  return (
    <GlassBox title={`Uploaded (${filtered.length})`} testid="admin-file-list">
      <div className="space-y-2 max-h-[560px] overflow-y-auto pr-1">
        {filtered.map((f) => (
          <FileRow key={f.id} f={f} remove={remove} refresh={refresh} />
        ))}
        {filtered.length === 0 && (
          <div className="text-white/50 text-sm text-center py-8">No files yet.</div>
        )}
      </div>
    </GlassBox>
  );
}

function ListResources({ resources, refresh }) {
  const remove = async (id) => {
    if (!window.confirm("Are you sure you want to delete this book link?")) return;
    await api.delete(`/resources/${id}`);
    toast.success("Removed");
    refresh();
  };
  return (
    <GlassBox title={`Book Links (${resources.length})`} testid="admin-resource-list">
      <div className="space-y-2 max-h-[560px] overflow-y-auto pr-1">
        {resources.map((r) => (
          <div key={r.id} className="file-row" data-testid={`admin-resource-${r.id}`}>
            <div className="w-9 h-9 rounded-lg bg-[#00E5D4]/10 border border-[#00E5D4]/30 flex items-center justify-center shrink-0">
              <LinkIcon className="w-4 h-4 text-[#00E5D4]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-white truncate">{r.title}</div>
              <div className="text-[10px] font-mono text-white/50 uppercase tracking-widest truncate">{r.url}</div>
            </div>
            <button onClick={()=>remove(r.id)} className="text-white/60 hover:text-red-400 p-2" data-testid={`admin-resource-delete-${r.id}`}>
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
        {resources.length === 0 && (<div className="text-white/50 text-sm text-center py-8">No book links yet.</div>)}
      </div>
    </GlassBox>
  );
}

function SubjectsManager({ subjects, refresh, onSubject }) {
  const [editingSubject, setEditingSubject] = useState(null);
  const [editName, setEditName] = useState("");
  const [editSem, setEditSem] = useState(1);
  const [editCredits, setEditCredits] = useState("");
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [editingModule, setEditingModule] = useState(null);
  const [editModuleName, setEditModuleName] = useState("");

  const [managerModules, setManagerModules] = useState([]);
  const [newModuleName, setNewModuleName] = useState("");
  const [addingModule, setAddingModule] = useState(false);

  useEffect(() => {
    if (selectedSubjectId) {
      api.get(`/subjects/${selectedSubjectId}/modules`)
        .then(({ data }) => setManagerModules(data))
        .catch(() => setManagerModules([]));
    } else {
      setManagerModules([]);
    }
  }, [selectedSubjectId]);

  const refreshModules = async () => {
    if (!selectedSubjectId) return;
    try {
      const { data } = await api.get(`/subjects/${selectedSubjectId}/modules`);
      setManagerModules(data);
      onSubject(selectedSubjectId);
    } catch {
      toast.error("Failed to refresh modules");
    }
  };

  const startEdit = (s) => {
    setEditingSubject(s.id);
    setEditName(s.name);
    setEditSem(s.semester);
    setEditCredits(s.credits || "");
  };

  const saveSubject = async (e) => {
    e.preventDefault();
    try {
      const fd = new FormData();
      fd.append("name", editName);
      fd.append("semester", editSem);
      fd.append("credits", editCredits);
      await api.patch(`/subjects/${editingSubject}`, fd);
      toast.success("Subject updated");
      setEditingSubject(null);
      refresh();
    } catch {
      toast.error("Failed to update subject");
    }
  };

  const deleteSubject = async (id) => {
    if (!window.confirm("Are you sure you want to delete this subject? This will delete all its modules and files.")) return;
    try {
      await api.delete(`/subjects/${id}`);
      toast.success("Subject deleted");
      refresh();
    } catch {
      toast.error("Failed to delete subject");
    }
  };

  const handleSubjectSelect = (id) => {
    setSelectedSubjectId(id);
    onSubject(id);
  };

  const startEditModule = (m) => {
    setEditingModule(m.id);
    setEditModuleName(m.name);
  };

  const saveModule = async (e) => {
    e.preventDefault();
    try {
      const fd = new FormData();
      fd.append("name", editModuleName);
      await api.patch(`/modules/${editingModule}`, fd);
      toast.success("Module updated");
      setEditingModule(null);
      refreshModules();
    } catch {
      toast.error("Failed to update module");
    }
  };

  const deleteModule = async (id) => {
    if (!window.confirm("Are you sure you want to delete this module? This will delete all its files.")) return;
    try {
      await api.delete(`/modules/${id}`);
      toast.success("Module deleted");
      refreshModules();
    } catch {
      toast.error("Failed to delete module");
    }
  };

  const handleAddModuleInline = async (e) => {
    e.preventDefault();
    if (!newModuleName.trim()) return;
    setAddingModule(true);
    try {
      const fd = new FormData();
      fd.append("subject_id", selectedSubjectId);
      fd.append("name", newModuleName.trim());
      await api.post("/modules", fd);
      toast.success("Module added");
      setNewModuleName("");
      refreshModules();
    } catch {
      toast.error("Failed to add module");
    } finally {
      setAddingModule(false);
    }
  };

  return (
    <div className="space-y-6 lg:col-span-2">
      <GlassBox title="Edit / Delete Subjects" testid="admin-manage-subjects">
        <div className="grid gap-3 sm:grid-cols-2 max-h-[350px] overflow-y-auto pr-1">
          {subjects.map((s) => (
            <div key={s.id} className="p-3.5 bg-[#0D1117]/50 rounded-xl border border-white/5 flex flex-col justify-between gap-3">
              {editingSubject === s.id ? (
                <form onSubmit={saveSubject} className="space-y-2.5 w-full">
                  <input className={inp} value={editName} onChange={(e)=>setEditName(e.target.value)} required />
                  <div className="grid grid-cols-2 gap-2">
                    <select className={inp} value={editSem} onChange={(e)=>setEditSem(+e.target.value)}>
                      <option value={1}>Sem 1</option>
                      <option value={2}>Sem 2</option>
                    </select>
                    <input className={inp} type="number" step="0.5" value={editCredits} onChange={(e)=>setEditCredits(e.target.value)} placeholder="Credits" />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button type="button" onClick={()=>setEditingSubject(null)} className="px-3 py-1.5 text-xs border border-white/10 rounded-lg text-white/60">Cancel</button>
                    <button type="submit" className="px-3 py-1.5 text-xs bg-[#00E5D4]/15 border border-[#00E5D4]/40 text-[#00E5D4] rounded-lg">Save</button>
                  </div>
                </form>
              ) : (
                <div className="flex items-center justify-between gap-2 w-full">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-white truncate">{s.name}</div>
                    <div className="text-[10px] font-mono text-white/50">Sem {s.semester}</div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={()=>handleSubjectSelect(s.id)} className={`px-2 py-1 text-xs rounded-lg border ${selectedSubjectId === s.id ? 'border-[#00E5D4] text-[#00E5D4] bg-[#00E5D4]/10' : 'border-white/10 text-white/60'}`}>Modules</button>
                    <button onClick={()=>startEdit(s)} className="text-white/60 hover:text-amber-400 p-1.5" title="Edit subject name/credits"><Edit className="w-3.5 h-3.5" /></button>
                    <button onClick={()=>deleteSubject(s.id)} className="text-white/60 hover:text-red-400 p-1.5" title="Delete subject"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </GlassBox>

      {selectedSubjectId && (
        <GlassBox title="Edit / Delete Modules" testid="admin-manage-modules">
          <div className="space-y-4">
            {/* Inline Add Module form */}
            <form onSubmit={handleAddModuleInline} className="flex gap-2 items-center bg-[#0D1117]/30 p-2.5 rounded-xl border border-white/5">
              <input 
                className={`${inp} flex-1 !py-1.5 !px-3`} 
                value={newModuleName} 
                onChange={(e) => setNewModuleName(e.target.value)} 
                placeholder="Add new module (e.g., Module 6)" 
                required 
              />
              <button 
                type="submit" 
                className="px-3 py-1.5 bg-[#00E5D4]/15 border border-[#00E5D4]/40 text-[#00E5D4] hover:bg-[#00E5D4]/25 transition rounded-lg text-xs font-semibold flex items-center gap-1 shrink-0 h-[34px]"
                disabled={addingModule}
              >
                <Plus className="w-3.5 h-3.5" />
                {addingModule ? "Adding..." : "Add"}
              </button>
            </form>

            <div className="grid gap-3 sm:grid-cols-2 max-h-[300px] overflow-y-auto pr-1">
              {managerModules.map((m) => (
                <div key={m.id} className="p-3 bg-[#0D1117]/50 rounded-xl border border-white/5">
                  {editingModule === m.id ? (
                    <form onSubmit={saveModule} className="space-y-2.5 w-full">
                      <input className={inp} value={editModuleName} onChange={(e)=>setEditModuleName(e.target.value)} required />
                      <div className="flex gap-2 justify-end">
                        <button type="button" onClick={()=>setEditingModule(null)} className="px-3 py-1.5 text-xs border border-white/10 rounded-lg text-white/60">Cancel</button>
                        <button type="submit" className="px-3 py-1.5 text-xs bg-[#00E5D4]/15 border border-[#00E5D4]/40 text-[#00E5D4] rounded-lg">Save</button>
                      </div>
                    </form>
                  ) : (
                    <div className="flex items-center justify-between gap-2 w-full">
                      <div className="text-sm font-medium text-white truncate">{m.name}</div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={()=>startEditModule(m)} className="text-white/60 hover:text-amber-400 p-1.5" title="Edit module"><Edit className="w-3.5 h-3.5" /></button>
                        <button onClick={()=>deleteModule(m.id)} className="text-white/60 hover:text-red-400 p-1.5" title="Delete module"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {managerModules.length === 0 && <div className="text-white/50 text-xs text-center py-4 col-span-2">No modules found for this subject. Create one above!</div>}
            </div>
          </div>
        </GlassBox>
      )}
    </div>
  );
}

function ManageAnnouncements() {
  const [announcements, setAnnouncements] = useState([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);

  const loadAnnouncements = async () => {
    const { data } = await api.get("/announcements");
    setAnnouncements(data);
  };

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const createAnn = async (e) => {
    e.preventDefault();
    if (!title || !content) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("title", title);
      fd.append("content", content);
      await api.post("/announcements", fd);
      toast.success("Announcement posted successfully!");
      setTitle("");
      setContent("");
      loadAnnouncements();
    } catch {
      toast.error("Failed to post announcement");
    } finally {
      setBusy(false);
    }
  };

  const deleteAnn = async (id) => {
    if (!window.confirm("Are you sure you want to delete this announcement?")) return;
    try {
      await api.delete(`/announcements/${id}`);
      toast.success("Announcement deleted");
      loadAnnouncements();
    } catch {
      toast.error("Failed to delete announcement");
    }
  };

  return (
    <>
      <GlassBox title="Post Announcement" testid="admin-post-announcement">
        <form onSubmit={createAnn}>
          <Field label="Title">
            <input className={inp} value={title} onChange={(e)=>setTitle(e.target.value)} placeholder="e.g., Scheduled Maintenance" required />
          </Field>
          <Field label="Content">
            <textarea className={inp} value={content} onChange={(e)=>setContent(e.target.value)} rows={4} placeholder="Type announcement details here..." required />
          </Field>
          <button type="submit" className="btn-neon primary w-full" disabled={busy}>
            <Plus className="w-4 h-4" /> {busy ? "Posting..." : "Post Announcement"}
          </button>
        </form>
      </GlassBox>

      <GlassBox title="Active Announcements" testid="admin-announcement-list">
        <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
          {announcements.map((ann) => (
            <div key={ann.id} className="p-4 bg-[#0D1117]/50 rounded-xl border border-white/5 relative group">
              <button onClick={()=>deleteAnn(ann.id)} className="absolute top-4 right-4 text-white/50 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                <Trash2 className="w-4 h-4" />
              </button>
              <h4 className="text-sm font-semibold text-white mb-1 pr-6">{ann.title}</h4>
              <p className="text-xs text-white/70 leading-relaxed mb-2">{ann.content}</p>
              <div className="text-[10px] font-mono text-white/40">{new Date(ann.created_at).toLocaleString()}</div>
            </div>
          ))}
          {announcements.length === 0 && <div className="text-white/50 text-sm text-center py-8">No announcements posted yet.</div>}
        </div>
      </GlassBox>
    </>
  );
}

function ManageHomepage() {
  const [heroTitle, setHeroTitle] = useState("");
  const [heroSubtitle, setHeroSubtitle] = useState("");
  const [heroDesc, setHeroDesc] = useState("");
  const [busy, setBusy] = useState(false);

  const loadHomepage = async () => {
    const { data } = await api.get("/homepage");
    setHeroTitle(data.hero_title || "BITVERSE");
    setHeroSubtitle(data.hero_subtitle || "The Digital Universe of BIT Mesra");
    setHeroDesc(data.hero_description || "Notes · PYQs · Syllabus · Resources — everything a First Year BITian needs, in one beautiful place.");
  };

  useEffect(() => {
    loadHomepage();
  }, []);

  const saveHomepage = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("hero_title", heroTitle);
      fd.append("hero_subtitle", heroSubtitle);
      fd.append("hero_description", heroDesc);
      await api.post("/homepage", fd);
      toast.success("Homepage content updated successfully!");
    } catch {
      toast.error("Failed to update homepage content");
    } finally {
      setBusy(false);
    }
  };

  return (
    <GlassBox title="Manage Homepage Hero Content" testid="admin-manage-homepage">
      <form onSubmit={saveHomepage} className="space-y-4">
        <Field label="Hero Title">
          <input className={inp} value={heroTitle} onChange={(e)=>setHeroTitle(e.target.value)} required />
        </Field>
        <Field label="Hero Subtitle">
          <input className={inp} value={heroSubtitle} onChange={(e)=>setHeroSubtitle(e.target.value)} required />
        </Field>
        <Field label="Hero Description">
          <textarea className={inp} value={heroDesc} onChange={(e)=>setHeroDesc(e.target.value)} rows={4} required />
        </Field>
        <button type="submit" className="btn-neon primary w-full" disabled={busy}>
          <Upload className="w-4 h-4" /> {busy ? "Saving..." : "Save Custom Homepage Details"}
        </button>
      </form>
    </GlassBox>
  );
}

function ManageAnalytics() {
  const [data, setData] = useState([]);
  const [stats, setStats] = useState({ notes: 0, pyqs: 0, subjects: 0, students: 0, recent_activity: [] });
  const [loading, setLoading] = useState(true);

  const loadAnalytics = async (isPoll = false) => {
    try {
      const [trendRes, statsRes] = await Promise.all([
        api.get("/analytics/trending?limit=15"),
        api.get("/stats")
      ]);
      setData(trendRes.data.trending || []);
      setStats({
        notes: statsRes.data.notes || 0,
        pyqs: statsRes.data.pyqs || 0,
        subjects: statsRes.data.subjects || 0,
        students: statsRes.data.students || 1000,
        recent_activity: statsRes.data.recent_activity || []
      });
    } catch {
      if (!isPoll) {
        toast.error("Failed to load analytics");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
    const interval = setInterval(() => {
      loadAnalytics(true);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const totalScore = data.reduce((acc, curr) => acc + (curr.score || 0), 0) || 1;
  const topSubject = data[0];

  if (loading && data.length === 0) {
    return (
      <div className="lg:col-span-2 flex flex-col items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-[#00E5D4] border-t-transparent animate-spin rounded-full mb-3" />
        <div className="text-white/60 font-mono text-xs">Accessing Real-time Tracker...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 lg:col-span-2">
      <div className="p-4 bg-[#00E5D4]/10 border border-[#00E5D4]/30 rounded-2xl flex items-center justify-between animate-pulse-glow">
        <div className="flex items-center gap-3">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </span>
          <div className="text-xs font-mono text-white/85">
            <span className="text-[#00E5D4] font-bold">LIVE TRACKER ACTIVE</span> · Synchronized with BITVERSE student activity. Polling every 5s.
          </div>
        </div>
        <div className="text-[10px] bg-[#00E5D4]/25 text-[#00E5D4] font-mono uppercase px-2.5 py-1 rounded-full border border-[#00E5D4]/40">
          Server Load: Optimized
        </div>
      </div>

      {topSubject && (
        <div className="p-6 bg-gradient-to-br from-[#00E5D4]/15 via-transparent to-[#00B8FF]/10 border border-[#00E5D4]/35 rounded-3xl relative overflow-hidden group shadow-[0_0_30px_rgba(0,229,212,0.1)]">
          <div className="absolute top-0 right-0 w-40 h-40 bg-[#00E5D4]/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-[#00B8FF]/10 rounded-full blur-2xl" />
          
          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/20 text-amber-400 border border-amber-500/35 rounded-full text-[10px] font-bold uppercase tracking-wider mb-3">
                🔥 Peak Subject Demand
              </div>
              <h3 className="text-2xl md:text-3xl font-bold text-white tracking-tight leading-tight">{topSubject.name}</h3>
              <p className="text-xs text-white/60 font-mono mt-1.5">Semester {topSubject.semester} · Currently dominating student sessions</p>
            </div>
            
            <div className="grid grid-cols-3 gap-4 bg-[#0D1117]/60 p-4 rounded-2xl border border-white/5 shrink-0">
              <div className="text-center">
                <div className="text-white/40 text-[9px] font-mono uppercase">Views</div>
                <div className="text-lg font-bold text-white tabular-nums mt-0.5">{topSubject.views}</div>
              </div>
              <div className="text-center border-x border-white/10 px-4">
                <div className="text-white/40 text-[9px] font-mono uppercase">DLs</div>
                <div className="text-lg font-bold text-[#00E5D4] tabular-nums mt-0.5">{topSubject.downloads}</div>
              </div>
              <div className="text-center">
                <div className="text-white/40 text-[9px] font-mono uppercase">Focus</div>
                <div className="text-lg font-bold text-[#00B8FF] mt-0.5">{topSubject.activeFocus}%</div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-6">
          <GlassBox title="Platform Engagement Metrics" testid="admin-analytics-stats">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-[#0D1117]/50 border border-white/5 rounded-2xl hover:border-[#00E5D4]/15 transition">
                <div className="text-2xl font-bold text-white tabular-nums">{stats.notes}</div>
                <div className="text-[10px] font-mono text-white/55 uppercase tracking-wider mt-1">Live Notes</div>
              </div>
              <div className="p-4 bg-[#0D1117]/50 border border-white/5 rounded-2xl hover:border-[#00E5D4]/15 transition">
                <div className="text-2xl font-bold text-white tabular-nums">{stats.pyqs}</div>
                <div className="text-[10px] font-mono text-white/55 uppercase tracking-wider mt-1">Live PYQs</div>
              </div>
              <div className="p-4 bg-[#0D1117]/50 border border-white/5 rounded-2xl hover:border-[#00E5D4]/15 transition">
                <div className="text-2xl font-bold text-white tabular-nums">{stats.subjects}</div>
                <div className="text-[10px] font-mono text-white/55 uppercase tracking-wider mt-1">Active Subjects</div>
              </div>
              <div className="p-4 bg-[#0D1117]/50 border border-white/5 rounded-2xl hover:border-[#00E5D4]/15 transition">
                <div className="text-2xl font-bold text-[#00E5D4] tabular-nums">{stats.students}+</div>
                <div className="text-[10px] font-mono text-white/55 uppercase tracking-wider mt-1">Daily Students</div>
              </div>
            </div>
          </GlassBox>

          <GlassBox title="Real-time Student Interactions" testid="admin-analytics-logs">
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
              {stats.recent_activity?.map((act, idx) => (
                <div key={act.id || idx} className="flex items-start gap-3 p-3 bg-white/[0.02] border border-white/5 rounded-xl text-xs hover:border-[#00E5D4]/15 transition">
                  <span className="w-2 h-2 rounded-full bg-[#00E5D4] mt-1.5 shrink-0 animate-pulse" />
                  <div className="flex-1 min-w-0">
                    <div className="text-white/85 truncate">{act.description}</div>
                    <div className="text-[9px] font-mono text-white/40 mt-1">{new Date(act.time).toLocaleTimeString()}</div>
                  </div>
                </div>
              ))}
              {(!stats.recent_activity || stats.recent_activity.length === 0) && (
                <div className="text-center text-white/40 text-xs py-8">No dynamic activity logged yet.</div>
              )}
            </div>
          </GlassBox>
        </div>

        <GlassBox title="Subject Engagement Scoreboard" testid="admin-analytics-scoreboard">
          <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
            {data.map((subj, idx) => {
              const percentage = Math.min(100, Math.round(((subj.score || 0) / totalScore) * 100)) || 5;
              const isPeak = idx === 0;
              return (
                <div key={subj.subject_id} className={`space-y-1.5 p-3 bg-[#0D1117]/30 border rounded-xl transition ${isPeak ? 'border-amber-500/30 bg-amber-500/[0.02]' : 'border-white/5 hover:border-[#00E5D4]/10'}`}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-white/90 truncate max-w-[200px] flex items-center gap-1.5">
                      {isPeak && <span className="text-amber-400">🔥</span>}
                      {subj.name}
                    </span>
                    <span className="font-mono text-[#00E5D4]">{subj.score} pts</span>
                  </div>
                  <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-1000 ${isPeak ? 'bg-gradient-to-r from-amber-500 to-yellow-400' : 'bg-gradient-to-r from-[#00E5D4]/40 to-[#00E5D4]'}`} style={{ width: `${percentage}%` }} />
                  </div>
                  <div className="flex items-center justify-between text-[9px] font-mono text-white/50">
                    <span>Semester {subj.semester}</span>
                    <span>{subj.views} views · {subj.downloads} downloads</span>
                  </div>
                </div>
              );
            })}
            {data.length === 0 && <div className="text-white/50 text-sm text-center py-8">No analytics data recorded yet.</div>}
          </div>
        </GlassBox>
      </div>
    </div>
  );
}

function ManageStorage() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [optimizing, setOptimizing] = useState(false);

  const loadStatus = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/admin/storage-status");
      setStatus(data);
    } catch {
      toast.error("Failed to load storage status");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const optimize = async () => {
    setOptimizing(true);
    try {
      const { data } = await api.post("/admin/optimize-storage");
      if (data.ok) {
        toast.success(`Storage optimized! Released ${data.modifiedCount} redundant files from MongoDB.`);
        loadStatus();
      } else {
        toast.error("Optimization failed");
      }
    } catch (err) {
      toast.error("An error occurred during optimization");
    } finally {
      setOptimizing(false);
    }
  };

  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return "0 Bytes";
    const k = 1024;
    const dm = 2;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
  };

  if (loading) {
    return (
      <div className="lg:col-span-2 flex flex-col items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-[#00E5D4] animate-spin mb-3" />
        <div className="text-white/60 font-mono text-xs">Accessing Database Metrics...</div>
      </div>
    );
  }

  // Calculate percentage of 512 MB limit used
  const limitBytes = 512 * 1024 * 1024;
  const totalB64Size = status?.totalB64SizeBytes || 0;
  const usagePercentage = Math.min(100, Math.round((totalB64Size / limitBytes) * 100));

  return (
    <div className="space-y-6 lg:col-span-2">
      <div className="p-4 bg-[#0D1117]/80 border border-white/10 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-mono text-white/50 uppercase tracking-widest">Active Storage System</div>
          <div className="text-lg font-bold text-white flex items-center gap-2 mt-1">
            <Database className="w-5 h-5 text-[#00E5D4]" /> MongoDB Atlas Free Tier (512 MB Limit)
          </div>
        </div>
        <div className="flex items-center gap-2">
          {status?.hasCloudinary ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#00E5D4]/10 text-[#00E5D4] border border-[#00E5D4]/30 rounded-full text-xs font-medium font-mono">
              <CheckCircle2 className="w-3.5 h-3.5" /> Cloudinary Enabled: {status.cloudinaryCloudName}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-full text-xs font-medium font-mono">
              <AlertTriangle className="w-3.5 h-3.5 animate-pulse" /> Cloudinary Disconnected
            </span>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <GlassBox title="Database Usage Profile" testid="storage-usage-profile">
          <div className="space-y-5">
            <div>
              <div className="flex justify-between text-xs font-mono text-white/70 mb-2">
                <span>Estimated MongoDB Binary Storage:</span>
                <span className="font-bold text-white">{formatBytes(totalB64Size)} / 512 MB</span>
              </div>
              <div className="w-full bg-[#0D1117] h-3.5 rounded-full border border-white/5 p-0.5 overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    usagePercentage > 85 ? "bg-red-500" : usagePercentage > 60 ? "bg-amber-500" : "bg-[#00E5D4]"
                  }`}
                  style={{ width: `${usagePercentage}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] font-mono text-white/40 mt-1.5">
                <span>0 MB</span>
                <span>{usagePercentage}% Capacity Used</span>
                <span>512 MB Limit</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 border-t border-white/10 pt-4">
              <div className="p-3 bg-[#0D1117]/40 border border-white/5 rounded-xl">
                <div className="text-[10px] font-mono text-white/50 uppercase">Base64 Binary Backups</div>
                <div className="text-xl font-bold text-white mt-1 tabular-nums">{status?.b64FilesCount || 0}</div>
                <div className="text-[10px] text-white/40 font-mono mt-0.5">Stored inside database</div>
              </div>
              <div className="p-3 bg-[#0D1117]/40 border border-white/5 rounded-xl">
                <div className="text-[10px] font-mono text-white/50 uppercase font-medium">Total Library Files</div>
                <div className="text-xl font-bold text-[#00E5D4] mt-1 tabular-nums">{status?.totalFiles || 0}</div>
                <div className="text-[10px] text-white/40 font-mono mt-0.5">Total documents catalogued</div>
              </div>
            </div>

            <div className="space-y-2 border-t border-white/10 pt-4">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-white/60">Cloud-Hosted Backup Size:</span>
                <span className="text-emerald-400 font-bold tabular-nums">{formatBytes(status?.cloudB64SizeBytes)}</span>
              </div>
              <div className="flex justify-between text-xs font-mono">
                <span className="text-white/60">Redundant Files in DB:</span>
                <span className="text-[#00E5D4] font-bold tabular-nums">{status?.cloudB64FilesCount || 0} files</span>
              </div>
              <p className="text-[10px] font-mono text-white/45 leading-relaxed">
                * Redundant files are already safely hosted in the cloud (Cloudinary / Google Drive) but still have backup blobs inside your database documents.
              </p>
            </div>
          </div>
        </GlassBox>

        <GlassBox title="Database Optimization Center" testid="storage-optimization-center">
          <div className="space-y-4 flex flex-col h-full justify-between">
            <div className="space-y-3">
              <p className="text-xs text-white/80 leading-relaxed">
                Storing large PDF documents directly inside MongoDB Atlas free tier causes database size warnings and limits of 512MB to be exceeded quickly.
              </p>
              <div className="p-3.5 bg-[#00E5D4]/5 border border-[#00E5D4]/15 rounded-xl space-y-1.5">
                <div className="text-xs font-bold text-[#00E5D4] flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> Permanent Solution: Cloudinary
                </div>
                <p className="text-[11px] text-white/70 leading-relaxed">
                  Cloudinary provides a <strong>100% Free Tier with 25 GB of storage space</strong>. Once connected, all files are stored on Cloudinary. MongoDB only stores a tiny 1KB text record instead of megabytes of binary data!
                </p>
              </div>
            </div>

            <div className="pt-4 space-y-3">
              <button
                onClick={optimize}
                disabled={optimizing || !status?.cloudB64FilesCount}
                className="w-full btn-neon primary py-3 flex items-center justify-center gap-2"
              >
                <HardDrive className="w-4 h-4" />
                {optimizing ? "Optimizing Database..." : "Purge Redundant DB Backups"}
              </button>
              <p className="text-[10px] text-center font-mono text-white/40">
                Instantly releases MongoDB storage space from any already-uploaded cloud files.
              </p>
            </div>
          </div>
        </GlassBox>
      </div>

      <GlassBox title="🔧 Simple Step-by-Step Guide to Connect Cloudinary (Permanently Free)" testid="cloudinary-setup-guide">
        <div className="p-1 space-y-4 text-xs text-white/80 leading-relaxed">
          <p>
            To prevent database alerts and store up to <strong>25,000+ files and books completely for free</strong>, follow these quick steps:
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="p-3 bg-[#0D1117]/50 border border-white/5 rounded-xl space-y-1.5">
              <div className="font-bold text-[#00E5D4] font-mono">1. Register Free Account</div>
              <p className="text-white/65 text-[11px]">
                Create a free account at <a href="https://cloudinary.com/" target="_blank" rel="noopener noreferrer" className="text-[#00E5D4] underline hover:text-[#00B8FF]">Cloudinary.com</a>. No credit card required.
              </p>
            </div>
            <div className="p-3 bg-[#0D1117]/50 border border-white/5 rounded-xl space-y-1.5">
              <div className="font-bold text-[#00E5D4] font-mono">2. Copy API Keys</div>
              <p className="text-white/65 text-[11px]">
                Log in, navigate to your Cloudinary dashboard console, and copy your:
                <span className="block text-[10px] font-mono bg-black/30 p-1 rounded mt-1 text-[#00B8FF]">
                  - Cloud Name<br/>- API Key<br/>- API Secret
                </span>
              </p>
            </div>
            <div className="p-3 bg-[#0D1117]/50 border border-white/5 rounded-xl space-y-1.5">
              <div className="font-bold text-[#00E5D4] font-mono">3. Add as Secrets</div>
              <p className="text-white/65 text-[11px]">
                Open your AI Studio project menu, go to <strong>Settings / Secrets</strong>, add:
                <span className="block text-[10px] font-mono bg-black/30 p-1 rounded mt-1 text-amber-300">
                  CLOUDINARY_CLOUD_NAME<br/>CLOUDINARY_API_KEY<br/>CLOUDINARY_API_SECRET
                </span>
              </p>
            </div>
          </div>
          <p className="font-mono text-[11px] text-amber-400 bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-lg">
            ⚡ Success: The server is already fully integrated with Cloudinary out of the box! Once you add these three secrets, future files will take <strong>0 bytes</strong> of MongoDB database space!
          </p>
        </div>
      </GlassBox>
    </div>
  );
}

function FolderUpload({ subjects, refresh }) {
  const [filesToUpload, setFilesToUpload] = useState([]);
  const [structure, setStructure] = useState({});
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState([]);
  const [currentSem, setCurrentSem] = useState(1);

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    processFiles(files);
  };

  const processFiles = (files) => {
    const parsed = [];
    const struct = {};

    for (const file of files) {
      const path = file.webkitRelativePath || file.name || "";
      if (!path) continue;

      // Filter out non-document files or hidden system files
      const ext = path.split(".").pop()?.toLowerCase();
      if (!ext || ["ds_store", "ini", "db", "tmp"].includes(ext)) continue;

      const parts = path.split("/");
      if (parts.length === 0) continue;

      let subjectName = "";
      let moduleName = "";
      let fileName = "";

      if (parts.length >= 3) {
        subjectName = parts[0];
        moduleName = parts[1];
        fileName = parts.slice(2).join("/");
      } else if (parts.length === 2) {
        subjectName = parts[0];
        moduleName = "";
        fileName = parts[1];
      } else {
        subjectName = "General";
        moduleName = "";
        fileName = parts[0];
      }

      parsed.push({
        file,
        subjectName,
        moduleName,
        fileName
      });

      if (!struct[subjectName]) {
        struct[subjectName] = {};
      }
      if (moduleName) {
        if (!struct[subjectName][moduleName]) {
          struct[subjectName][moduleName] = [];
        }
        struct[subjectName][moduleName].push(fileName);
      } else {
        if (!struct[subjectName]["_direct"]) {
          struct[subjectName]["_direct"] = [];
        }
        struct[subjectName]["_direct"].push(fileName);
      }
    }

    setFilesToUpload(parsed);
    setStructure(struct);
    setLogs([`Parsed ${files.length} files. Detected structural layout ready for dynamic creation.`]);
  };

  const startUpload = async () => {
    if (filesToUpload.length === 0) {
      return toast.error("No files selected to upload");
    }
    setBusy(true);
    setProgress(0);
    setLogs(["Initializing automated folder processing...", `Found ${filesToUpload.length} files.`]);

    const subjectCache = {};
    const moduleCache = {};

    // Cache pre-existing database subjects and modules
    for (const s of subjects) {
      subjectCache[s.name.toLowerCase().trim()] = s.id;
      try {
        const { data: mods } = await api.get(`/subjects/${s.id}/modules`);
        for (const m of mods) {
          moduleCache[`${s.id}_${m.name.toLowerCase().trim()}`] = m.id;
        }
      } catch (err) {
        console.error("Failed to fetch modules for cache:", err);
      }
    }

    let uploadedCount = 0;
    const total = filesToUpload.length;

    for (const item of filesToUpload) {
      try {
        const subKey = item.subjectName.toLowerCase().trim();
        let subjectId = subjectCache[subKey];

        // 1. Create or Resolve Subject
        if (!subjectId) {
          setLogs(prev => [...prev, `Creating subject "${item.subjectName}" (Semester ${currentSem})...`]);
          const sFd = new FormData();
          sFd.append("name", item.subjectName);
          sFd.append("semester", currentSem);
          sFd.append("credits", "3");
          const { data: newSub } = await api.post("/subjects", sFd);
          subjectId = newSub.id;
          subjectCache[subKey] = subjectId;
          setLogs(prev => [...prev, `✔ Created Subject: ${item.subjectName}`]);
        }

        // 2. Create or Resolve Module (if specified in path)
        let moduleId = null;
        if (item.moduleName) {
          const modKey = `${subjectId}_${item.moduleName.toLowerCase().trim()}`;
          moduleId = moduleCache[modKey];

          if (!moduleId) {
            setLogs(prev => [...prev, `Creating module "${item.moduleName}" under "${item.subjectName}"...`]);
            const mFd = new FormData();
            mFd.append("subject_id", subjectId);
            mFd.append("name", item.moduleName);
            const { data: newMod } = await api.post("/modules", mFd);
            moduleId = newMod.id;
            moduleCache[modKey] = moduleId;
            setLogs(prev => [...prev, `✔ Created Module: ${item.moduleName}`]);
          }
        }

        // 3. Upload File
        setLogs(prev => [...prev, `Uploading file: ${item.fileName}...`]);
        const fileFd = new FormData();
        fileFd.append("category", "notes");
        fileFd.append("subject_id", subjectId);
        if (moduleId) {
          fileFd.append("module_id", moduleId);
        }
        const displayName = item.fileName.split("/").pop().replace(/\.[^/.]+$/, "");
        fileFd.append("display_name", displayName);
        fileFd.append("file", item.file);

        await api.post("/upload", fileFd);
        setLogs(prev => [...prev, `✔ Successfully uploaded: ${item.fileName}`]);

        uploadedCount++;
        setProgress(Math.round((uploadedCount / total) * 100));
      } catch (err) {
        setLogs(prev => [...prev, `❌ Error uploading "${item.fileName}": ${err.message || "Failed"}`]);
      }
    }

    setLogs(prev => [...prev, "🎉 All automated uploads processed successfully!"]);
    toast.success("Folder structure processed successfully!");
    setBusy(false);
    refresh();
  };

  return (
    <div className="space-y-6 lg:col-span-2">
      <GlassBox title="Structured Folder Upload" testid="admin-folder-upload-box">
        <p className="text-white/60 text-xs mb-4">
          Select a directory from your computer containing academic materials. The uploader automatically preserves the folder structure as: <code className="text-[#00E5D4] bg-white/5 px-1 py-0.5 rounded">Subject / Module / PDF File</code>. New subjects and modules will be created on the fly in the database!
        </p>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Field label="Semester for New Subjects">
              <select 
                className={inp} 
                value={currentSem} 
                onChange={(e) => setCurrentSem(parseInt(e.target.value))}
                disabled={busy}
              >
                <option value={1}>Semester 1 (Chemistry Group)</option>
                <option value={2}>Semester 2 (Physics Group)</option>
              </select>
            </Field>

            <div className="mt-4 border-2 border-dashed border-white/10 rounded-2xl p-8 flex flex-col items-center justify-center text-center bg-[#0D1117]/45 hover:border-[#00E5D4]/40 hover:bg-[#00E5D4]/5 transition group relative cursor-pointer">
              <input 
                type="file" 
                webkitdirectory="" 
                directory="" 
                multiple 
                onChange={handleFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                disabled={busy}
              />
              <UploadCloud className="w-10 h-10 text-white/40 group-hover:text-[#00E5D4] group-hover:scale-105 transition mb-3" />
              <div className="text-xs font-semibold text-white/80 group-hover:text-white mb-1">Click to select folder...</div>
              <div className="text-[10px] text-white/45 font-mono uppercase">Preserves Directory Structure</div>
            </div>

            {filesToUpload.length > 0 && (
              <div className="mt-5 space-y-4">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-white/65">Detected Files: <strong className="text-white">{filesToUpload.length}</strong></span>
                  <span className="text-white/65">Pending Status</span>
                </div>

                {busy && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-mono text-[#00E5D4]">
                      <span>Processing Progress...</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden border border-white/5">
                      <div className="bg-gradient-to-r from-[#00E5D4] to-[#00B8FF] h-full transition-all duration-300" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                )}

                <button 
                  onClick={startUpload}
                  disabled={busy}
                  className="btn-neon primary w-full flex items-center justify-center gap-2"
                >
                  {busy ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Uploading ({progress}%)</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-white" />
                      <span>Start Automated Processing</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          <div className="p-4 bg-[#05070A]/85 border border-white/5 rounded-2xl flex flex-col h-[320px]">
            <div className="text-xs font-mono uppercase tracking-wider text-white/50 border-b border-white/5 pb-2 mb-3">Live Execution Logs</div>
            <div className="flex-1 overflow-y-auto space-y-2 font-mono text-[10px] text-white/70 leading-relaxed pr-1 select-text">
              {logs.map((log, idx) => (
                <div key={idx} className={log.startsWith("❌") ? "text-red-400" : log.startsWith("✔") ? "text-emerald-400" : "text-white/75"}>
                  {log}
                </div>
              ))}
              {logs.length === 0 && (
                <div className="text-white/30 text-center py-20">Select a local directory or folder to inspect structure and begin batch uploading.</div>
              )}
            </div>
          </div>
        </div>

        {Object.keys(structure).length > 0 && (
          <div className="mt-6 border border-white/5 rounded-2xl bg-[#05070A]/40 p-4 max-h-[300px] overflow-y-auto">
            <div className="text-xs font-semibold text-white/80 border-b border-white/5 pb-2 mb-3 flex items-center gap-1.5">
              <FolderOpen className="w-4 h-4 text-[#00E5D4]" /> Preview Detected Structure
            </div>
            <div className="space-y-4 text-xs font-mono text-white/75">
              {Object.entries(structure).map(([subject, modulesMap]) => (
                <div key={subject} className="space-y-2 pl-2 border-l border-[#00E5D4]/20">
                  <div className="text-[#00E5D4] font-bold">📂 {subject}</div>
                  <div className="space-y-2 pl-4">
                    {Object.entries(modulesMap).map(([module, fileList]) => (
                      <div key={module} className="space-y-1">
                        <div className="text-white/80 font-semibold">📁 {module === "_direct" ? "Direct Files (No Module)" : module}</div>
                        <div className="space-y-1 pl-4 text-white/50 text-[11px]">
                          {fileList.map((f, idx) => (
                            <div key={idx}>📄 {f}</div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </GlassBox>
    </div>
  );
}
