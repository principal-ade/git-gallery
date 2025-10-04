import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Color Palette - Git Gallery",
  description:
    "Explore the Git Gallery color palette for different file types. See how extensions are mapped to colors and render strategies.",
};

export default function ColorPaletteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
