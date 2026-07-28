import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api, API, LOGO_URL } from "@/lib/api";
import { ExternalLink, ArrowLeft, Loader2 } from "lucide-react";
import DocumentViewer from "@/components/DocumentViewer";

const isMobile = () =>
  typeof window !== "undefined" &&
  (/Mobi|Android|iPhone|iPad|iPod|Opera Mini/i.test(navigator.userAgent) ||
    window.innerWidth < 768);

export default function Viewer() {
  const { fileId } = useParams();
  const navigate = useNavigate();
  const [f, setF] = useState(null);
  const [error, setError] = useState("");
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    setMobile(isMobile());
    api
      .get(`/files/${fileId}`)
      .then(({ data }) => setF(data))
      .catch(() => setError("File not found"));
  }, [fileId]);

  if (error) {
    return (
      <div className="min-h-screen bg-[#05070A] flex items-center justify-center text-white/70" data-testid="viewer-error">
        <div className="text-center">
          <p className="text-lg font-medium">{error}</p>
          <button onClick={() => navigate(-1)} className="btn-neon mt-4 inline-flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" /> Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!f) {
    return (
      <div className="min-h-screen bg-[#05070A] flex flex-col items-center justify-center text-white/70 gap-3">
        <Loader2 className="w-8 h-8 text-[#00E5D4] animate-spin" />
        <span className="text-xs font-mono tracking-widest text-[#00E5D4]/80">LOADING DOCUMENT...</span>
      </div>
    );
  }

  const rawUrl = `${API}/files/${f.id}/view`;
  const ext = ((f.original_filename || f.display_name || "").split(".").pop() || "").toLowerCase();
  const isPdf = ext === "pdf";

  if (isPdf) {
    return (
      <div className="min-h-screen bg-[#05070A] py-8 md:py-12 px-4" data-testid="viewer-container">
        <div className="max-w-4xl mx-auto mb-6 flex items-center justify-between">
          <button 
            onClick={() => navigate(-1)} 
            className="btn-neon inline-flex items-center gap-2 text-xs"
            style={{ padding: "0.5rem 1rem", minHeight: "36px" }}
          >
            <ArrowLeft className="w-4 h-4" /> Go Back
          </button>
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-white/40 uppercase tracking-widest">
              Secure Viewer Mode
            </span>
          </div>
        </div>
        <DocumentViewer fileUrl={rawUrl} title={f.display_name} />
      </div>
    );
  }

  const isImage = ["png", "jpg", "jpeg", "webp", "gif"].includes(ext);
  const isOffice = ["ppt", "pptx", "doc", "docx", "xls", "xlsx"].includes(ext);

  // Office documents still use web-based preview tools
  const gviewUrl = `https://docs.google.com/gview?url=${encodeURIComponent(rawUrl)}&embedded=true`;
  const officeUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(rawUrl)}`;
  const officeSrc = mobile ? gviewUrl : officeUrl;

  return (
    <div className="min-h-screen bg-[#05070A] flex flex-col" data-testid="viewer-container">
      {/* HEADER CONTROL BAR */}
      <header className="h-16 border-b border-white/10 bg-[#0A0E14] px-4 md:px-6 flex items-center justify-between z-10 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 hover:border-white/20 transition shrink-0"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5 text-white/80" />
          </button>
          <span className="logo-frame shrink-0">
            <img src={LOGO_URL} alt="BITVERSE" className="w-8 h-8 md:w-9 md:h-9 object-contain block" />
          </span>
          <div className="min-w-0">
            <div className="text-white text-xs md:text-sm font-medium truncate">{f.display_name}</div>
            <div className="text-[9px] md:text-[10px] font-mono text-white/50 uppercase tracking-widest">
              {ext} · BITVERSE Secure Viewer
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {!isPdf && (
            <a
              href={rawUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-neon hidden sm:inline-flex"
              style={{ padding: "0.4rem 0.8rem", fontSize: "0.7rem" }}
              data-testid="viewer-open-raw"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Open Raw
            </a>
          )}
        </div>
      </header>

      {/* VIEWER CANVAS CONTAINER */}
      <div className="flex-1 bg-[#05070A] overflow-auto flex justify-center items-start p-4">
        {isImage && (
          <div className="w-full h-full flex items-center justify-center overflow-auto p-2 md:p-4">
            <img src={rawUrl} alt={f.display_name} className="max-w-full max-h-full object-contain rounded-lg shadow-2xl border border-white/5" />
          </div>
        )}

        {isOffice && (
          <iframe
            title="office-preview"
            src={officeSrc}
            className="w-full h-full border-0 rounded-lg shadow-2xl"
            allow="fullscreen"
          />
        )}

        {!isImage && !isOffice && (
          <div className="w-full h-full flex flex-col items-center justify-center gap-4 text-white/70 px-6 text-center py-12">
            <p>Preview not available for .{ext} files.</p>
          </div>
        )}
      </div>
    </div>
  );
}
