/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        serif: ['Lora', 'Georgia', 'serif'],
      },
      colors: {
        evernote: {
          green:    '#D97757',   // Claude orange
          dark:     '#15110D',   // warmest black
          sidebar:  '#1C1814',   // sidebar bg
          panel:    '#221D18',   // note list bg
          editor:   '#FAFAF7',   // editor bg (warm white)
          border:   '#3A3028',   // warm border
          text:     '#EAE0D4',   // primary text
          muted:    '#9A8878',   // muted text
          hover:    '#2C2419',   // hover state
          selected: '#3D2A17',   // selected (amber tint)
        }
      }
    },
  },
  plugins: [],
}
