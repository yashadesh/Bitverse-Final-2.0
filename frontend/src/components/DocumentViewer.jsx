import { useState, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { 
  ZoomIn, 
  ZoomOut, 
  ChevronLeft, 
  ChevronRight, 
  RotateCcw, 
  Loader2, 
  X,
  Maximize2,
  Minimize2
} from "lucide-react";

// Configure GlobalWorkerOptions using local endpoint or CDN worker for react-pdf 7.x
pdfjs.GlobalWorkerOptions.workerSrc = typeof window !== "undefined"
  ? `/pdf.worker.min.js`
  : `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version || '3.4.120'}/pdf.worker.min.js`;

const isMobile = () =>
  typeof window !== "undefined" &&
  (/Mobi|Android|iPhone|iPad|iPod|Opera Mini/i.test(navigator.userAgent) ||
    window.innerWidth < 768);

export default function DocumentViewer({ fileUrl, onClose, title = "Document Viewer" }) {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.1);
  const [pdfLoading, setPdfLoading] = useState(true);
  const [error, setError] = useState("");
  const [mobile, setMobile] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // ResizeObserver to dynamically set PDF width based on container width
  const [containerWidth, setContainerWidth] = useState(850);

  useEffect(() => {
    setMobile(isMobile());
    
    // Set up a resize observer or direct window resize handler for responsiveness
    const handleResize = () => {
      const targetWidth = Math.min(window.innerWidth - 48, isFullscreen ? window.innerWidth - 64 : 850);
      setContainerWidth(targetWidth);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isFullscreen]);

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
    setPageNumber(1);
    setPdfLoading(false);
    setError("");
  };

  const onDocumentLoadError = (err) => {
    setPdfLoading(false);
    setError("Failed to load PDF. The document may be corrupted or inaccessible.");
    console.error("PDF loading error:", err);
  };

  const handlePrevPage = () => {
    setPageNumber((prev) => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setPageNumber((prev) => Math.min(prev + 1, numPages || 1));
  };

  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev + 0.2, 2.5));
  };

  const handleZoomOut = () => {
    setScale((prev) => Math.max(prev - 0.2, 0.6));
  };

  const handleResetZoom = () => {
    setScale(1.1);
  };

  const toggleFullscreen = () => {
    setIsFullscreen((prev) => !prev);
  };

  return (
    <div 
      className={`flex flex-col bg-[#05070A] border border-white/10 rounded-xl overflow-hidden shadow-2xl transition-all duration-300 ${
        isFullscreen ? "fixed inset-4 z-50 m-0" : "w-full max-w-4xl mx-auto"
      }`}
      data-testid="document-viewer-container"
    >
      {/* HEADER CONTROL BAR (No download / open raw buttons!) */}
      <header className="h-14 border-b border-white/10 bg-[#0A0E14] px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="min-w-0">
            <h3 className="text-white text-xs md:text-sm font-medium truncate">{title}</h3>
            <p className="text-[9px] md:text-[10px] font-mono text-[#00E5D4] uppercase tracking-widest">
              BITVERSE SECURE VIEWER · SECURE READING MODE
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 hover:border-white/20 transition text-white/70 hover:text-white"
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Mode"}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Optional Close Button */}
          {onClose && (
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center hover:bg-red-500/20 hover:border-red-500/30 transition text-red-400 hover:text-red-300"
              title="Close"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* PDF INNER NAVIGATION BAR */}
      {!error && numPages && (
        <div className="bg-[#0D131C] border-b border-white/5 px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-white text-sm shrink-0">
          {/* Page Navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevPage}
              disabled={pageNumber <= 1}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 disabled:opacity-30 disabled:pointer-events-none transition"
              title="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-mono text-xs text-white/90 min-w-[70px] text-center">
              Page {pageNumber} of {numPages}
            </span>
            <button
              onClick={handleNextPage}
              disabled={pageNumber >= numPages}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 disabled:opacity-30 disabled:pointer-events-none transition"
              title="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Zoom controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleZoomOut}
              disabled={scale <= 0.6}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 disabled:opacity-30 transition"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="font-mono text-xs text-white/90 w-12 text-center">
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              disabled={scale >= 2.5}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 disabled:opacity-30 transition"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={handleResetZoom}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition"
              title="Reset Zoom"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* VIEWER CANVAS CONTAINER */}
      <div className="flex-1 bg-[#05070A] overflow-auto flex justify-center items-start p-4 relative min-h-[350px]">
        {error ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-red-400 gap-3">
            <span className="font-mono text-xs uppercase tracking-widest bg-red-500/10 border border-red-500/20 px-3 py-1 rounded-full text-red-400">
              Error Loading Document
            </span>
            <p className="text-sm text-white/60 max-w-md">{error}</p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-start max-w-full transition-all duration-200">
            {pdfLoading && (
              <div className="absolute inset-0 bg-[#05070A]/85 z-10 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 text-[#00E5D4] animate-spin" />
                <span className="text-xs font-mono tracking-widest text-[#00E5D4]">RENDERING PDF DOCUMENT...</span>
              </div>
            )}
            <Document
              file={fileUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              loading=""
              className="flex justify-center"
            >
              <div className="rounded-xl overflow-hidden shadow-2xl border border-white/10 bg-white">
                <Page
                  pageNumber={pageNumber}
                  scale={scale}
                  width={containerWidth}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                  loading=""
                />
              </div>
            </Document>
          </div>
        )}
      </div>
    </div>
  );
}

// Also provide a reusable Modal container for the DocumentViewer
export function DocumentViewerModal({ fileUrl, title, isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#05070A]/80 backdrop-blur-md animate-fade-in">
      <div 
        className="absolute inset-0 cursor-pointer" 
        onClick={onClose} 
        title="Close Viewer"
      />
      <div className="relative w-full max-w-4xl z-10">
        <DocumentViewer 
          fileUrl={fileUrl} 
          title={title} 
          onClose={onClose} 
        />
      </div>
    </div>
  );
}
