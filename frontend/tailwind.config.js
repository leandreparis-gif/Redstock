/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Charte graphique CRF 2023 — couleurs officielles
        crf: {
          // Rouge officiel : Pantone 485 C — #e30613
          rouge: '#e30613',
          'rouge-dark': '#b8000f',
          'rouge-light': '#ff1a25',
          // Sidebar claire
          sidebar: '#FFFFFF',
          // Textes et fonds
          texte: '#1a1a2e',
          'texte-soft': '#6b7280',
          fond: '#F4F6FA',
          blanc: '#FFFFFF',
          // Palette d'accompagnement CRF
          bleu: '#003882',
          'bleu-clair': '#0072CE',
          vert: '#007A53',
          jaune: '#F5A800',
          violet: '#6B2D8B',
          // Cartes colorées
          'card-bleu': '#DDE8FD',
          'card-jaune': '#FEF6C3',
          'card-vert': '#D6F5E3',
          'card-rose': '#FFE0E3',
        },
      },
      fontFamily: {
        // Poppins : police institutionnelle CRF (charte 2023)
        sans: ['Poppins', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card: '16px',
        btn: '8px',
      },
      boxShadow: {
        card: '0 2px 8px 0 rgba(0,0,0,0.06)',
        sidebar: '2px 0 12px 0 rgba(0,0,0,0.06)',
      },
    },
  },
  plugins: [],
};
