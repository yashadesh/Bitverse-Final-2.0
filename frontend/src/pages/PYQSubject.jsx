import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { API } from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import Breadcrumbs from "@/components/Breadcrumbs";
import FileCard from "@/components/FileCard";
import PaginatedList from "@/components/PaginatedList";
import { useSubject, useFiles } from "@/hooks/useQueries";
import { ArrowLeft } from "lucide-react";

const TABS = [
  { key: "mid", label: "Mid Semester" },
  { key: "end", label: "End Semester" },
  { key: "solution", label: "Solutions" },
];

export default function PYQSubject() {
  const { subjectId } = useParams();
  const [tab, setTab] = useState("mid");

  const { data: subject } = useSubject(subjectId);
  const { data: files = [] } = useFiles({ category: "pyq", subject_id: subjectId, pyq_type: tab });

  return (
    <div className="page-enter mx-auto max-w-6xl px-6 pt-28 md:pt-32">
      <Breadcrumbs 
        items={[
          { label: "PYQs Hub", path: "/pyqs" },
          { label: subject?.name || "Loading..." }
        ]} 
      />
      <Link to="/pyqs" className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-[#00E5D4] mb-6">
        <ArrowLeft className="w-4 h-4" /> Back
      </Link>
      <PageHeader
        chip={subject ? `Semester ${subject.semester}${subject.semester === 1 ? " (C)" : " (P)"}` : ""}
        title={subject ? <>{subject.name} <span className="text-[#00E5D4]">— PYQs</span></> : "Loading…"}
        subtitle="Pick a paper set below."
        testid="pyq-subject-header"
      />

      <div className="mt-8 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            data-testid={`pyq-tab-${t.key}`}
            className={`px-5 py-2.5 rounded-full text-sm font-medium tracking-wide transition-all border ${
              tab === t.key
                ? "bg-[#00E5D4]/15 text-[#00E5D4] border-[#00E5D4]/60 shadow-[0_0_20px_rgba(0,229,212,0.35)]"
                : "border-white/10 text-white/60 hover:text-white hover:border-white/25"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-8">
        <PaginatedList
          items={files}
          testId="pyq-files-list"
          renderItem={(f) => <FileCard key={f.id} file={f} apiBase={API} />}
          emptyState={
            <div className="card-glass p-10 text-center text-white/60">
              No {TABS.find((t) => t.key === tab).label} papers uploaded yet.
            </div>
          }
        />
      </div>
    </div>
  );
}
