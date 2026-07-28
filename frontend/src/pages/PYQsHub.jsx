import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useSubjects } from "@/hooks/useQueries";
import PageHeader from "@/components/PageHeader";
import Breadcrumbs from "@/components/Breadcrumbs";
import { FileText, ChevronRight } from "lucide-react";

export default function PYQsHub() {
  const sem1Query = useSubjects(1);
  const sem2Query = useSubjects(2);

  const subjects = useMemo(() => {
    return [...(sem1Query.data || []), ...(sem2Query.data || [])];
  }, [sem1Query.data, sem2Query.data]);

  return (
    <div className="page-enter mx-auto max-w-6xl px-6 pt-28 md:pt-32">
      <Breadcrumbs items={[{ label: "PYQs Hub" }]} />
      <PageHeader
        chip="Previous Year Questions"
        title={<>Every <span className="text-[#00E5D4]">paper</span>, every subject</>}
        subtitle="Mid-semesters, end-semesters and solutions — pick a subject to begin."
        testid="pyqs-hub-header"
      />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mt-12">
        {subjects.map((s, i) => (
          <Link
            key={s.id}
            to={`/pyqs/subject/${s.id}`}
            className="card-glass p-5 group animate-fade-up flex items-center gap-4"
            style={{ animationDelay: `${i * 0.03}s` }}
            data-testid={`pyq-subject-${s.id}`}
          >
            <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-[#00E5D4]/10 border border-[#00E5D4]/30">
              <FileText className="w-5 h-5 text-[#00E5D4]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-display font-semibold truncate">{s.name}</div>
              <div className="text-xs font-mono text-white/50 mt-0.5">Semester {s.semester}{s.semester === 1 ? " (C)" : " (P)"}</div>
            </div>
            <ChevronRight className="w-5 h-5 text-white/40 group-hover:text-[#00E5D4] group-hover:translate-x-1 transition" />
          </Link>
        ))}
      </div>
    </div>
  );
}
