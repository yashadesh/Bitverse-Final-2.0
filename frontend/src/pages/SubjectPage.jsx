import { useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { API } from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import Breadcrumbs from "@/components/Breadcrumbs";
import FileCard from "@/components/FileCard";
import PaginatedList from "@/components/PaginatedList";
import { useSubject, useSubjectModules, useModuleFileCounts, useFiles } from "@/hooks/useQueries";
import { FolderOpen, ChevronRight, ArrowLeft, GraduationCap, FileX2, BookOpen, FileText, FlaskConical } from "lucide-react";

const DIRECT_FILE_SUBJECTS = new Set([
  "Programming for Problem Solving",
  "Workshop Practice",
  "NSS",
]);
const BOOKS_SUBJECT = new Set(["Engineering Graphics"]);

function classify(name = "") {
  if (BOOKS_SUBJECT.has(name)) return "books";
  if (/\b(lab|laboratory)\b/i.test(name)) return "lab";
  if (DIRECT_FILE_SUBJECTS.has(name)) return "direct";
  return "modules";
}

const SECTION_META = {
  lab:    { label: "Lab Files",     Icon: FlaskConical },
  direct: { label: "Notes",         Icon: FileText },
  books:  { label: "Books",         Icon: BookOpen },
};

export default function SubjectPage() {
  const { subjectId } = useParams();

  const { data: subject, isLoading: loadingSubject } = useSubject(subjectId);
  const { data: rawModules = [], isLoading: loadingModules } = useSubjectModules(subjectId);
  const { data: countsData = {}, isLoading: loadingCounts } = useModuleFileCounts();
  const { data: notesData = [], isLoading: loadingNotes } = useFiles({ category: "notes", subject_id: subjectId });
  const { data: tutorials = [], isLoading: loadingTutorials } = useFiles({ category: "tutorial", subject_id: subjectId });
  const { data: books = [], isLoading: loadingBooks } = useFiles({ category: "book", subject_id: subjectId });

  const loading = loadingSubject || loadingModules || loadingCounts || loadingNotes || loadingTutorials || loadingBooks;

  const directFiles = useMemo(() => {
    return notesData.filter(f => !f.module_id);
  }, [notesData]);

  const modules = useMemo(() => {
    return rawModules.map(m => ({
      ...m,
      file_count: countsData && countsData[m.id] !== undefined ? countsData[m.id] : (m.file_count || 0)
    }));
  }, [rawModules, countsData]);

  const kind = classify(subject?.name);
  const showModules = kind === "modules" && modules.length > 0;
  const primaryFiles = (kind === "books" || kind === "direct") ? [...directFiles, ...books] : directFiles;
  const primaryMeta = SECTION_META[kind] || SECTION_META.direct;

  // Tutorials: ascending order (oldest first — Tutorial 1 → Tutorial 2 → …)
  const tutorialsSorted = useMemo(
    () => [...tutorials].sort((a, b) => (a.created_at || "").localeCompare(b.created_at || "")),
    [tutorials]
  );

  if (loading) {
    return (
      <div className="page-enter mx-auto max-w-6xl px-6 pt-28 md:pt-32 animate-pulse">
        <Breadcrumbs 
          items={[
            { label: "Notes Hub", path: "/notes" },
            { label: "Semester ...", path: "/notes" },
            { label: "Loading..." }
          ]} 
        />
        <div className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-[#00E5D4]/40 mb-6">
          <ArrowLeft className="w-4 h-4 opacity-40" /> Back
        </div>
        
        {/* Header Skeleton */}
        <div className="space-y-4">
          <div className="h-6 w-28 bg-white/5 rounded-full border border-white/10" />
          <div className="h-10 md:h-12 w-3/4 max-w-lg bg-white/10 rounded-2xl animate-pulse" />
          <div className="h-4 w-1/2 max-w-md bg-white/5 rounded-lg" />
        </div>

        {/* Modules Grid Skeleton */}
        <section className="mt-12">
          <div className="flex items-center justify-between mb-4">
            <div className="h-6 w-24 bg-white/10 rounded-lg" />
            <div className="h-6 w-16 bg-white/5 rounded-full" />
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="card-glass p-6 flex items-center gap-4 h-24">
                <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-5/6 bg-white/10 rounded" />
                  <div className="h-3 w-1/2 bg-white/5 rounded" />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Tutorials Skeleton */}
        <section className="mt-16">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 shrink-0" />
              <div className="space-y-2">
                <div className="h-5 w-24 bg-white/10 rounded" />
                <div className="h-3 w-32 bg-white/5 rounded" />
              </div>
            </div>
            <div className="h-6 w-16 bg-white/5 rounded-full" />
          </div>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 shrink-0" />
                <div className="flex-1 card-glass p-5 flex items-center justify-between">
                  <div className="flex items-center gap-3 w-full animate-pulse">
                    <div className="w-10 h-10 rounded bg-white/5 shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-1/3 bg-white/10 rounded" />
                      <div className="h-3 w-1/4 bg-white/5 rounded" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="page-enter mx-auto max-w-6xl px-6 pt-28 md:pt-32">
      <Breadcrumbs 
        items={[
          { label: "Notes Hub", path: "/notes" },
          { label: `Semester ${subject?.semester}`, path: `/notes/sem/${subject?.semester}` },
          { label: subject?.name }
        ]} 
      />
      <Link
        to={subject ? `/notes/sem/${subject.semester}` : "/notes"}
        className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-[#00E5D4] mb-6"
        data-testid="subject-back"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </Link>
      <PageHeader
        chip={subject ? `Semester ${subject.semester}${subject.semester === 1 ? " (C)" : " (P)"}` : "Loading"}
        title={subject ? <>{subject.name}</> : "Loading..."}
        subtitle={
          showModules
            ? "Choose a module to open its files."
            : kind === "books"
            ? "Book references and study material for this subject."
            : "All files uploaded for this subject."
        }
        testid="subject-header"
      />

      {/* Direct-file subjects: labs, PPS, Workshop, NSS, PT, Engineering Graphics (books) */}
      {!showModules && primaryMeta && (
        <section className="mt-10" data-testid={`section-${kind}`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#00E5D4]/10 border border-[#00E5D4]/30">
                <primaryMeta.Icon className="w-5 h-5 text-[#00E5D4]" />
              </div>
              <h2 className="font-display text-xl font-semibold">{primaryMeta.label}</h2>
            </div>
            <span className="chip">{primaryFiles.length} Files</span>
          </div>
          <PaginatedList
            items={primaryFiles}
            testId="primary-files-list"
            renderItem={(f) => <FileCard key={f.id} file={f} apiBase={API} />}
            emptyState={
              <div className="card-glass p-12 flex flex-col items-center gap-3 text-center">
                <FileX2 className="w-10 h-10 text-[#00E5D4]/60" />
                <p className="text-white/70">No {primaryMeta.label.toLowerCase()} uploaded yet.</p>
              </div>
            }
          />
        </section>
      )}

      {/* Modules for regular subjects */}
      {showModules && (
        <section className="mt-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl font-semibold">Modules</h2>
            <span className="chip">{modules.length} Modules</span>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {modules.map((m, i) => (
              <Link
                key={m.id}
                to={`/notes/module/${m.id}`}
                className="card-glass p-6 group animate-fade-up flex items-center gap-4"
                style={{ animationDelay: `${i * 0.05}s` }}
                data-testid={`module-card-${m.id}`}
              >
                <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-[#00E5D4]/10 border border-[#00E5D4]/30">
                  <FolderOpen className="w-6 h-6 text-[#00E5D4]" />
                </div>
                <div className="flex-1">
                  <h3 className="font-display font-semibold text-lg">{m.name}</h3>
                  <div className="text-xs font-mono text-[#00E5D4] mt-0.5">
                    {m.file_count !== undefined ? `${m.file_count} ${m.file_count === 1 ? 'Note' : 'Notes'}` : "Open module"}
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-white/40 group-hover:text-[#00E5D4] group-hover:translate-x-1 transition" />
              </Link>
            ))}
            {modules.length === 0 && (
              <div className="col-span-full text-center text-white/50 text-sm py-16">No modules yet.</div>
            )}
          </div>
        </section>
      )}

      {/* TUTORIALS — for every subject, ascending order 1 → N */}
      <section className="mt-16" data-testid="tutorials-section">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#00E5D4]/10 border border-[#00E5D4]/30">
              <GraduationCap className="w-5 h-5 text-[#00E5D4]" />
            </div>
            <div>
              <h2 className="font-display text-xl font-semibold">Tutorials</h2>
              <div className="text-xs font-mono text-white/50">Ordered from Tutorial 1 → {Math.max(tutorialsSorted.length, 1)}</div>
            </div>
          </div>
          <span className="chip">{tutorialsSorted.length} Files</span>
        </div>
        <PaginatedList
          items={tutorialsSorted}
          testId="tutorials-list"
          renderItem={(f, i) => (
            <div key={f.id} className="flex items-center gap-3" data-testid={`tutorial-item-${i + 1}`}>
              <span className="w-9 h-9 rounded-lg bg-[#00E5D4]/10 border border-[#00E5D4]/30 flex items-center justify-center font-mono text-[#00E5D4] text-sm shrink-0">
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <FileCard file={f} apiBase={API} />
              </div>
            </div>
          )}
          emptyState={
            <div className="card-glass p-8 text-center text-white/60 text-sm">No tutorials uploaded yet.</div>
          }
        />
      </section>
    </div>
  );
}
