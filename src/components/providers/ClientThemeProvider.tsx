"use client";

import { ThemeProvider } from "themed-markdown";

export default function ClientThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ThemeProvider>{children as any}</ThemeProvider>;
}
