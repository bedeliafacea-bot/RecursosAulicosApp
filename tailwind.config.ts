import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        uap: {
          azul: "#003C71",
          "azul-oscuro": "#002f5a",
          "azul-medio": "#0b5ea8",
          "azul-profundo": "#002447",
          celeste: "#eaf6ff",
          fondo: "#f4f8fc",
          texto: "#173b68",
          gris: "#6d7e92",
          borde: "#d8e3ef",
          verde: "#25a64a",
          naranja: "#f97316",
        },
      },
      boxShadow: {
        uap: "0 14px 34px rgba(10, 45, 86, .16)",
        "uap-suave": "0 10px 24px rgba(12, 45, 82, .10)",
        "uap-card": "0 18px 38px rgba(12, 45, 82, .16)",
      },
    },
  },
  plugins: [],
};

export default config;
