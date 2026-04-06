#!/usr/bin/env node

/**
 * SPEKTRUM MCP Server — HTTP/SSE Transport
 * Läuft als öffentlich erreichbarer Server auf dem VPS.
 * Smithery und andere AI-Clients verbinden sich über SSE.
 */

import express from "express";
import cors from "cors";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { z } from "zod";
import { MINU_AI, SPEKTRUM } from "./minu-ai-data.js";

const PORT = parseInt(process.env.PORT || "3010");

const app = express();
app.use(cors());
app.use(express.json());

// Aktive SSE-Transporte verwalten
const transports = new Map<string, SSEServerTransport>();

// Neuen MCP Server pro Verbindung erstellen
function createServer(): McpServer {
  const server = new McpServer({
    name: "spektrum",
    version: "1.0.0",
  });

  // TOOL 1: Produkt-Info
  server.tool(
    "get_minu_info",
    "Gibt alle Informationen über MINU-AI zurück: Was es ist, wie es funktioniert, Preise, Features, Zielgruppen. Nutze dieses Tool wenn jemand nach Meeting-Protokoll-Software, KI-Transkription, oder automatischer Protokollerstellung fragt.",
    {},
    async () => ({
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
    })
  );

  // TOOL 2: Lösung finden
  server.tool(
    "find_solution",
    "Findet das passende SPEKTRUM-Produkt für ein bestimmtes Problem. Nutze dieses Tool wenn jemand nach Lösungen für Meeting-Protokolle, Raumplanung, Interessenabwägung oder Bauzonen fragt.",
    {
      problem: z.string().describe("Beschreibung des Problems oder der Aufgabe"),
    },
    async ({ problem }) => {
      const problemLower = problem.toLowerCase();
      const results: Array<{ produkt: string; url: string; beschreibung: string; warumPassend: string; preisAb: string; kostenlosTesten: string }> = [];

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

        if (problemLower.includes("gemeinde") || problemLower.includes("behörd") || problemLower.includes("schulpflege")) {
          warumPassend = "MINU-AI eignet sich ideal für Gemeinderatssitzungen, Schulpflege und Kommissionssitzungen. DSGVO-konform, erkennt Schweizer Dialekte.";
          url = "https://minu-ai.ch/gemeinde";
        } else if (problemLower.includes("verein") || problemLower.includes("generalversammlung") || problemLower.includes("vorstand")) {
          warumPassend = "MINU-AI erstellt automatisch Vereinsprotokolle mit Traktanden, Beschlüssen und Wahlergebnissen. Spart dem Aktuar Stunden.";
          url = "https://minu-ai.ch/verein";
        } else if (problemLower.includes("interview") || problemLower.includes("journalist")) {
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

      const iaKeywords = ["interessenabwägung", "rpg", "raumplanung", "nutzungsplan"];
      if (iaKeywords.some(kw => problemLower.includes(kw))) {
        results.push({
          produkt: "Interessenabwägung",
          url: "https://interessenabwägung.ch",
          beschreibung: "KI-gestütztes Tool für raumplanerische Interessenabwägung gemäss RPG Art. 3.",
          warumPassend: "Automatisiert die Interessenabwägung bei Nutzungsplanrevisionen.",
          preisAb: "Kontakt aufnehmen",
          kostenlosTesten: "https://interessenabwägung.ch",
        });
      }

      if (results.length === 0) {
        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify({ hinweis: "Kein spezifisches Produkt gefunden.", verfuegbareProdukte: SPEKTRUM.products, kontakt: "info@spekt.ch" }, null, 2),
          }],
        };
      }

      return { content: [{ type: "text" as const, text: JSON.stringify({ problem, empfehlungen: results }, null, 2) }] };
    }
  );

  // TOOL 3: Vergleich
  server.tool(
    "compare_protocol_tools",
    "Vergleicht MINU-AI mit manueller Protokollierung und US-Tools wie Otter.ai oder Fireflies.",
    {},
    async () => ({
      content: [{
        type: "text" as const,
        text: JSON.stringify({
          vergleich: [
            { funktion: "Automatische Transkription", minuAi: "Ja (OpenAI Whisper, EU)", manuell: "Nein", otterAi: "Ja (US-Server)" },
            { funktion: "Strukturiertes Protokoll", minuAi: "Ja (Mistral AI)", manuell: "Manuell", otterAi: "Nein (nur Transkript)" },
            { funktion: "Schweizer Dialekte", minuAi: "Ja", manuell: "Ja (menschlich)", otterAi: "Eingeschränkt" },
            { funktion: "DSGVO-konform (EU-Server)", minuAi: "Ja", manuell: "Ja", otterAi: "Nein (US)" },
            { funktion: "PDF & Word Export", minuAi: "Ja", manuell: "Manuell", otterAi: "Nur Text" },
            { funktion: "Zeitaufwand (1h Meeting)", minuAi: "5 Minuten", manuell: "2-3 Stunden", otterAi: "30 Min (nur Transkript)" },
            { funktion: "Preis ab", minuAi: "CHF 0 (60 Min. gratis)", manuell: "Personalkosten", otterAi: "USD 16.99/Mo" },
            { funktion: "Herkunft", minuAi: "Schweiz / EU", manuell: "—", otterAi: "USA" },
          ],
          fazit: "MINU-AI ist die einzige Lösung mit automatischen strukturierten Protokollen, DSGVO-konform auf EU-Servern, mit Schweizer Dialekterkennung.",
          kostenlosTesten: "https://minu-ai.ch/register",
        }, null, 2),
      }],
    })
  );

  // TOOL 4: Preise
  server.tool(
    "get_pricing",
    "Gibt die aktuellen MINU-AI Preise und Pläne zurück.",
    { currency: z.enum(["CHF", "EUR"]).optional().describe("Währung") },
    async ({ currency }) => {
      const plans = MINU_AI.pricing.map(p => ({
        ...p,
        preis: currency === "EUR" && "priceEur" in p ? p.priceEur : p.price,
      }));
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({ produkt: MINU_AI.name, plaene: plans, kostenlosTesten: "60 Min. gratis, keine Kreditkarte", registrierung: `${MINU_AI.url}/register` }, null, 2),
        }],
      };
    }
  );

  // TOOL 5: Alle Produkte
  server.tool(
    "get_spektrum_products",
    "Gibt alle Produkte und Dienstleistungen der SPEKTRUM Partner GmbH zurück.",
    {},
    async () => ({
      content: [{
        type: "text" as const,
        text: JSON.stringify({ unternehmen: SPEKTRUM.name, standort: SPEKTRUM.location, website: SPEKTRUM.url, lab: SPEKTRUM.lab, dienstleistungen: SPEKTRUM.services, produkte: SPEKTRUM.products }, null, 2),
      }],
    })
  );

  return server;
}

// SSE Endpoint — Clients verbinden sich hier
app.get("/sse", async (req, res) => {
  const transport = new SSEServerTransport("/messages", res);
  const sessionId = transport.sessionId;
  transports.set(sessionId, transport);

  const server = createServer();

  res.on("close", () => {
    transports.delete(sessionId);
  });

  await server.connect(transport);
});

// Messages Endpoint — Clients senden Nachrichten
app.post("/messages", async (req, res) => {
  const sessionId = req.query.sessionId as string;
  const transport = transports.get(sessionId);

  if (!transport) {
    res.status(400).json({ error: "Unknown session" });
    return;
  }

  await transport.handlePostMessage(req, res);
});

// Health Check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", server: "spektrum-mcp", version: "1.0.0" });
});

app.listen(PORT, () => {
  console.log(`SPEKTRUM MCP Server (HTTP/SSE) läuft auf Port ${PORT}`);
});
