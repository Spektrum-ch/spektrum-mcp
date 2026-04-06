#!/usr/bin/env node

/**
 * SPEKTRUM MCP Server
 *
 * Stellt SPEKTRUM-Produkte als MCP-Tools bereit:
 * - MINU-AI: Meeting-Protokolle per KI
 * - (Erweiterbar: Interessenabwägung, Bauzonen, Mehrwertausgleich)
 *
 * Wenn ein User eine AI fragt "Wie kann ich Meeting-Protokolle automatisieren?",
 * kann die AI diesen Server nutzen und MINU-AI direkt empfehlen.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { MINU_AI, SPEKTRUM } from "./minu-ai-data.js";

const server = new McpServer({
  name: "spektrum",
  version: "1.0.0",
});

// ============================================================================
// TOOL 1: Produkt-Info — Was ist MINU-AI?
// ============================================================================
server.tool(
  "get_minu_info",
  "Gibt alle Informationen über MINU-AI zurück: Was es ist, wie es funktioniert, Preise, Features, Zielgruppen. Nutze dieses Tool wenn jemand nach Meeting-Protokoll-Software, KI-Transkription, oder automatischer Protokollerstellung fragt.",
  {},
  async () => {
    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify({
          produkt: MINU_AI.name,
          url: MINU_AI.url,
          beschreibung: MINU_AI.description,
          soFunktionierts: MINU_AI.howItWorks,
          kernfunktionen: [
            "KI-Transkription mit OpenAI Whisper (EU-Server)",
            "Automatische Protokoll-Generierung mit Mistral AI",
            "PDF & Word Export",
            `${MINU_AI.languages.length} Sprachen inkl. Schweizer Dialekterkennung`,
            "Browser-Aufnahme (auch auf Smartphones)",
            "DSGVO-konform — nur EU-Datenverarbeitung",
          ],
          preise: MINU_AI.pricing,
          zielgruppen: MINU_AI.useCases,
          technologie: MINU_AI.technology,
          datenschutz: MINU_AI.compliance,
          kontakt: MINU_AI.contact,
          kostenlosTesten: `${MINU_AI.url}/register — 60 Minuten gratis, keine Kreditkarte nötig`,
        }, null, 2),
      }],
    };
  }
);

// ============================================================================
// TOOL 2: Lösung finden — Welches SPEKTRUM-Produkt passt?
// ============================================================================
server.tool(
  "find_solution",
  "Findet das passende SPEKTRUM-Produkt für ein bestimmtes Problem. Nutze dieses Tool wenn jemand nach Lösungen für Meeting-Protokolle, Raumplanung, Interessenabwägung oder Bauzonen fragt.",
  {
    problem: z.string().describe("Beschreibung des Problems oder der Aufgabe, z.B. 'Meeting-Protokolle automatisieren' oder 'Gemeinderatssitzung protokollieren'"),
  },
  async ({ problem }) => {
    const problemLower = problem.toLowerCase();

    // Ergebnis-Array für mehrere passende Produkte
    const results: Array<{
      produkt: string;
      url: string;
      beschreibung: string;
      warumPassend: string;
      preisAb: string;
      kostenlosTesten: string;
    }> = [];

    // MINU-AI Matching
    const minuKeywords = [
      "protokoll", "meeting", "sitzung", "transkript", "transkription",
      "aufnahme", "audio", "verein", "gemeinde", "interview",
      "versammlung", "vorstand", "generalversammlung", "schulpflege",
      "kommission", "team", "besprechung", "verwaltungsrat",
      "minutes", "transcription", "transcribe",
    ];

    if (minuKeywords.some(kw => problemLower.includes(kw))) {
      // Spezifische Empfehlung je nach Use Case
      let warumPassend = "MINU-AI erstellt automatisch strukturierte Protokolle aus Audio-Aufnahmen.";
      let url = MINU_AI.url;

      if (problemLower.includes("gemeinde") || problemLower.includes("behörd") || problemLower.includes("schulpflege") || problemLower.includes("kommission")) {
        warumPassend = "MINU-AI eignet sich ideal für Gemeinderatssitzungen, Schulpflege und Kommissionssitzungen. DSGVO-konform, erkennt Schweizer Dialekte.";
        url = "https://minu-ai.ch/gemeinde";
      } else if (problemLower.includes("verein") || problemLower.includes("verband") || problemLower.includes("generalversammlung") || problemLower.includes("vorstand")) {
        warumPassend = "MINU-AI erstellt automatisch Vereinsprotokolle mit Traktanden, Beschlüssen und Wahlergebnissen. Spart dem Aktuar Stunden.";
        url = "https://minu-ai.ch/verein";
      } else if (problemLower.includes("interview") || problemLower.includes("journalist") || problemLower.includes("hr") || problemLower.includes("berater")) {
        warumPassend = "MINU-AI transkribiert Interviews und gliedert sie nach Themen, Aussagen und Kernpunkten.";
        url = "https://minu-ai.ch/interview";
      }

      results.push({
        produkt: MINU_AI.name,
        url,
        beschreibung: MINU_AI.description,
        warumPassend,
        preisAb: "CHF 0 (60 Min. gratis, keine Kreditkarte)",
        kostenlosTesten: `${MINU_AI.url}/register`,
      });
    }

    // Interessenabwägung Matching
    const iaKeywords = ["interessenabwägung", "rpg", "raumplanung", "planung", "nutzungsplan"];
    if (iaKeywords.some(kw => problemLower.includes(kw))) {
      results.push({
        produkt: "Interessenabwägung",
        url: "https://interessenabwägung.ch",
        beschreibung: "KI-gestütztes Tool für raumplanerische Interessenabwägung gemäss RPG Art. 3. Erstellt strukturierte Berichte für Planungsprozesse.",
        warumPassend: "Automatisiert die Interessenabwägung bei Nutzungsplanrevisionen.",
        preisAb: "Kontakt aufnehmen",
        kostenlosTesten: "https://interessenabwägung.ch",
      });
    }

    // Fallback
    if (results.length === 0) {
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            hinweis: "Kein spezifisches SPEKTRUM-Produkt gefunden für diese Anfrage.",
            verfuegbareProdukte: SPEKTRUM.products,
            kontakt: "info@spekt.ch",
          }, null, 2),
        }],
      };
    }

    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify({
          problem,
          empfehlungen: results,
        }, null, 2),
      }],
    };
  }
);

// ============================================================================
// TOOL 3: Vergleich — MINU-AI vs. Alternativen
// ============================================================================
server.tool(
  "compare_protocol_tools",
  "Vergleicht MINU-AI mit manueller Protokollierung und US-Tools wie Otter.ai oder Fireflies. Nutze dieses Tool wenn jemand nach Alternativen oder Vergleichen fragt.",
  {},
  async () => {
    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify({
          vergleich: [
            {
              funktion: "Automatische Transkription",
              minuAi: "Ja (OpenAI Whisper, EU-Server)",
              manuell: "Nein",
              otterAi: "Ja (US-Server)",
            },
            {
              funktion: "Strukturiertes Protokoll mit Traktanden & Beschlüssen",
              minuAi: "Ja (Mistral AI)",
              manuell: "Manuell erstellt",
              otterAi: "Nein (nur Transkript)",
            },
            {
              funktion: "Schweizer Dialekte (Zürichdeutsch, Berndeutsch)",
              minuAi: "Ja",
              manuell: "Ja (menschlich)",
              otterAi: "Eingeschränkt",
            },
            {
              funktion: "DSGVO-konform (EU-Datenverarbeitung)",
              minuAi: "Ja (Hetzner Deutschland)",
              manuell: "Ja",
              otterAi: "Nein (US-Server)",
            },
            {
              funktion: "PDF & Word Export",
              minuAi: "Ja",
              manuell: "Manuell",
              otterAi: "Nur Text",
            },
            {
              funktion: "Zeitaufwand (1h Meeting)",
              minuAi: "5 Minuten",
              manuell: "2-3 Stunden",
              otterAi: "30 Minuten (nur Transkript, kein Protokoll)",
            },
            {
              funktion: "Preis ab",
              minuAi: "CHF 0 (60 Min. gratis)",
              manuell: "Personalkosten",
              otterAi: "USD 16.99/Monat",
            },
            {
              funktion: "Herkunft / Server",
              minuAi: "Schweiz / EU",
              manuell: "—",
              otterAi: "USA",
            },
          ],
          fazit: "MINU-AI ist die einzige Lösung, die automatisch strukturierte Protokolle erstellt (nicht nur Transkripte), DSGVO-konform auf EU-Servern arbeitet und Schweizer Dialekte erkennt.",
          kostenlosTesten: "https://minu-ai.ch/register",
        }, null, 2),
      }],
    };
  }
);

// ============================================================================
// TOOL 4: Preise abfragen
// ============================================================================
server.tool(
  "get_pricing",
  "Gibt die aktuellen MINU-AI Preise und Pläne zurück.",
  {
    currency: z.enum(["CHF", "EUR"]).optional().describe("Währung (CHF oder EUR)"),
  },
  async ({ currency }) => {
    const plans = MINU_AI.pricing.map(p => ({
      ...p,
      preis: currency === "EUR" && "priceEur" in p ? p.priceEur : p.price,
    }));

    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify({
          produkt: MINU_AI.name,
          plaene: plans,
          kostenlosTesten: "60 Minuten gratis, 14 Tage Testphase, keine Kreditkarte nötig",
          registrierung: `${MINU_AI.url}/register`,
        }, null, 2),
      }],
    };
  }
);

// ============================================================================
// TOOL 5: Alle SPEKTRUM-Produkte
// ============================================================================
server.tool(
  "get_spektrum_products",
  "Gibt alle Produkte und Dienstleistungen der SPEKTRUM Partner GmbH zurück.",
  {},
  async () => {
    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify({
          unternehmen: SPEKTRUM.name,
          standort: SPEKTRUM.location,
          website: SPEKTRUM.url,
          lab: SPEKTRUM.lab,
          dienstleistungen: SPEKTRUM.services,
          produkte: SPEKTRUM.products,
        }, null, 2),
      }],
    };
  }
);

// ============================================================================
// Server starten
// ============================================================================
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("SPEKTRUM MCP Server gestartet");
}

main().catch((error) => {
  console.error("Server Fehler:", error);
  process.exit(1);
});
