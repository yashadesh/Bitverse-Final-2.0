import { useParams, Link } from "react-router-dom";
import { API } from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import Breadcrumbs from "@/components/Breadcrumbs";
import FileCard from "@/components/FileCard";
import PaginatedList from "@/components/PaginatedList";
import { HeaderSkeleton, FileCardSkeleton } from "@/components/Skeletons";
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
      <div className="page-enter mx-auto max-w-6xl px-6 pt-28 md:pt-32">
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
        <HeaderSkeleton />

        {/* Files List Skeleton */}
        <div className="mt-10 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <FileCardSkeleton key={i} />
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
