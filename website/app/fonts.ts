import localFont from "next/font/local";

// Handoff §2.2 — Source Serif 4 (titles), Public Sans (UI), IBM Plex Mono (data),
// Spectral (hero display). Exposed as CSS variables consumed by Tailwind.
//
// Self-hosted from ./fonts, NOT next/font/google. next/font/google fetches the font files from
// fonts.gstatic.com during `next build`, which made the production build depend on outbound network
// access — a merge-blocking CI context has failed on exactly that. The typography is unchanged; only
// where the bytes come from changed. See ./fonts/README.md for the sources and licences.
//
// Source Serif 4 and Public Sans ship as variable fonts covering the whole weight range in one file,
// so they declare a range rather than four identical copies. IBM Plex Mono and Spectral are static
// per weight.

export const serif = localFont({
  src: [{ path: "./fonts/source-serif-4-variable.woff2", weight: "400 700", style: "normal" }],
  variable: "--font-serif",
  display: "swap",
});

export const sans = localFont({
  src: [{ path: "./fonts/public-sans-variable.woff2", weight: "400 700", style: "normal" }],
  variable: "--font-sans",
  display: "swap",
});

export const mono = localFont({
  src: [
    { path: "./fonts/ibm-plex-mono-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/ibm-plex-mono-500.woff2", weight: "500", style: "normal" },
    { path: "./fonts/ibm-plex-mono-600.woff2", weight: "600", style: "normal" },
  ],
  variable: "--font-mono",
  display: "swap",
});

export const display = localFont({
  src: [
    { path: "./fonts/spectral-500.woff2", weight: "500", style: "normal" },
    { path: "./fonts/spectral-600.woff2", weight: "600", style: "normal" },
    { path: "./fonts/spectral-700.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-display",
  display: "swap",
});
