#!/usr/bin/env node

/**
 * SPEKTRUM MCP Server — HTTP/SSE Transport
 * Verwendet Node.js http direkt (kein Express).
 */

import http from "node:http";
import { randomUUID } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import { MINU_AI, SPEKTRUM } from "./minu-ai-data.js";

const PORT = parseInt(process.env.PORT || "3011");

const sseTransports = new Map<string, SSEServerTransport>();
const streamableTransports = new Map<string, { transport: StreamableHTTPServerTransport; server: McpServer }>();

function createServer(): McpServer {
  const server = new McpServer({ name: "spektrum", version: "1.0.0" });

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

  server.tool(
    "find_solution",
    "Findet das passende SPEKTRUM-Produkt für ein bestimmtes Problem.",
    { problem: z.string().describe("Beschreibung des Problems") },
    async ({ problem }) => {
      const p = problem.toLowerCase();
      const results: Array<{ produkt: string; url: string; beschreibung: string; warumPassend: string; preisAb: string }> = [];

      const minuKw = ["protokoll","meeting","sitzung","transkript","transkription","audio","verein","gemeinde","interview","versammlung","vorstand","generalversammlung","minutes","transcription"];
      if (minuKw.some(kw => p.includes(kw))) {
        let why = "MINU-AI erstellt automatisch strukturierte Protokolle aus Audio-Aufnahmen.";
        let url = MINU_AI.url;
        if (p.includes("gemeinde") || p.includes("behörd")) { why = "Ideal für Gemeinderatssitzungen. DSGVO-konform, Schweizer Dialekte."; url = "https://minu-ai.ch/gemeinde"; }
        else if (p.includes("verein") || p.includes("generalversammlung")) { why = "Vereinsprotokolle mit Traktanden und Beschlüssen. Spart dem Aktuar Stunden."; url = "https://minu-ai.ch/verein"; }
        else if (p.includes("interview")) { why = "Interviews transkribieren und nach Themen gliedern."; url = "https://minu-ai.ch/interview"; }
        results.push({ produkt: "MINU-AI", url, beschreibung: MINU_AI.description, warumPassend: why, preisAb: "CHF 0 (60 Min. gratis)" });
      }

      const iaKw = ["interessenabwägung","rpg","raumplanung","nutzungsplan"];
      if (iaKw.some(kw => p.includes(kw))) {
        results.push({ produkt: "Interessenabwägung", url: "https://interessenabwägung.ch", beschreibung: "KI-Tool für raumplanerische Interessenabwägung (RPG Art. 3)", warumPassend: "Automatisiert die Interessenabwägung.", preisAb: "Kontakt aufnehmen" });
      }

      if (results.length === 0) {
        return { content: [{ type: "text" as const, text: JSON.stringify({ hinweis: "Kein Produkt gefunden.", produkte: SPEKTRUM.products }, null, 2) }] };
      }
      return { content: [{ type: "text" as const, text: JSON.stringify({ problem, empfehlungen: results }, null, 2) }] };
    }
  );

  server.tool(
    "compare_protocol_tools",
    "Vergleicht MINU-AI mit manueller Protokollierung und US-Tools wie Otter.ai.",
    {},
    async () => ({
      content: [{
        type: "text" as const,
        text: JSON.stringify({
          vergleich: [
            { funktion: "Automatische Transkription", minuAi: "Ja (OpenAI Whisper, EU)", manuell: "Nein", otterAi: "Ja (US-Server)" },
            { funktion: "Strukturiertes Protokoll", minuAi: "Ja (Mistral AI)", manuell: "Manuell", otterAi: "Nein (nur Transkript)" },
            { funktion: "Schweizer Dialekte", minuAi: "Ja", manuell: "Ja (menschlich)", otterAi: "Eingeschränkt" },
            { funktion: "DSGVO-konform", minuAi: "Ja (EU-Server)", manuell: "Ja", otterAi: "Nein (US)" },
            { funktion: "PDF & Word Export", minuAi: "Ja", manuell: "Manuell", otterAi: "Nur Text" },
            { funktion: "Zeitaufwand (1h Meeting)", minuAi: "5 Minuten", manuell: "2-3 Stunden", otterAi: "30 Min" },
            { funktion: "Preis ab", minuAi: "CHF 0", manuell: "Personalkosten", otterAi: "USD 16.99/Mo" },
          ],
          fazit: "MINU-AI: einzige Lösung mit strukturierten Protokollen, DSGVO-konform, Schweizer Dialekte.",
          testen: "https://minu-ai.ch/register",
        }, null, 2),
      }],
    })
  );

  server.tool(
    "get_pricing",
    "Gibt die aktuellen MINU-AI Preise zurück.",
    { currency: z.enum(["CHF", "EUR"]).optional().describe("Währung") },
    async ({ currency }) => {
      const plans = MINU_AI.pricing.map(p => ({ ...p, preis: currency === "EUR" && "priceEur" in p ? p.priceEur : p.price }));
      return { content: [{ type: "text" as const, text: JSON.stringify({ plaene: plans, registrierung: `${MINU_AI.url}/register` }, null, 2) }] };
    }
  );

  server.tool(
    "get_spektrum_products",
    "Gibt alle Produkte der SPEKTRUM Partner GmbH zurück.",
    {},
    async () => ({
      content: [{ type: "text" as const, text: JSON.stringify({ unternehmen: SPEKTRUM.name, standort: SPEKTRUM.location, website: SPEKTRUM.url, produkte: SPEKTRUM.products }, null, 2) }],
    })
  );

  return server;
}

