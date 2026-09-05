/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        mode: {
          budget: "#2563eb", // 予算モード: 青
          settlement: "#16a34a", // 決算モード: 緑
          question: "#ea580c", // 一般質問モード: オレンジ
          citizen: "#db2777", // 市民モード: ピンク
        },
      },
    },
  },
  plugins: [],
};
