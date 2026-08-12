import { Source_Serif_4, Public_Sans, IBM_Plex_Mono, Spectral } from "next/font/google";

// Handoff §2.2 — Source Serif 4 (titles), Public Sans (UI), IBM Plex Mono (data),
// Spectral (hero display). Exposed as CSS variables consumed by Tailwind.
export const serif = Source_Serif_4({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-serif",
  display: "swap",
});

export const sans = Public_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

export const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
  display: "swap",
});

export const display = Spectral({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});
