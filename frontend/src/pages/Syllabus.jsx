import { API } from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import Breadcrumbs from "@/components/Breadcrumbs";
import FileCard from "@/components/FileCard";
import { useSubjects, useFiles } from "@/hooks/useQueries";
import { ScrollText } from "lucide-react";

function SyllabusCard({ n, subs, files }) {
  const credits = subs.reduce((a, s) => a + (s.credits || 0), 0);
  return (
    <div className="card-glass p-8 animate-fade-up" data-testid={`syllabus-card-${n}`}>
      <div className="flex items-start justify-between">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-[#00E5D4]/10 border border-[#00E5D4]/30">
          <ScrollText className="w-6 h-6 text-[#00E5D4]" />
        </div>
        <span className="chip">{credits} Credits</span>
      </div>
      <h3 className="font-display text-2xl md:text-3xl font-bold mt-5">Semester {n}{n === 1 ? " (C)" : " (P)"}</h3>
      <ul className="mt-4 space-y-2">
        {subs.map((s) => (
          <li key={s.id} className="flex items-center justify-between text-sm text-white/80 border-b border-white/5 pb-2">
            <span>{s.name}</span>
            <span className="font-mono text-white/40 text-xs">{s.credits ?? "-"} cr</span>
          </li>
        ))}
      </ul>
      {files.length > 0 && (
        <div className="mt-6 space-y-2">
          <div className="text-xs font-mono text-white/50 uppercase tracking-widest">Official Syllabi</div>
          {files.map((f) => <FileCard key={f.id} file={f} apiBase={API} />)}
        </div>
      )}
    </div>
  );
}

export default function Syllabus() {
  const sem1Query = useSubjects(1);
  const sem2Query = useSubjects(2);
  const files1Query = useFiles({ category: "syllabus", semester: 1 });
  const files2Query = useFiles({ category: "syllabus", semester: 2 });

  const sem1 = sem1Query.data || [];
  const sem2 = sem2Query.data || [];
  const files1 = files1Query.data || [];
  const files2 = files2Query.data || [];

  return (
    <div className="page-enter mx-auto max-w-6xl px-6 pt-28 md:pt-32">
      <Breadcrumbs items={[{ label: "Syllabus" }]} />
      <PageHeader
        chip="Syllabus"
        title={<>First Year <span className="text-[#00E5D4]">Curriculum</span></>}
        subtitle="Full subject list, credits and official syllabus PDFs."
        testid="syllabus-header"
      />
      <div className="grid gap-6 md:grid-cols-2 mt-12">
        <SyllabusCard n={1} subs={sem1} files={files1} />
        <SyllabusCard n={2} subs={sem2} files={files2} />
      </div>
    </div>
  );
}
