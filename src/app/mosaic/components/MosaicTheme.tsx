"use client";

import React, { createContext, useContext } from "react";

// Dark Academia theme - Rich, sophisticated, scholarly aesthetic
const mosaicTheme = {
  colors: {
    // Backgrounds - Deep, moody tones
    background: "#1a1f2e", // Deep midnight blue
    backgroundSecondary: "#212738", // Slightly lighter navy
    backgroundTertiary: "#2d3446", // Tertiary dark blue

    // Text - Warm, readable contrasts
    text: "#f1e8dc", // Warm cream
    textSecondary: "#c9b8a3", // Muted gold
    textMuted: "#8b7968", // Faded bronze

    // Primary brand colors - Rich amber/gold tones
    primary: "#d4a574", // Warm amber gold
    primaryHover: "#e0b584", // Lighter amber on hover
    primaryLight: "rgba(212, 165, 116, 0.15)", // Translucent amber

    // Accent colors - Jewel tones
    success: "#5c8a72", // Forest green
    warning: "#d4a574", // Amber (same as primary for consistency)
    error: "#a85751", // Burgundy red

    // Borders - Subtle and sophisticated
    border: "rgba(212, 165, 116, 0.2)", // Translucent gold
    borderLight: "rgba(212, 165, 116, 0.1)", // Very subtle gold

    // Shadows - Deep and dramatic
    shadow: "0 2px 4px 0 rgba(0, 0, 0, 0.4), 0 1px 2px -1px rgba(0, 0, 0, 0.3)",
    shadowLg:
      "0 10px 25px -3px rgba(0, 0, 0, 0.5), 0 6px 10px -4px rgba(0, 0, 0, 0.4)",
    shadowXl:
      "0 25px 35px -5px rgba(0, 0, 0, 0.6), 0 10px 15px -6px rgba(0, 0, 0, 0.5)",
  },

  // Typography - Scholarly and elegant
  fonts: {
    heading: '"Crimson Text", "Georgia", "Times New Roman", serif',
    body: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    mono: '"Fira Code", "SF Mono", Monaco, Inconsolata, monospace',
  },

  fontSizes: {
    xs: "0.75rem", // 12px
    sm: "0.875rem", // 14px
    base: "1rem", // 16px
    lg: "1.125rem", // 18px
    xl: "1.25rem", // 20px
    "2xl": "1.5rem", // 24px
    "3xl": "1.875rem", // 30px
    "4xl": "2.25rem", // 36px
    "5xl": "3rem", // 48px
    "6xl": "3.75rem", // 60px
  },

  fontWeights: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },

  // Spacing
  spacing: {
    px: "1px",
    0: "0",
    1: "0.25rem", // 4px
    2: "0.5rem", // 8px
    3: "0.75rem", // 12px
    4: "1rem", // 16px
    5: "1.25rem", // 20px
    6: "1.5rem", // 24px
    8: "2rem", // 32px
    10: "2.5rem", // 40px
    12: "3rem", // 48px
    16: "4rem", // 64px
    20: "5rem", // 80px
    24: "6rem", // 96px
  },

  // Border radius
  radius: {
    none: "0",
    sm: "0.125rem", // 2px
    base: "0.25rem", // 4px
    md: "0.375rem", // 6px
    lg: "0.5rem", // 8px
    xl: "0.75rem", // 12px
    "2xl": "1rem", // 16px
    "3xl": "1.5rem", // 24px
    full: "9999px",
  },

  // Component styles - Rich and sophisticated
  components: {
    button: {
      primary: {
        backgroundColor: "#d4a574", // Warm amber gold
        color: "#1a1f2e", // Dark navy text for contrast
        padding: "0.875rem 1.75rem",
        borderRadius: "0.375rem", // Slightly less rounded for sophistication
        fontWeight: 600,
        fontSize: "0.95rem",
        letterSpacing: "0.025em",
        border: "1px solid rgba(212, 165, 116, 0.3)",
        cursor: "pointer",
        transition: "all 0.3s ease",
        boxShadow: "0 2px 8px 0 rgba(212, 165, 116, 0.25)",
        textTransform: "uppercase" as const,
      },
      secondary: {
        backgroundColor: "rgba(212, 165, 116, 0.08)",
        color: "#d4a574",
        padding: "0.875rem 1.75rem",
        borderRadius: "0.375rem",
        fontWeight: 500,
        fontSize: "0.95rem",
        letterSpacing: "0.025em",
        border: "1px solid rgba(212, 165, 116, 0.25)",
        cursor: "pointer",
        transition: "all 0.3s ease",
      },
    },

    card: {
      backgroundColor: "#212738", // Dark navy card
      borderRadius: "0.75rem",
      padding: "2rem",
      boxShadow: "0 4px 20px 0 rgba(0, 0, 0, 0.5)",
      border: "1px solid rgba(212, 165, 116, 0.1)",
      backgroundImage: "linear-gradient(135deg, #212738 0%, #1a1f2e 100%)",
    },

    input: {
      padding: "0.875rem 1.25rem",
      fontSize: "1rem",
      border: "2px solid rgba(212, 165, 116, 0.2)",
      borderRadius: "0.375rem",
      backgroundColor: "rgba(45, 52, 70, 0.5)", // Semi-transparent dark
      color: "#f1e8dc", // Warm cream text
      transition: "all 0.3s ease",
      outline: "none",
      backdropFilter: "blur(8px)",
    },
  },
};

const MosaicThemeContext = createContext(mosaicTheme);

export const useMosaicTheme = () => {
  const context = useContext(MosaicThemeContext);
  if (!context) {
    throw new Error("useMosaicTheme must be used within MosaicThemeProvider");
  }
  return context;
};

export const MosaicThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  return (
    <MosaicThemeContext.Provider value={mosaicTheme}>
      {children}
    </MosaicThemeContext.Provider>
  );
};

export default mosaicTheme;
