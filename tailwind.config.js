module.exports = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    container: { center: true, padding: "1rem" },
    extend: {
      borderRadius: { xl: "1rem", "2xl": "1.25rem" },
      boxShadow: {
        card: "0 10px 30px rgba(0,0,0,0.08)",
      },
    },
  },
  plugins: [],
};