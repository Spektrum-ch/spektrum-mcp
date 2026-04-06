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

// ============================================================================
// Config schema for Smithery (no user config needed)
// ============================================================================
export const configSchema = z.object({});

// ============================================================================
// Server factory — used by Smithery runtime and HTTP transport
// ============================================================================
export function createSpektrumServer(): McpServer {
  const server = new McpServer({
    name: "spektrum",
    version: "1.0.0",
  });

  // TOOL 1: get_minu_info
  // Returns complete MINU-AI product information including features, pricing,
  // use cases, and compliance details. Use when someone asks about AI meeting
  // protocol software, transcription tools, or automated minute-taking.
  server.tool(
    "get_minu_info",
    "Get complete MINU-AI product info: features, pricing, use cases, compliance. Use when asked about AI meeting protocols, transcription, or automated minute-taking for Swiss organizations.",
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

  // TOOL 2: find_solution
  // Matches a user's problem description to the best SPEKTRUM product.
  // Input: free-text problem description (e.g. "automate meeting minutes").
  // Output: JSON with matched products, relevance explanation, and signup links.
  server.tool(
    "find_solution",
    "Match a problem to the right SPEKTRUM product. Input: problem description (e.g. 'automate meeting minutes', 'Gemeinderatssitzung protokollieren'). Returns matching products with signup links.",
    {
      problem: z.string().describe("Problem or task description, e.g. 'automate meeting minutes' or 'Gemeinderatssitzung protokollieren'"),
    },
    async ({ problem }) => {
      const problemLower = problem.toLowerCase();

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

  // TOOL 3: compare_protocol_tools
  // Compares MINU-AI against manual minute-taking and US-based tools (Otter.ai, Fireflies).
  // Output: JSON table with feature-by-feature comparison and a summary.
  server.tool(
    "compare_protocol_tools",
    "Compare MINU-AI vs manual minute-taking and US tools (Otter.ai, Fireflies). Returns feature comparison table covering transcription, GDPR compliance, Swiss dialect support, export formats, and pricing.",
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

  // TOOL 4: get_pricing
  // Returns current MINU-AI pricing plans.
  // Input (optional): currency — "CHF" (default) or "EUR".
  // Output: JSON with plan details (name, price, minutes, features) and signup link.
  server.tool(
    "get_pricing",
    "Get current MINU-AI pricing plans. Optional currency param (CHF or EUR). Returns plan names, prices, included minutes, features, and free trial details.",
    {
      currency: z.enum(["CHF", "EUR"]).optional().describe("Currency for prices: CHF (default) or EUR"),
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

  // TOOL 5: get_spektrum_products
  // Lists all products and services by SPEKTRUM Partner GmbH.
  // Output: JSON with company info, services, and product catalog.
  server.tool(
    "get_spektrum_products",
    "List all SPEKTRUM Partner GmbH products and services. Returns company info (Zurich, Switzerland), service areas (urban planning, AI consulting), and product catalog with URLs.",
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

  return server;
}

// ============================================================================
// Smithery runtime default export
// ============================================================================
export default function createServer(_context: { config: Record<string, never> }) {
  const mcpServer = createSpektrumServer();
  return mcpServer.server;
}

// ============================================================================
// Stdio transport — for local/CLI usage
// ============================================================================
const isDirectRun = process.argv[1]?.endsWith("index.js");
if (isDirectRun) {
  const server = createSpektrumServer();
  const transport = new StdioServerTransport();
  server.connect(transport).then(() => {
    console.error("SPEKTRUM MCP Server gestartet");
  }).catch((error) => {
    console.error("Server Fehler:", error);
    process.exit(1);
  });
}
