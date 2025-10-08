/** @type {import('tailwindcss').Config} */
const tailwindConfig = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    container: { center: true, padding: "1rem" },
    extend: {
       colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: "var(--primary)",
        "primary-foreground": "var(--primary-foreground)",
        accent: "var(--accent)",
        "accent-foreground": "var(--accent-foreground)",
        ring: "var(--ring)",
        muted: "var(--muted)",
        "muted-foreground": "var(--muted-foreground)",
        card: "var(--card)",
        "card-foreground": "var(--card-foreground)",
        // Optional common aliases:
        border: "color-mix(in oklab, var(--foreground) 12%, transparent)",
      },
      borderRadius: { xl: "1rem", "2xl": "1.25rem" },
      boxShadow: { card: "0 10px 30px rgba(0,0,0,0.08)" },
    },
  },
  plugins: [],
};

export default tailwindConfig;