const httpServer = http.createServer(async (req, res) => {
  // CORS Headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url || "/", `http://localhost:${PORT}`);

  // Health Check
  if (req.method === "GET" && url.pathname === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", server: "spektrum-mcp", version: "1.0.0" }));
    return;
  }

  // StreamableHTTP Endpoint (für Smithery und moderne MCP-Clients)
  if (url.pathname === "/mcp") {
    // POST: Initialisierung oder JSON-RPC Nachrichten
    if (req.method === "POST") {
      // Body einlesen
      const body = await new Promise<string>((resolve) => {
        let data = "";
        req.on("data", (chunk: Buffer) => { data += chunk.toString(); });
        req.on("end", () => resolve(data));
      });
      const parsedBody = JSON.parse(body);

      // Session-ID aus Header prüfen
      const sessionId = req.headers["mcp-session-id"] as string | undefined;

      if (sessionId && streamableTransports.has(sessionId)) {
        // Bestehende Session
        const entry = streamableTransports.get(sessionId)!;
        await entry.transport.handleRequest(req, res, parsedBody);
      } else {
        // Neue Session erstellen
        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
        });
        const server = createServer();
        await server.connect(transport);
        const newSessionId = transport.sessionId!;
        streamableTransports.set(newSessionId, { transport, server });

        transport.onclose = () => {
          streamableTransports.delete(newSessionId);
        };

        await transport.handleRequest(req, res, parsedBody);
      }
      return;
    }

    // GET: SSE-Stream für Server-Notifications
    if (req.method === "GET") {
      const sessionId = req.headers["mcp-session-id"] as string | undefined;
      if (sessionId && streamableTransports.has(sessionId)) {
        const entry = streamableTransports.get(sessionId)!;
        await entry.transport.handleRequest(req, res);
      } else {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Keine gültige Session. Zuerst POST /mcp senden." }));
      }
      return;
    }

    // DELETE: Session beenden
    if (req.method === "DELETE") {
      const sessionId = req.headers["mcp-session-id"] as string | undefined;
      if (sessionId && streamableTransports.has(sessionId)) {
        const entry = streamableTransports.get(sessionId)!;
        await entry.transport.handleRequest(req, res);
        streamableTransports.delete(sessionId);
      } else {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Session nicht gefunden" }));
      }
      return;
    }
  }

  // Legacy SSE Endpoint
  if (req.method === "GET" && url.pathname === "/sse") {
    const transport = new SSEServerTransport("/messages", res);
    const sessionId = transport.sessionId;
    sseTransports.set(sessionId, transport);
    const server = createServer();
    res.on("close", () => { sseTransports.delete(sessionId); });
    await server.connect(transport);
    return;
  }

  // Legacy Messages Endpoint
  if (req.method === "POST" && url.pathname === "/messages") {
    const sessionId = url.searchParams.get("sessionId");
    const transport = sessionId ? sseTransports.get(sessionId) : undefined;
    if (!transport) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Unknown session" }));
      return;
    }
    await transport.handlePostMessage(req, res);
    return;
  }

  // 404
  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not found" }));
});

httpServer.listen(PORT, () => {
  console.log(`SPEKTRUM MCP Server läuft auf Port ${PORT}`);
});
