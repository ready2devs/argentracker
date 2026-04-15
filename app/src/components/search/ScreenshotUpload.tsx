"use client";

import { useState, useRef, useCallback } from "react";

interface ScreenshotUploadProps {
  onSearch: (query: string, inputType: "screenshot") => void;
  isLoading?: boolean;
}

type UploadState = "idle" | "analyzing" | "done" | "error";

export default function ScreenshotUpload({ onSearch, isLoading }: ScreenshotUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [extractedProduct, setExtractedProduct] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const analyzeWithGemini = useCallback(
    async (file: File) => {
      setUploadState("analyzing");
      setErrorMsg(null);
      setExtractedProduct(null);

      try {
        // Convertir a base64
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(",")[1]); // solo el base64, sin el prefix
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        const res = await fetch("/api/vision", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageBase64: base64, mimeType: file.type }),
        });

        const json = await res.json();

        if (!res.ok || json.error) {
          throw new Error(json.error || "No se pudo identificar el producto.");
        }

        setExtractedProduct(json.productName);
        setUploadState("done");

        // Iniciar búsqueda automáticamente
        onSearch(json.productName, "screenshot");
      } catch (err) {
        setUploadState("error");
        setErrorMsg(err instanceof Error ? err.message : "Error analizando imagen.");
      }
    },
    [onSearch]
  );

  const handleFile = useCallback(
    (file: File) => {
      const validTypes = ["image/jpeg", "image/png", "image/webp"];
      if (!validTypes.includes(file.type)) {
        setUploadState("error");
        setErrorMsg("Solo soportamos JPG, PNG y WebP.");
        return;
      }
      setFileName(file.name);
      analyzeWithGemini(file);
    },
    [analyzeWithGemini]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const stateIcon = {
    idle: "upload_file",
    analyzing: "progress_activity",
    done: "check_circle",
    error: "error",
  }[uploadState];

  const stateColor = {
    idle: "text-primary-container",
    analyzing: "text-primary animate-spin",
    done: "text-tertiary-fixed-dim",
    error: "text-error",
  }[uploadState];

  const borderClass = {
    idle: isDragging
      ? "border-primary bg-primary-fixed/10 scale-[1.01]"
      : "border-outline-variant bg-surface-container-lowest/50 hover:bg-surface-container-lowest",
    analyzing: "border-primary/50 bg-primary-fixed/5",
    done: "border-tertiary-fixed-dim/50 bg-tertiary/5",
    error: "border-error/40 bg-error-container/30",
  }[uploadState];

  return (
    <div
      className={`group relative cursor-pointer transition-smooth ${
        isLoading || uploadState === "analyzing" ? "pointer-events-none opacity-60" : ""
      }`}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onClick={() => uploadState !== "analyzing" && inputRef.current?.click()}
    >
      <div
        id="screenshot-upload-zone"
        className={`border-2 border-dashed rounded-xl p-6 text-center transition-smooth ${borderClass}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleChange}
          className="hidden"
          id="screenshot-file-input"
        />

        <span className={`material-symbols-outlined text-4xl mb-2 block ${stateColor}`}>
          {stateIcon}
        </span>

        {uploadState === "idle" && (
          <>
            <p className="text-on-surface-variant font-medium">
              O arrastrá una captura de pantalla aquí
            </p>
            <p className="text-xs text-outline mt-1">
              Gemini AI identifica el producto automáticamente · JPG, PNG, WebP
            </p>
          </>
        )}

        {uploadState === "analyzing" && (
          <>
            <p className="text-primary font-medium">{fileName}</p>
            <p className="text-xs text-on-surface-variant mt-1 animate-pulse">
              Gemini está analizando la imagen…
            </p>
          </>
        )}

        {uploadState === "done" && (
          <>
            <p className="text-on-surface font-medium">Producto detectado:</p>
            <p className="text-sm font-bold text-primary mt-1">{extractedProduct}</p>
            <p className="text-xs text-outline mt-1">Haz clic para subir otra imagen</p>
          </>
        )}

        {uploadState === "error" && (
          <>
            <p className="text-error font-medium">{errorMsg}</p>
            <p className="text-xs text-outline mt-1">Haz clic para intentar de nuevo</p>
          </>
        )}
      </div>
    </div>
  );
}
