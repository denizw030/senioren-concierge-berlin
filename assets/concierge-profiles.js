(() => {
  "use strict";

  const profiles = {
    nilo: { name: "Nilo", description: "Klar, ruhig und strukturiert.", image: "assets/NAHWERK-Concierge-Nilo.png" },
    mira: { name: "Mira", description: "Warm, verständlich und aufmerksam.", image: "assets/NAHWERK-Concierge-Mira.png" },
    lena: { name: "Lena", description: "Modern, empathisch und lösungsorientiert.", image: "assets/NAHWERK-Concierge-Lena.png" },
    lukas: { name: "Lukas", description: "Souverän, direkt und zuverlässig.", image: "assets/NAHWERK-Concierge-Lukas.png" },
    hartmut: { name: "Hartmut", description: "Besonnen, erfahren und verlässlich.", image: "assets/HARTMUT-Deutsch-NAHWERK-Concierge.png" },
    frida: { name: "Frida", description: "Herzlich, geduldig und zugewandt.", image: "assets/FRIDA-Deutsch-NAHWERK-Concierge.png" },
    asha: { name: "Asha", description: "Aufmerksam, positiv und klar.", image: "assets/ASHA-HINDI-NAHWERK-Concierge.png" },
    sari: { name: "Sari", description: "Ruhig, freundlich und umsichtig.", image: "assets/SARI-Indonesisch-NAHWERK-Concierge.png" },
    leyla: { name: "Leyla", description: "Herzlich, direkt und tatkräftig.", image: "assets/LEYLA-Türkisch-NAHWERK-Concierge.png" },
    noor: { name: "Noor", description: "Ruhig, feinfühlig und aufmerksam.", image: "assets/NOOR-Levantisch-Arabisch-NAHWERK-Concierge.png" },
    sofia: { name: "Sofia", description: "Lebendig, strukturiert und herzlich.", image: "assets/SOFIA-Spanisch-Mediterran-NAHWERK-Concierge.png" },
    camille: { name: "Camille", description: "Elegant, aufmerksam und besonnen.", image: "assets/CAMILLE-Französisch-NAHWERK-Concierge.png" },
    anna: { name: "Anna", description: "Pragmatisch, warm und zuverlässig.", image: "assets/ANNA-Polnisch-NAHWERK-Concierge.png" },
    olena: { name: "Olena", description: "Ruhig, gefasst und lösungsorientiert.", image: "assets/OLENA_Ukrainisch-NAHWERK-Concierge.png" },
    mei: { name: "Mei", description: "Präzise, freundlich und aufmerksam.", image: "assets/MEI-Chinesisch-NAHWERK-Concierge.png" },
    amara: { name: "Amara", description: "Positiv, geerdet und zugewandt.", image: "assets/AMARA-Ghanisch-NAHWERK-Concierge.png" },
    kwame: { name: "Kwame", description: "Souverän, ruhig und zuverlässig.", image: "assets/KWAME-Ghanisch-NAHWERK-Concierge.png" },
    zuri: { name: "Zuri", description: "Warm, lebendig und aufmerksam.", image: "assets/ZURI-Kenianisch-NAHWERK-Concierge.png" },
    jabari: { name: "Jabari", description: "Gelassen, klar und lösungsorientiert.", image: "assets/JABARI-Kenianisch-NAHWERK-Concierge.png" },
    arjun: { name: "Arjun", description: "Ruhig, analytisch und hilfsbereit.", image: "assets/ARJUN-Indisch-NAHWERK-Concierge.png" },
    wei: { name: "Wei", description: "Zurückhaltend, präzise und verlässlich.", image: "assets/WEI-Chinesisch-NAHWERK-Concierge.png" },
    yuki: { name: "Yuki", description: "Freundlich, aufmerksam und umsichtig.", image: "assets/JUKI-Japanisch-NAHWERK-Concierge.png" },
    ren: { name: "Ren", description: "Klar, ausgeglichen und zuverlässig.", image: "assets/REN-Japanisch-NAHWERK-Concierge.png" }
  };

  const languages = {
    de: { label: "Deutsch", locale: "de-DE" },
    en: { label: "English", locale: "en" },
    tr: { label: "Türkçe", locale: "tr" },
    ar: { label: "العربية", locale: "ar" },
    es: { label: "Español", locale: "es" },
    fr: { label: "Français", locale: "fr" },
    pl: { label: "Polski", locale: "pl" },
    uk: { label: "Українська", locale: "uk" },
    zh: { label: "中文", locale: "zh" },
    hi: { label: "हिन्दी", locale: "hi" },
    id: { label: "Bahasa Indonesia", locale: "id" },
    ja: { label: "日本語", locale: "ja" }
  };

  Object.values(profiles).forEach(Object.freeze);
  Object.values(languages).forEach(Object.freeze);
  window.NAHWERK_CONCIERGE_PROFILES = Object.freeze(profiles);
  window.NAHWERK_SUPPORTED_LANGUAGES = Object.freeze(languages);
})();
