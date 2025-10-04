"use client";

import { useEffect } from "react";
import mermaid from "mermaid";

export default function MermaidInitializer() {
  useEffect(() => {
    // Initialize mermaid globally for shared library components
    if (typeof window !== "undefined") {
      (window as any).mermaid = mermaid;
      console.log("✅ Mermaid initialized globally for code-city-landing");
    }
  }, []);

  return null;
}
