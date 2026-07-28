import { useParams, Link } from "react-router-dom";
import { API } from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import Breadcrumbs from "@/components/Breadcrumbs";
import FileCard from "@/components/FileCard";
import PaginatedList from "@/components/PaginatedList";
import { useModule, useSubject, useFiles } from "@/hooks/useQueries";
import { ArrowLeft, FileX2 } from "lucide-react";

export default function ModulePage() {
  const { moduleId } = useParams();

  const { data: mod, isLoading: loadingModule } = useModule(moduleId);
  const { data: subject, isLoading: loadingSubject } = useSubject(mod?.subject_id);
  const { data: files = [], isLoading: loadingFiles } = useFiles({ module_id: moduleId, category: "notes" });

  const loading = loadingModule || (!!mod?.subject_id && loadingSubject) || loadingFiles;

  if (loading) {
    return (
      <div className="page-enter mx-auto max-w-6xl px-6 pt-28 md:pt-32 animate-pulse">
        <Breadcrumbs 
          items={[
            { label: "Notes Hub", path: "/notes" },
            { label: "Semester ...", path: "/notes" },
            { label: "Subject ...", path: "/notes" },
            { label: "Loading..." }
          ]} 
        />
        <div className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-[#00E5D4]/40 mb-6">
          <ArrowLeft className="w-4 h-4 opacity-40" /> Back
        </div>
        
        {/* Header Skeleton */}
        <div className="space-y-4">
          <div className="h-6 w-32 bg-white/5 rounded-full border border-white/10" />
          <div className="h-10 md:h-12 w-2/3 max-w-md bg-white/10 rounded-2xl animate-pulse" />
          <div className="h-4 w-1/2 max-w-sm bg-white/5 rounded-lg" />
        </div>

        {/* Files List Skeleton */}
        <div className="mt-10 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card-glass p-5 flex items-center justify-between h-20">
              <div className="flex items-center gap-3 w-full animate-pulse">
                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-1/3 bg-white/10 rounded" />
                  <div className="h-3 w-1/4 bg-white/5 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="page-enter mx-auto max-w-6xl px-6 pt-28 md:pt-32">
      <Breadcrumbs 
        items={[
          { label: "Notes Hub", path: "/notes" },
          { label: `Semester ${subject?.semester}`, path: `/notes/sem/${subject?.semester}` },
          { label: subject?.name, path: `/notes/subject/${subject?.id}` },
          { label: mod?.name }
        ]} 
      />
      <Link
        to={subject ? `/notes/subject/${subject.id}` : "/notes"}
        className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-[#00E5D4] mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </Link>
      <PageHeader
        chip={subject ? subject.name : ""}
        title={mod ? <>{mod.name}</> : "Loading..."}
        subtitle="All files uploaded to this module."
        testid="module-header"
      />

      <div className="mt-10">
        <PaginatedList
          items={files}
          testId="module-files-list"
          renderItem={(f) => <FileCard key={f.id} file={f} apiBase={API} />}
          emptyState={
            <div className="card-glass p-12 flex flex-col items-center gap-3 text-center">
              <FileX2 className="w-10 h-10 text-[#00E5D4]/60" />
              <p className="text-white/70">No files here yet.</p>
            </div>
          }
        />
      </div>
    </div>
  );
}
