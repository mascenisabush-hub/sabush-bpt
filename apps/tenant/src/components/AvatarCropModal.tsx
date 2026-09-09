import React, { useCallback, useEffect, useRef, useState } from 'react';
import { X, ZoomIn } from 'lucide-react';

interface AvatarCropModalProps {
  file: File;
  onCancel: () => void;
  // Resolves with a compressed, square-cropped JPEG blob ready to upload.
  onConfirm: (blob: Blob) => void;
}

// Fixed output — a profile avatar never needs to be larger than this,
// and capping it here (before upload) is what actually keeps every
// avatar small in Storage, not just the 5MB hard ceiling storage.rules
// enforces server-side. 512x512 is comfortably sharp for the 32-36px
// circles this renders into (Header, Staff list, etc.) while staying
// well under a typical mobile photo's original size.
const OUTPUT_SIZE = 512;
const JPEG_QUALITY = 0.85;
const VIEWPORT_SIZE = 280;

/**
 * Self-contained square crop + compress step between "user picked a
 * file" and "file is uploaded". No cropping/compression library —
 * canvas covers both: dragging pans the image behind a fixed circular
 * viewport, the zoom slider scales it, and confirming rasterizes
 * exactly the visible circle onto an OUTPUT_SIZE canvas and exports it
 * as a JPEG at JPEG_QUALITY, which is what actually gets uploaded.
 */
export const AvatarCropModal: React.FC<AvatarCropModalProps> = ({ file, onCancel, onConfirm }) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageEl, setImageEl] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 }); // pan, in viewport px
  const [minZoom, setMinZoom] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dragState = useRef<{ startX: number; startY: number; startOffset: { x: number; y: number } } | null>(null);

  // Load the picked file into an <img>, and compute the minimum zoom
  // that still fully covers the circular viewport (shorter side of the
  // image maps to VIEWPORT_SIZE at zoom 1).
  useEffect(() => {
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    const img = new Image();
    img.onload = () => {
      const coverZoom = VIEWPORT_SIZE / Math.min(img.width, img.height);
      setMinZoom(coverZoom);
      setZoom(coverZoom);
      setOffset({ x: 0, y: 0 });
      setImageEl(img);
    };
    img.onerror = () => setError('Não foi possível ler esta imagem.');
    img.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const clampOffset = useCallback((next: { x: number; y: number }, currentZoom: number, img: HTMLImageElement) => {
    const scaledW = img.width * currentZoom;
    const scaledH = img.height * currentZoom;
    const maxX = Math.max(0, (scaledW - VIEWPORT_SIZE) / 2);
    const maxY = Math.max(0, (scaledH - VIEWPORT_SIZE) / 2);
    return {
      x: Math.min(maxX, Math.max(-maxX, next.x)),
      y: Math.min(maxY, Math.max(-maxY, next.y)),
    };
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture(e.pointerId);
    dragState.current = { startX: e.clientX, startY: e.clientY, startOffset: offset };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragState.current || !imageEl) return;
    const dx = e.clientX - dragState.current.startX;
    const dy = e.clientY - dragState.current.startY;
    setOffset(clampOffset({ x: dragState.current.startOffset.x + dx, y: dragState.current.startOffset.y + dy }, zoom, imageEl));
  };

  const handlePointerUp = () => {
    dragState.current = null;
  };

  const handleZoomChange = (nextZoom: number) => {
    if (!imageEl) return;
    setZoom(nextZoom);
    setOffset(prev => clampOffset(prev, nextZoom, imageEl));
  };

  const handleConfirm = () => {
    if (!imageEl) return;
    setError(null);
    setIsProcessing(true);
    try {
      // Map the visible VIEWPORT_SIZE circle back to source-image
      // coordinates, then draw that exact region onto the fixed
      // OUTPUT_SIZE canvas — this is the "crop" step. toBlob with a
      // JPEG quality below 1 is the "compress" step; both happen here,
      // together, before anything reaches uploadUserPhoto.
      const canvas = document.createElement('canvas');
      canvas.width = OUTPUT_SIZE;
      canvas.height = OUTPUT_SIZE;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas indisponível.');

      const scale = OUTPUT_SIZE / VIEWPORT_SIZE;
      const drawW = imageEl.width * zoom * scale;
      const drawH = imageEl.height * zoom * scale;
      const drawX = OUTPUT_SIZE / 2 - drawW / 2 + offset.x * scale;
      const drawY = OUTPUT_SIZE / 2 - drawH / 2 + offset.y * scale;

      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(imageEl, drawX, drawY, drawW, drawH);

      canvas.toBlob(
        blob => {
          setIsProcessing(false);
          if (!blob) {
            setError('Não foi possível processar a imagem. Tente novamente.');
            return;
          }
          onConfirm(blob);
        },
        'image/jpeg',
        JPEG_QUALITY
      );
    } catch (err: any) {
      setIsProcessing(false);
      setError(err?.message || 'Não foi possível processar a imagem.');
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border border-gray-200 rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-5">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Ajustar Foto de Perfil</h2>
            <p className="text-xs text-gray-500 mt-0.5">Arraste para posicionar e use o zoom para enquadrar.</p>
          </div>
          <button onClick={onCancel} className="p-1.5 text-gray-500 hover:text-gray-800 rounded-xl hover:bg-gray-50 transition shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 text-xs">{error}</div>
        )}

        <div
          className="relative mx-auto rounded-full overflow-hidden bg-gray-100 border border-gray-200 cursor-move touch-none select-none"
          style={{ width: VIEWPORT_SIZE, height: VIEWPORT_SIZE }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          {imageUrl && imageEl && (
            <img
              src={imageUrl}
              alt=""
              draggable={false}
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                width: imageEl.width * zoom,
                height: imageEl.height * zoom,
                transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px)`,
                pointerEvents: 'none',
              }}
            />
          )}
        </div>

        <div className="flex items-center gap-3">
          <ZoomIn className="w-4 h-4 text-gray-400 shrink-0" />
          <input
            type="range"
            min={minZoom}
            max={minZoom * 4}
            step={(minZoom * 4 - minZoom) / 100 || 0.01}
            value={zoom}
            onChange={e => handleZoomChange(Number(e.target.value))}
            className="w-full accent-[#D4AF37]"
            disabled={!imageEl}
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-1">
          <button type="button" onClick={onCancel} className="btn-secondary py-2.5 px-5 text-sm">
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!imageEl || isProcessing}
            className="btn-primary py-2.5 px-6 text-sm disabled:opacity-60"
          >
            {isProcessing ? 'A processar...' : 'Guardar Foto'}
          </button>
        </div>
      </div>
    </div>
  );
};
