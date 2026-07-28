import { useSearchParams, useNavigate } from "react-router-dom";
import DocumentViewer from "@/components/DocumentViewer";
import { ArrowLeft } from "lucide-react";

export default function DocumentViewerPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const fileUrl = searchParams.get("url");
  const title = searchParams.get("title") || "Document Viewer";

  if (!fileUrl) {
    return (
      <div className="min-h-screen bg-[#05070A] flex flex-col items-center justify-center text-white/70 gap-4" data-testid="doc-viewer-error">
        <p className="text-lg font-medium">No file URL provided for preview.</p>
        <button onClick={() => navigate(-1)} className="btn-neon inline-flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#05070A] py-8 md:py-12 px-4" data-testid="doc-viewer-page">
      <div className="max-w-4xl mx-auto mb-6 flex items-center justify-between">
        <button 
          onClick={() => navigate(-1)} 
          className="btn-neon inline-flex items-center gap-2 text-xs"
          style={{ padding: "0.5rem 1rem", minHeight: "36px" }}
        >
          <ArrowLeft className="w-4 h-4" /> Go Back
        </button>
        <span className="text-xs font-mono text-white/40 uppercase tracking-widest">
          Secure Sandbox View
        </span>
      </div>
      <DocumentViewer fileUrl={fileUrl} title={title} />
    </div>
  );
}
