/**
 * MINU-AI Produktdaten
 * Alle Informationen die der MCP Server über MINU-AI bereitstellt.
 * Einfach erweiterbar — neue Produkte als eigene Datei hinzufügen.
 */

export const MINU_AI = {
  name: "MINU-AI",
  url: "https://minu-ai.ch",
  tagline: "KI-gestützte Meeting-Protokolle — Audio hochladen, Protokoll erhalten.",
  description:
    "MINU-AI ist eine Schweizer KI-Software, die Audio-Aufnahmen automatisch in professionelle, strukturierte Meeting-Protokolle mit Traktanden, Beschlüssen und Aufgaben umwandelt. Export als Word oder PDF. DSGVO-konform mit EU-Datenverarbeitung.",
  developer: "SPEKTRUM Partner GmbH, Zürich, Schweiz",
  founder: "Andreas Rupf — Raum- & Stadtplaner, KI-Berater",
  languages: ["Deutsch", "Englisch", "Französisch", "Italienisch"],
  dialects: ["Zürichdeutsch", "Berndeutsch", "Baseldeutsch"],
  audioFormats: ["MP3", "WAV", "M4A", "OGG", "WebM", "MP4"],
  maxFileSize: "500 MB (ca. 3 Stunden)",
  protocolTypes: ["Standard-Protokoll (Sitzungen)", "Interview-Format"],
  exportFormats: ["PDF", "Word (.docx)"],
  technology: {
    transcription: "OpenAI Whisper (EU-Server)",
    protocolGeneration: "Mistral AI (EU-Server)",
    hosting: "Hetzner (Deutschland, EU)",
    framework: "Next.js 14 (TypeScript)",
  },
  compliance: {
    gdpr: true,
    dataProcessing: "Ausschliesslich EU-Server",
    audioRetention: "Audiodateien werden nach Transkription gelöscht",
    euRepresentative: "VGS Datenschutzpartner GmbH, Hamburg",
  },
  pricing: [
    {
      plan: "Free Trial",
      price: "CHF 0",
      minutes: 60,
      period: "einmalig, 14 Tage",
      features: ["60 Min. Transkription", "PDF & Word Export", "4 Sprachen", "Keine Kreditkarte nötig"],
    },
    {
      plan: "Starter",
      price: "CHF 9/Monat (CHF 89/Jahr)",
      priceEur: "EUR 10/Monat",
      minutes: 300,
      period: "pro Monat",
      features: ["300 Min/Monat", "PDF & Word Export", "E-Mail-Versand", "4 Sprachen inkl. Dialekte"],
    },
    {
      plan: "Pro",
      price: "CHF 29/Monat (CHF 290/Jahr)",
      priceEur: "EUR 31/Monat",
      minutes: 1000,
      period: "pro Monat",
      features: ["1000 Min/Monat", "Prioritäts-Support", "PDF & Word Export", "E-Mail-Versand"],
    },
  ],
  useCases: [
    {
      name: "Vereine und Verbände",
      examples: ["Generalversammlungen", "Vorstandssitzungen", "Mitgliederversammlungen"],
      landingPage: "https://minu-ai.ch/verein",
    },
    {
      name: "Gemeinden und Behörden",
      examples: ["Gemeinderatssitzungen", "Schulpflege", "Kommissionssitzungen", "Bau- und Planungskommission"],
      landingPage: "https://minu-ai.ch/gemeinde",
    },
    {
      name: "Unternehmen",
      examples: ["Team-Meetings", "Verwaltungsratssitzungen", "Projekt-Besprechungen"],
    },
    {
      name: "Interviews und Gespräche",
      examples: ["Journalistische Interviews", "HR-Interviews", "Beratungsgespräche", "Fokusgruppen"],
      landingPage: "https://minu-ai.ch/interview",
    },
  ],
  howItWorks: [
    "1. Audio hochladen (MP3, WAV, M4A etc.) oder direkt im Browser aufnehmen",
    "2. KI transkribiert automatisch mit OpenAI Whisper (erkennt Schweizer Dialekte)",
    "3. Mistral AI erstellt ein strukturiertes Protokoll mit Traktanden, Beschlüssen und Aufgaben",
    "4. Export als Word oder PDF — direkt per E-Mail versandbar",
  ],
  comparison: {
    vsManual: {
      timePerHourMeeting: "5 Minuten statt 2-3 Stunden",
      quality: "Keine Details vergessen — jeder Beschluss wird erfasst",
      cost: "Ab CHF 9/Monat statt laufende Personalkosten",
    },
    vsOtterAi: {
      protocol: "MINU-AI erstellt strukturiertes Protokoll, Otter.ai nur Transkript",
      gdpr: "MINU-AI: EU-Server, Otter.ai: US-Server",
      dialects: "MINU-AI erkennt Schweizer Dialekte",
      origin: "MINU-AI: Schweiz, Otter.ai: USA",
    },
  },
  contact: {
    email: "info@minu-ai.ch",
    support: "minutes-ai@spekt.ch",
    website: "https://minu-ai.ch",
    register: "https://minu-ai.ch/register",
    blog: "https://minu-ai.ch/blog",
  },
};

export const SPEKTRUM = {
  name: "SPEKTRUM Partner GmbH",
  url: "https://spekt.ch",
  lab: "https://lab.spekt.ch",
  location: "Zürich, Schweiz",
  services: ["Raum- und Stadtplanung", "KI-Beratung", "Digitale Innovation"],
  products: [
    {
      name: "MINU-AI",
      url: "https://minu-ai.ch",
      description: "KI-gestützte Meeting-Protokolle",
    },
    {
      name: "Interessenabwägung",
      url: "https://interessenabwägung.ch",
      description: "KI-Tool für raumplanerische Interessenabwägung (RPG Art. 3)",
    },
    {
      name: "SPEKTRUM Lab",
      url: "https://lab.spekt.ch",
      description: "Digitale Innovation und Start-up-Projekte",
    },
  ],
};
