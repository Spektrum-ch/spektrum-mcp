/**
 * Interessenabwägung — Action Tools für MCP
 *
 * Diese Tools rufen die REST-API von interessenabwaegung.ch auf.
 * Der API-Key wird via Environment-Variable IAW_API_KEY oder per
 * Request-Header (Remote-Mode) übergeben.
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const IAW_API_BASE = process.env.IAW_API_BASE || "https://interessenabwaegung.ch/api/v1";

interface IawContext {
  apiKey?: string;
}

async function callIawApi(
  path: string,
  options: { method?: string; body?: unknown; apiKey?: string } = {}
): Promise<unknown> {
  const { method = "GET", body, apiKey } = options;
  const key = apiKey || process.env.IAW_API_KEY;

  if (!key) {
    throw new Error(
      "Kein API-Key konfiguriert. Setze IAW_API_KEY oder übergib X-API-Key Header."
    );
  }

  const res = await fetch(`${IAW_API_BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": key,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`API ${res.status}: ${errorText.substring(0, 200)}`);
  }

  return res.json();
}

function jsonResult(data: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
}

export function registerIawTools(server: McpServer, ctx: IawContext = {}) {
  // ============================================================================
  // TOOL: iaw_starten — Erstellt eine neue Interessenabwägung
  // ============================================================================
  server.tool(
    "iaw_starten",
    "Startet eine neue Interessenabwägung für ein Schweizer Planungsgeschäft (RPV Art. 3). Liefert eine Case-ID und einen Web-Link, unter dem der Nutzer die Abwägung gewichten und den finalen Bericht generieren kann. WICHTIG: Die eigentliche Bewertung erfolgt durch den Menschen im Web-UI (Human-in-the-Loop).",
    {
      gemeinde: z.string().describe("Schweizer Gemeinde, z.B. 'Chur', 'Zürich'"),
      kanton: z.string().describe("Kantons-Kürzel, z.B. 'GR', 'ZH', 'BE'"),
      parzelle: z.string().optional().describe("Parzellennummer (optional)"),
      planungsanlass: z
        .enum([
          "einzonung",
          "umzonung",
          "auszonung",
          "gestaltungsplan",
          "sondernutzungsplan",
          "richtplan",
          "ueberpruefung",
        ])
        .describe("Art des Planungsverfahrens"),
      beschreibung: z
        .string()
        .describe("Kurzbeschreibung des Vorhabens (1-3 Sätze)"),
    },
    async (args) => {
      const data = await callIawApi("/iaw/start", {
        method: "POST",
        body: args,
        apiKey: ctx.apiKey,
      });
      return jsonResult({
        ...((data as object) || {}),
        hinweis:
          "Die Abwägung wurde vorbereitet. Der Nutzer muss im Web-UI Interessen gewichten und Argumente reviewen.",
      });
    }
  );

  // ============================================================================
  // TOOL: iaw_status — Status einer laufenden IAW abrufen
  // ============================================================================
  server.tool(
    "iaw_status",
    "Ruft den aktuellen Status einer Interessenabwägung ab: Wurde sie bearbeitet, gewichtet, abgeschlossen? Nutze dies, um zu prüfen, ob der Mensch die Abwägung im Web-UI bereits abgeschlossen hat.",
    {
      case_id: z.string().describe("Case-ID aus iaw_starten"),
    },
    async ({ case_id }) => {
      const data = await callIawApi(`/iaw/${encodeURIComponent(case_id)}/status`, {
        apiKey: ctx.apiKey,
      });
      return jsonResult(data);
    }
  );

  // ============================================================================
  // TOOL: iaw_export — Word-Export einer fertigen IAW
  // ============================================================================
  server.tool(
    "iaw_export",
    "Erstellt einen Word-Export für eine abgeschlossene Interessenabwägung. Voraussetzung: Status muss 'completed' sein. Liefert eine Download-URL.",
    {
      case_id: z.string().describe("Case-ID einer abgeschlossenen IAW"),
      format: z
        .enum(["docx", "pdf"])
        .optional()
        .default("docx")
        .describe("Export-Format (docx oder pdf)"),
    },
    async ({ case_id, format }) => {
      const data = await callIawApi(
        `/iaw/${encodeURIComponent(case_id)}/export?format=${format}`,
        { method: "POST", apiKey: ctx.apiKey }
      );
      return jsonResult(data);
    }
  );

  // ============================================================================
  // TOOL: rechtsprechung_suchen — Schweizer Gerichtsentscheide finden
  // ============================================================================
  server.tool(
    "rechtsprechung_suchen",
    "Sucht relevante Schweizer Gerichtsentscheide zu raumplanungsrechtlichen Fragen. Datenquelle: entscheidsuche.ch (Bundesgericht, Bundesverwaltungsgericht, Kantone). Direkt im Chat nutzbar — kein Human-in-the-Loop nötig.",
    {
      thema: z.string().describe("Thema oder Stichwort, z.B. 'Einzonung Fruchtfolgeflächen'"),
      planungsanlass: z
        .enum([
          "einzonung",
          "umzonung",
          "auszonung",
          "gestaltungsplan",
          "sondernutzungsplan",
        ])
        .optional(),
      kanton: z
        .string()
        .optional()
        .describe("Kantons-Kürzel zum Filtern (z.B. 'ZH')"),
      limit: z.number().min(1).max(20).optional().default(5),
    },
    async (args) => {
      const data = await callIawApi("/rechtsprechung/suche", {
        method: "POST",
        body: args,
        apiKey: ctx.apiKey,
      });
      return jsonResult(data);
    }
  );

  // ============================================================================
  // TOOL: parzelle_geodaten — Geodaten für eine Parzelle abrufen
  // ============================================================================
  server.tool(
    "parzelle_geodaten",
    "Ruft Geodaten für eine Schweizer Parzelle ab: Nutzungszone, ÖV-Güteklasse, Schutzgebiete (BLN, ISOS, Moor), Naturgefahren, Fruchtfolgeflächen, Sachpläne des Bundes (FFF, SIL, SIN, SÜL etc.). Quelle: ÖREB-Kataster, Swisstopo, kantonale GIS-Dienste. Direkt im Chat nutzbar — kein Human-in-the-Loop.",
    {
      gemeinde: z.string().describe("Gemeindename"),
      kanton: z.string().describe("Kantons-Kürzel"),
      parzelle: z.string().optional().describe("Parzellennummer"),
      adresse: z.string().optional().describe("Adresse (alternative zu Parzelle)"),
    },
    async (args) => {
      const data = await callIawApi("/parzelle/geodaten", {
        method: "POST",
        body: args,
        apiKey: ctx.apiKey,
      });
      return jsonResult(data);
    }
  );

  // ============================================================================
  // TOOL: iaw_upload_document — Lädt ein Dokument für eine IAW hoch
  // ============================================================================
  server.tool(
    "iaw_upload_document",
    "Lädt ein Dokument (PDF, Word, Bild) für eine IAW hoch. Dokumente werden indexiert und können bei der Bericht-Generierung verwendet werden.",
    {
      case_id: z.string().describe("Case-ID aus iaw_starten"),
      filename: z.string().describe("Dateiname (z.B. 'Zonenplan.pdf')"),
      content_type: z
        .enum(["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "image/jpeg", "image/png"])
        .describe("MIME-Type der Datei"),
      file_base64: z
        .string()
        .describe("Datei-Inhalt als Base64-encoded String (max 10MB)"),
    },
    async (args) => {
      // Decode Base64 zu Buffer
      const buffer = Buffer.from(args.file_base64, 'base64');

      // Validate size
      if (buffer.length > 10 * 1024 * 1024) {
        throw new Error('File size exceeds 10MB limit');
      }

      // Create FormData (Node.js doesn't have native FormData, use form-data package)
      // For now, call the REST API with binary data
      const res = await fetch(`${IAW_API_BASE}/iaw/${encodeURIComponent(args.case_id)}/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': args.content_type,
          'X-File-Name': encodeURIComponent(args.filename),
          'X-API-Key': ctx.apiKey || process.env.IAW_API_KEY || '',
        },
        body: buffer,
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Upload failed: ${res.status} - ${errorText.substring(0, 200)}`);
      }

      const data = await res.json();
      return jsonResult({
        ...((data as object) || {}),
        hinweis: 'Dokument hochgeladen und wird für die IAW indexiert',
      });
    }
  );

  // ============================================================================
  // TOOL: iaw_list_documents — Listet alle Dokumente einer IAW auf
  // ============================================================================
  server.tool(
    "iaw_list_documents",
    "Listet alle hochgeladenen Dokumente einer IAW auf.",
    {
      case_id: z.string().describe("Case-ID aus iaw_starten"),
    },
    async ({ case_id }) => {
      const data = await callIawApi(`/iaw/${encodeURIComponent(case_id)}/upload`, {
        apiKey: ctx.apiKey,
      });
      return jsonResult(data);
    }
  );
}
