import { useParams, Link } from "react-router-dom";
import { useSubjects } from "@/hooks/useQueries";
import PageHeader from "@/components/PageHeader";
import Breadcrumbs from "@/components/Breadcrumbs";
import { ChevronRight, FlaskConical, Atom, Cpu, Sigma, Cog, Ruler, Wrench, HeartHandshake, Dna, Code2, Zap, MessageSquare, Radiation, Dumbbell, Leaf } from "lucide-react";

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

export default function SemesterPage() {
  const { sem } = useParams();
  const subjectsQuery = useSubjects(sem);
  const subjects = subjectsQuery.data || [];
  const loading = subjectsQuery.isLoading;

  return (
    <div className="page-enter mx-auto max-w-6xl px-6 pt-28 md:pt-32">
      <Breadcrumbs 
        items={[
          { label: "Notes Hub", path: "/notes" },
          { label: `Semester ${sem}` }
        ]} 
      />
      <PageHeader
        chip={`Semester ${sem}${sem === "1" ? " (C) · 22 Credits" : " (P) · 22.5 Credits"}`}
        title={<>First Year · <span className="text-[#00E5D4]">Semester {sem}{sem === "1" ? " (C)" : " (P)"}</span></>}
        subtitle={`Tap any core subject below to explore modules and resources. Total Credits: ${sem === "1" ? "22" : "22.5"}.`}
        testid="semester-header"
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mt-12">
        {loading && Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="card-glass p-6 h-32 animate-pulse opacity-50" />
        ))}
        {subjects.map((s, i) => {
          const Icon = ICONS[s.name] || Atom;
          return (
            <Link
              key={s.id}
              to={`/notes/subject/${s.id}`}
              className="card-glass p-6 group animate-fade-up flex items-center gap-4"
              style={{ animationDelay: `${i * 0.04}s` }}
              data-testid={`subject-card-${s.id}`}
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-[#00E5D4]/10 border border-[#00E5D4]/30 shrink-0">
                <Icon className="w-6 h-6 text-[#00E5D4]" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-display font-semibold text-base md:text-lg truncate">{s.name}</h3>
                {s.credits ? (
                  <div className="text-xs font-mono text-white/50 mt-0.5">{s.credits} credits</div>
                ) : null}
              </div>
              <ChevronRight className="w-5 h-5 text-white/40 group-hover:text-[#00E5D4] group-hover:translate-x-1 transition" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
