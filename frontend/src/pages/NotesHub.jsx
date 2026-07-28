import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { 
  BookOpenText, ArrowRight, Search, Sparkles, BookOpen, FileText, FolderOpen, RefreshCw,
  ChevronRight, FlaskConical, Atom, Cpu, Sigma, Cog, Ruler, Wrench, HeartHandshake, Dna, Code2, Zap, MessageSquare, Radiation, Dumbbell, Leaf
} from "lucide-react";
import PageHeader from "@/components/PageHeader";
import Breadcrumbs from "@/components/Breadcrumbs";
import { useSubjects } from "@/hooks/useQueries";
import { api, API } from "@/lib/api";

const ICONS = {
  "Environmental Science": Leaf,
  "Chemistry": FlaskConical,
  "Chemistry Lab": FlaskConical,
  "Basic Electronics": Cpu,
  "Basic Electronics Lab": Cpu,
  "Mathematics-I": Sigma,
  "Mathematics-II": Sigma,
  "Basics of Mechanical Engineering": Cog,
  "Engineering Graphics": Ruler,
  "Workshop Practice": Wrench,
  "NSS": HeartHandshake,
  "Biological Science for Engineers": Dna,
  "Programming for Problem Solving": Code2,
  "Programming for Problem Solving Laboratory": Code2,
  "Programming for Problem Solving Laboratories": Code2,
  "Basics of Electrical Engineering": Zap,
  "Electrical Engineering Lab": Zap,
  "Communication Skill-I": MessageSquare,
  "Communication Skill - I": MessageSquare,
  "Physics": Atom,
  "Physics Lab": Radiation,
  "PT and Games": Dumbbell,
};

const QUICK_TAGS = ["Maths", "Physics", "Chemistry", "Programming", "Lab", "Tutorial"];

