/**
 * Mirrors the @theme tokens in index.css so the styleguide can list them.
 * `surface` tokens are backgrounds/borders, not text colors.
 */
export const COLOR_TOKENS = [
  { name: "plaster", surface: true, hex: "#f8f6f2", use: "Page background" },
  { name: "limestone", surface: true, hex: "#efece6", use: "Cards" },
  { name: "sand", surface: true, hex: "#e0dbd2", use: "Borders" },
  { name: "ash", hex: "#6f695f", use: "Secondary text" },
  { name: "smoke", hex: "#5c5850", use: "Body copy, muted" },
  { name: "ink", hex: "#1d1c1a", use: "Primary text" },
  { name: "navy", hex: "#1f2a3c", use: "Primary buttons, sidebar" },
  { name: "camel", hex: "#b8926a", use: "Stale (rail only)" },
  { name: "sandstone", hex: "#a9a790", use: "Accent" },
  { name: "sandstone-light", hex: "#d9d6c6", use: "Sidebar labels" },
  { name: "aare", hex: "#3b8a86", use: "Hover, on track" },
  { name: "roof", hex: "#9a4b32", use: "Overdue" },
  { name: "gold", hex: "#c49a3a", use: "Due soon (rail only)" },
] as const;

/** Text colors actually used for small text, and the surfaces they sit on. */
export const TEXT_ON_SURFACE = {
  text: [
    { name: "ink", hex: "#1d1c1a" },
    { name: "smoke", hex: "#5c5850" },
    { name: "ash", hex: "#6f695f" },
    { name: "badge-overdue (roof)", hex: "#9a4b32" },
    { name: "badge-soon", hex: "#7c5f1c" },
    { name: "badge-ok", hex: "#2f6e6b" },
  ],
  surfaces: [
    { name: "plaster", hex: "#f8f6f2" },
    { name: "limestone", hex: "#efece6" },
  ],
} as const;
