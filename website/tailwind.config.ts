import type { Config } from "tailwindcss";

/**
 * BANZA website design tokens — handoff §2 ("Norma técnica clara" + bordô).
 * Light paper base, bordô #8E1326 as the single primary accent.
 * BANZA is visually distinct from any operator's product identity: institutional, protocolar, sober.
 */
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bordo: {
          DEFAULT: "#8E1326", // primário BANZA — heros, acentos, CTAs
          deep: "#5E0C18",
          soft: "#A33547",
          rose: "#C2566A",
        },
        paper: {
          DEFAULT: "#F4F1EA",
          2: "#EFEADF",
          3: "#EDE8DD",
        },
        card: "#FFFFFF",
        panel: "#FBF8F2",
        tint: {
          gold: "#FBF3E3",
          bordo: "#FBEFF0",
          green: "#EEF5EF",
        },
        creme: {
          high: "#F8F0E2",
          mid: "#EAD6C9",
          eyebrow: "#F2C9BD",
          chip: "#F6E9DD",
        },
        seal: "#94701F",
        ok: "#2E6A4E",
        pend: "#9A6B1E",
        neg: "#8E1326",
        ink: {
          DEFAULT: "#16191E", // texto alto sobre claro
          2: "#3A3F45",
          3: "#54595F",
          4: "#6B6358",
          5: "#8A8275",
          6: "#9A968C",
        },
        monitor: "#14110F",
        line: {
          DEFAULT: "#DCD6C9",
          2: "#E4DECF",
          3: "#D8D0C0",
          soft: "#EADFCE",
        },
      },
      fontFamily: {
        serif: ["var(--font-serif)", "Source Serif 4", "Georgia", "serif"],
        display: ["var(--font-display)", "Spectral", "Georgia", "serif"],
        sans: ["var(--font-sans)", "Public Sans", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "IBM Plex Mono", "monospace"],
      },
      maxWidth: {
        read: "1080px",
        diagram: "1180px",
        site: "1280px",
        hero: "1340px",
      },
      borderRadius: {
        protocol: "2px",
        cardish: "3px",
        terminal: "4px",
      },
      letterSpacing: {
        eyebrow: "0.2em",
      },
    },
  },
  plugins: [],
};

export default config;
