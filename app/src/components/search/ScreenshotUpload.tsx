"use client";

import { useState, useRef, useCallback } from "react";

interface ScreenshotUploadProps {
  onUpload: (file: File) => void;
  isLoading?: boolean;
}

export default function ScreenshotUpload({
  onUpload,
  isLoading,
}: ScreenshotUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      const validTypes = ["image/jpeg", "image/png", "image/webp"];
      if (!validTypes.includes(file.type)) {
        alert("Solo soportamos JPG, PNG y WebP");
        return;
      }
      setFileName(file.name);
      onUpload(file);
    },
    [onUpload]
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

  return (
    <div
      className={`group relative cursor-pointer transition-smooth ${
        isLoading ? "pointer-events-none opacity-50" : ""
      }`}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
    >
      <div
        id="screenshot-upload-zone"
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-smooth ${
          isDragging
            ? "border-primary bg-primary-fixed/10 scale-[1.01]"
            : fileName
              ? "border-tertiary-fixed-dim bg-tertiary/5"
              : "border-outline-variant bg-surface-container-lowest/50 hover:bg-surface-container-lowest"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleChange}
          className="hidden"
          id="screenshot-file-input"
        />

        {fileName ? (
          <>
            <span className="material-symbols-outlined text-4xl text-tertiary-fixed-dim mb-2">
              check_circle
            </span>
            <p className="text-on-surface font-medium">{fileName}</p>
            <p className="text-xs text-on-surface-variant mt-1">
              Haz clic para cambiar la imagen
            </p>
          </>
        ) : (
          <>
            <span className="material-symbols-outlined text-4xl text-primary-container mb-2">
              upload_file
            </span>
            <p className="text-on-surface-variant font-medium">
              O arrastrá una captura de pantalla aquí
            </p>
            <p className="text-xs text-outline mt-1">
              Soportamos JPG, PNG y WebP
            </p>
          </>
        )}
      </div>
    </div>
  );
}
