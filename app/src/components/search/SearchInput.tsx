"use client";

import { useState, useRef } from "react";

interface SearchInputProps {
  onSearch: (value: string) => void;
  isLoading?: boolean;
}

export default function SearchInput({ onSearch, isLoading }: SearchInputProps) {
  const [url, setUrl] = useState("");

  const handleSubmit = () => {
    if (url.trim()) {
      onSearch(url.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSubmit();
  };

  return (
    <div className="flex flex-col md:flex-row gap-3">
      <div className="flex-grow relative">
        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">
          link
        </span>
        <input
          id="search-url-input"
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Pegá el link de Mercado Libre aquí..."
          className="w-full pl-12 pr-4 py-4 rounded-full border-none bg-surface-container-lowest text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary-container"
          style={{ boxShadow: "0px 2px 8px rgba(24, 28, 29, 0.04)" }}
          disabled={isLoading}
        />
      </div>
      <button
        id="btn-analyze"
        onClick={handleSubmit}
        disabled={isLoading || !url.trim()}
        className="gradient-cta text-on-primary px-8 py-4 rounded-full font-bold hover:opacity-90 transition-smooth flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <>
            Analizando
            <span className="material-symbols-outlined animate-spin">
              progress_activity
            </span>
          </>
        ) : (
          <>
            Analizar
            <span className="material-symbols-outlined">analytics</span>
          </>
        )}
      </button>
    </div>
  );
}
