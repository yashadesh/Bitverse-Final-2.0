import { Eye, FileText, FileImage, Presentation, FileType2 } from "lucide-react";

function iconFor(name) {
  const ext = (name || "").split(".").pop()?.toLowerCase();
  if (["pdf"].includes(ext)) return { Icon: FileText, color: "#ff5c5c" };
  if (["ppt", "pptx"].includes(ext)) return { Icon: Presentation, color: "#ff9f43" };
  if (["doc", "docx"].includes(ext)) return { Icon: FileType2, color: "#2e86de" };
  if (["png", "jpg", "jpeg", "webp", "gif"].includes(ext)) return { Icon: FileImage, color: "#00E5D4" };
  return { Icon: FileText, color: "#B0B8C5" };
}

function fmtSize(n) {
  if (!n) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

function fmtDate(iso) {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      day: "2-digit", month: "short", year: "numeric",
    });
  } catch { return ""; }
}

export default function FileCard({ file, apiBase }) {
  const { Icon, color } = iconFor(file.original_filename);
  const baseUrlStr = typeof apiBase === "string" ? apiBase : (apiBase?.defaults?.baseURL || "/api");
  const downloadHref = `${baseUrlStr}/files/${file.id}/download`;
  const ext = (file.original_filename || "").split(".").pop()?.toLowerCase();
  const isPdf = ext === "pdf";
  const viewUrl = isPdf ? `${baseUrlStr}/files/${file.id}/view` : `/viewer/${file.id}`;

  const handleRowClick = (e) => {
    // If user clicked on a link/anchor tag directly, let that handle itself
    if (e.target.closest('a')) {
      return;
    }
    window.open(viewUrl, "_blank");
  };

  return (
    <div 
      className="file-row group cursor-pointer" 
      data-testid={`file-card-${file.id}`}
      onClick={handleRowClick}
    >
      <a
        href={viewUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-all hover:scale-105"
        style={{ background: `${color}18`, border: `1px solid ${color}45` }}
        aria-label="View file"
      >
        <Icon className="w-5 h-5" style={{ color }} />
      </a>
      <a
        href={viewUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex-1 min-w-0 hover:opacity-80 transition-all"
        aria-label="View file"
      >
        <div className="font-medium text-white truncate group-hover:text-[#00E5D4] transition-colors">{file.display_name}</div>
        <div className="text-xs text-white/50 font-mono mt-0.5 flex gap-3">
          <span>{fmtDate(file.created_at)}</span>
          <span>·</span>
          <span>{fmtSize(file.size)}</span>
        </div>
      </a>
      <div className="flex items-center gap-2">
        <a
          href={viewUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-neon"
          style={{ padding: "0.5rem 0.9rem", fontSize: "0.7rem", minHeight: 40 }}
          data-testid={`file-view-${file.id}`}
          aria-label="View File"
        >
          <Eye className="w-3.5 h-3.5" /> <span className="hidden sm:inline">View</span>
        </a>
      </div>
    </div>
  );
}
