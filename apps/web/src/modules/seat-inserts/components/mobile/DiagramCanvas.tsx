import React from "react";

interface DiagramCanvasProps {
  pdfUrl: string;
  focusHotspot?: any;
  children: (scale: number, offset: { x: number; y: number }) => React.ReactNode;
}

export function DiagramCanvas({ pdfUrl, focusHotspot, children }: DiagramCanvasProps) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [scale, setScale] = React.useState(1);
  const [offset, setOffset] = React.useState({ x: 0, y: 0 });

  // Touch tracking
  const [isDragging, setIsDragging] = React.useState(false);
  const [lastTouch, setLastTouch] = React.useState<{ x: number; y: number } | null>(null);
  const [initialPinchDist, setInitialPinchDist] = React.useState<number | null>(null);
  const [initialPinchScale, setInitialPinchScale] = React.useState<number>(1);

  // Load PDF
  React.useEffect(() => {
    if (!pdfUrl) return;
    let renderTask: any;

    async function loadPdf() {
      setLoading(true);
      try {
        // @ts-ignore
        const pdfjsLib = await import("https://unpkg.com/pdfjs-dist@4.10.38/build/pdf.min.mjs");
        pdfjsLib.GlobalWorkerOptions.workerSrc = "https://unpkg.com/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs";

        const loadingTask = pdfjsLib.getDocument(pdfUrl);
        const pdf = await loadingTask.promise;
        const page = await pdf.getPage(1);

        // Render at 2.0x base scale for retina mobile clarity
        const baseScale = 2.0;
        const viewport = page.getViewport({ scale: baseScale });
        
        const canvas = canvasRef.current;
        if (!canvas) return;
        const context = canvas.getContext("2d");
        if (!context) return;

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = { canvasContext: context, viewport };
        renderTask = page.render(renderContext);
        await renderTask.promise;

        // Auto-fit to screen initially if possible
        if (containerRef.current) {
          const cw = containerRef.current.clientWidth;
          if (cw > 0 && cw < viewport.width) {
            setScale(cw / viewport.width);
          }
        }

      } catch (err: any) {
        if (err.name !== "RenderingCancelledException") {
          setError("Failed to load blueprint.");
        }
      } finally {
        setLoading(false);
      }
    }
    loadPdf();

    return () => {
       if (renderTask) renderTask.cancel();
    };
  }, [pdfUrl]);

  // Handle auto-focus
  React.useEffect(() => {
    if (focusHotspot && canvasRef.current) {
      const hX = focusHotspot.x;
      const hY = focusHotspot.y;
      
      const vW = canvasRef.current.width * scale;
      const vH = canvasRef.current.height * scale;
      
      const targetX = -(hX * vW) + (window.innerWidth / 2);
      const targetY = -(hY * vH) + (window.innerHeight / 2);

      setOffset({ x: targetX, y: targetY });
    }
  }, [focusHotspot, scale]);

  function getDistance(touches: React.TouchList) {
    return Math.hypot(
      touches[0].clientX - touches[1].clientX,
      touches[0].clientY - touches[1].clientY
    );
  }

  function handleTouchStart(e: React.TouchEvent) {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setLastTouch({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    } else if (e.touches.length === 2) {
      setIsDragging(false);
      setInitialPinchDist(getDistance(e.touches));
      setInitialPinchScale(scale);
    }
  }

  function handleTouchMove(e: React.TouchEvent) {
    // e.preventDefault();
    if (e.touches.length === 1 && isDragging && lastTouch) {
      const dx = e.touches[0].clientX - lastTouch.x;
      const dy = e.touches[0].clientY - lastTouch.y;
      setOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      setLastTouch({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    } else if (e.touches.length === 2 && initialPinchDist) {
      const currentDist = getDistance(e.touches);
      const newScale = initialPinchScale * (currentDist / initialPinchDist);
      setScale(Math.max(0.2, Math.min(newScale, 5))); // Limit zoom 0.2x to 5x
    }
  }

  function handleTouchEnd() {
    setIsDragging(false);
    setLastTouch(null);
    setInitialPinchDist(null);
  }

  return (
    <div 
      ref={containerRef}
      className="w-full h-full relative outline-none touch-none bg-gray-900 overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      {loading && <div className="absolute inset-0 flex items-center justify-center text-gray-400 z-50">Rendering Blueprint...</div>}
      {error && <div className="absolute inset-0 flex items-center justify-center text-red-500 z-50">{error}</div>}
      
      <div 
        className="absolute origin-top-left will-change-transform"
        style={{
          transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
          transition: isDragging || initialPinchDist ? 'none' : 'transform 0.2s ease-out'
        }}
      >
        <canvas ref={canvasRef} className="block shadow-xl bg-white" />
        <div className="absolute inset-0 z-10">
          {children(scale, offset)}
        </div>
      </div>
    </div>
  );
}
