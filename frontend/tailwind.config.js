/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        // Corpo do texto: primeiro Inter, depois Helvetica/Arial e fallback genérico
        sans: ['"Inter"', 'Helvetica', 'Arial', 'sans-serif'],
        // Para títulos ou chamadas especiais, use Inter
        display: ['"Inter"', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