export default function NotesHub() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedSem, setSelectedSem] = useState("all");

  const subjectsQuery = useSubjects();
  const subjects = subjectsQuery.data || [];
  const subjectsLoading = subjectsQuery.isLoading;

  useEffect(() => {
    if (!query.trim()) {
      setResults(null);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setLoading(true);
      try {
        const { data } = await api.get(`/search?q=${encodeURIComponent(query)}`);
        setResults(data);
      } catch (err) {
        console.error("Search failed:", err);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [query]);

  const hasResults = results && (
    (results.subjects && results.subjects.length > 0) ||
    (results.modules && results.modules.length > 0) ||
    (results.files && results.files.length > 0)
  );

  return (
    <div className="page-enter mx-auto max-w-6xl px-6 pt-28 md:pt-32">
      <Breadcrumbs items={[{ label: "Notes Hub" }]} />
      <PageHeader
        chip="Notes Library"
        title={<>First Year <span className="text-[#00E5D4]">Subjects</span></>}
        subtitle="Complete first year subject library — carefully organized by module and resource type."
        testid="notes-hub"
      />

      {/* GLOBAL SEARCH MODULE */}
      <div className="mt-10 max-w-2xl mx-auto" data-testid="search-module">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            {loading ? (
              <RefreshCw className="w-5 h-5 text-[#00E5D4] animate-spin" />
            ) : (
              <Search className="w-5 h-5 text-white/50" />
            )}
          </div>
          <input
            type="text"
            className="w-full bg-[#05070A]/80 border-2 border-white/10 rounded-2xl pl-12 pr-4 py-4 text-white placeholder-white/40 focus:border-[#00E5D4] focus:outline-none focus:ring-1 focus:ring-[#00E5D4] transition-all text-base tracking-wide"
            placeholder="Search subjects, modules, topics or PDF names..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            data-testid="search-input"
          />
        </div>

        {/* QUICK SUGGESTIONS */}
        <div className="flex flex-wrap items-center gap-2 mt-3 pl-1">
          <span className="text-[10px] font-mono uppercase tracking-wider text-white/40 mr-1 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-[#00E5D4]" /> Quick Searches:
          </span>
          {QUICK_TAGS.map((tag) => (
            <button
              key={tag}
              onClick={() => setQuery(tag)}
              className="px-2.5 py-1 text-xs rounded-full border border-white/5 hover:border-[#00E5D4]/40 bg-white/5 text-white/75 hover:text-[#00E5D4] transition-all"
            >
              {tag}
            </button>
          ))}
          {query && (
            <button
              onClick={() => setQuery("")}
              className="text-xs text-red-400/80 hover:text-red-400 font-mono ml-auto"
            >
              Clear
            </button>
          )}
        </div>

        {/* SEARCH RESULTS OVERLAY PANEL */}
        {query.trim() && (
          <div className="mt-4 p-5 bg-[#0D1117]/95 border border-white/10 rounded-2xl shadow-2xl backdrop-blur-xl z-20 relative max-h-[480px] overflow-y-auto space-y-5" data-testid="search-results">
            {loading && !results && (
              <div className="text-center py-10 text-white/50 text-sm">Searching the digital universe...</div>
            )}

            {!loading && !hasResults && (
              <div className="text-center py-10 text-white/50 text-sm">
                No matching notes, subjects, or modules found. Try another keyword!
              </div>
            )}

            {results && results.subjects && results.subjects.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-[10px] font-mono uppercase tracking-widest text-[#00E5D4] font-bold border-b border-white/5 pb-1 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5" /> Subjects ({results.subjects.length})
                </h4>
                <div className="grid gap-2">
                  {results.subjects.map((sub) => (
                    <Link
                      key={sub.id}
                      to={`/notes/subject/${sub.id}`}
                      className="p-3 bg-white/5 hover:bg-[#00E5D4]/10 rounded-xl border border-white/5 hover:border-[#00E5D4]/30 flex items-center justify-between transition-all group"
                    >
                      <span className="text-sm font-semibold text-white/90 group-hover:text-white truncate">{sub.name}</span>
                      <span className="text-[10px] font-mono text-white/40 group-hover:text-[#00E5D4] shrink-0 ml-2">Sem {sub.semester} · Open subject</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {results && results.modules && results.modules.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-[10px] font-mono uppercase tracking-widest text-[#00E5D4] font-bold border-b border-white/5 pb-1 flex items-center gap-1.5">
                  <FolderOpen className="w-3.5 h-3.5" /> Modules ({results.modules.length})
                </h4>
                <div className="grid gap-2">
                  {results.modules.map((mod) => (
                    <Link
                      key={mod.id}
                      to={`/notes/module/${mod.id}`}
                      className="p-3 bg-white/5 hover:bg-[#00E5D4]/10 rounded-xl border border-white/5 hover:border-[#00E5D4]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-1 transition-all group"
                    >
                      <div className="min-w-0">
                        <span className="text-sm font-semibold text-white/90 group-hover:text-white block truncate">{mod.name}</span>
                        <span className="text-[10px] font-mono text-white/40 block truncate">{mod.subject_name}</span>
                      </div>
                      <span className="text-[10px] font-mono text-white/40 group-hover:text-[#00E5D4] shrink-0 sm:ml-2">Sem {mod.semester} · Open module</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {results && results.files && results.files.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-[10px] font-mono uppercase tracking-widest text-[#00E5D4] font-bold border-b border-white/5 pb-1 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" /> Files & PDFs ({results.files.length})
                </h4>
                <div className="grid gap-2">
                  {results.files.map((file) => {
                    const viewUrl = `/viewer/${file.id}`;
                    return (
                      <Link
                        key={file.id}
                        to={viewUrl}
                        className="p-3 bg-white/5 hover:bg-[#00E5D4]/10 rounded-xl border border-white/5 hover:border-[#00E5D4]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-1 transition-all group"
                      >
                        <div className="min-w-0">
                          <span className="text-sm font-semibold text-white/90 group-hover:text-white block truncate">{file.display_name}</span>
                          <span className="text-[10px] font-mono text-white/40 block truncate">
                            {file.subject_name} {file.module_name ? `· ${file.module_name}` : ""}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-amber-400 group-hover:text-[#00E5D4] shrink-0 sm:ml-2 uppercase tracking-wider bg-white/5 px-2 py-0.5 rounded border border-white/5">
                          {file.category}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* SEMESTER FILTER SWITCH */}
      <div className="flex flex-wrap justify-center gap-3 mt-12 animate-fade-up">
        <button
          onClick={() => setSelectedSem("all")}
          className={`px-4 py-2.5 rounded-xl text-xs font-mono uppercase tracking-wider border transition-all ${
            selectedSem === "all"
              ? "bg-[#00E5D4]/10 border-[#00E5D4] text-[#00E5D4] shadow-[0_0_15px_rgba(0,229,212,0.15)] font-bold"
              : "bg-white/5 border-white/10 text-white/60 hover:text-white hover:border-white/20"
          }`}
        >
          All Subjects ({subjects.length})
        </button>
        <button
          onClick={() => setSelectedSem("1")}
          className={`px-4 py-2.5 rounded-xl text-xs font-mono uppercase tracking-wider border transition-all ${
            selectedSem === "1"
              ? "bg-[#00E5D4]/10 border-[#00E5D4] text-[#00E5D4] shadow-[0_0_15px_rgba(0,229,212,0.15)] font-bold"
              : "bg-white/5 border-white/10 text-white/60 hover:text-white hover:border-white/20"
          }`}
        >
          Semester 1 (Chemistry Group)
        </button>
        <button
          onClick={() => setSelectedSem("2")}
          className={`px-4 py-2.5 rounded-xl text-xs font-mono uppercase tracking-wider border transition-all ${
            selectedSem === "2"
              ? "bg-[#00E5D4]/10 border-[#00E5D4] text-[#00E5D4] shadow-[0_0_15px_rgba(0,229,212,0.15)] font-bold"
              : "bg-white/5 border-white/10 text-white/60 hover:text-white hover:border-white/20"
          }`}
        >
          Semester 2 (Physics Group)
        </button>
      </div>

      {/* SUBJECTS GRID */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mt-8 mb-16">
        {subjectsLoading && Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="card-glass p-6 h-32 animate-pulse opacity-50" />
        ))}
        {!subjectsLoading && subjects
          .filter((s) => selectedSem === "all" || String(s.semester) === selectedSem)
          .map((s, i) => {
            const Icon = ICONS[s.name] || Atom;
            return (
              <Link
                key={s.id}
                to={`/notes/subject/${s.id}`}
                className="card-glass p-6 group animate-fade-up flex items-center gap-4 hover:border-[#00E5D4]/40 hover:shadow-[0_0_20px_rgba(0,229,212,0.05)] transition-all"
                style={{ animationDelay: `${i * 0.03}s` }}
                data-testid={`subject-card-${s.id}`}
              >
                <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-[#00E5D4]/10 border border-[#00E5D4]/30 shrink-0 group-hover:scale-105 transition-transform">
                  <Icon className="w-6 h-6 text-[#00E5D4]" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-display font-semibold text-sm md:text-base truncate group-hover:text-white transition-colors">{s.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-mono bg-white/5 px-1.5 py-0.5 rounded text-white/60 border border-white/5">
                      Sem {s.semester}
                    </span>
                    {s.credits ? (
                      <span className="text-[10px] font-mono text-white/40">{s.credits} Credits</span>
                    ) : null}
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-white/40 group-hover:text-[#00E5D4] group-hover:translate-x-1 transition" />
              </Link>
            );
          })}
      </div>
    </div>
  );
}
