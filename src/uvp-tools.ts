/**
 * UVP-Screening — Action Tools für MCP (uvp.interessenabwaegung.ch).
 *
 * Rufen die REST-API /api/v1/uvp/* auf (X-API-Key wie die IAW-Tools).
 * Das Screening läuft synchron (30–90 s): Geodaten Bund/ÖREB/Kanton, KI-Matrix
 * mit Regelwerk, Massnahmen, Quellenprotokoll — dasselbe wie in der Web-UI.
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const IAW_API_BASE = process.env.IAW_API_BASE || "https://interessenabwaegung.ch/api/v1";

interface UvpContext {
  apiKey?: string;
}

async function callApi(
  path: string,
  options: { method?: string; body?: unknown; apiKey?: string } = {}
): Promise<unknown> {
  const { method = "GET", body, apiKey } = options;
  const key = apiKey || process.env.IAW_API_KEY;
  if (!key) {
    throw new Error("Kein API-Key konfiguriert. Setze IAW_API_KEY oder übergib X-API-Key Header.");
  }
  const res = await fetch(`${IAW_API_BASE}${path}`, {
    method,
    headers: { "Content-Type": "application/json", "X-API-Key": key },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`API ${res.status}: ${errorText.substring(0, 300)}`);
  }
  return res.json();
}

function jsonResult(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

const VORHABENSTYPEN = [
  "kiesgrube", "deponie", "parkhaus", "einkaufszentrum", "logistik",
  "windpark", "schiessanlage", "sportanlage", "industriegebiet", "sonstiges",
] as const;

const SCHUTZGUETER = [
  "Luft und Klima", "Lärm und Erschütterungen", "Boden", "Wasser", "Natur und Biodiversität",
  "Wald und Waldabstand", "Naturgefahren", "Altlasten und belastete Standorte", "Landschaft und Siedlungsqualität",
] as const;

export function registerUvpTools(server: McpServer, ctx: UvpContext = {}) {
  // ============================================================================
  // TOOL: uvp_screening_starten — vollständiges UVP-Screening für einen Standort
  // ============================================================================
  server.tool(
    "uvp_screening_starten",
    "Führt ein KI-gestütztes UVP-Screening (Umweltverträglichkeitsprüfung, BAFU Modul 5) für ein Vorhaben an einem Schweizer Standort durch: deterministische UVP-Pflicht nach UVPV-Anhang, Standortbefund aus Bundesinventaren, ÖREB-Kataster und kantonaler Nutzungsplanung/Gefahrenkarte (mit Negativ-Befunden und Datenlücken), Relevanzmatrix der 9 Schutzgüter mit Regelwerk-Herleitung, Massnahmen, Raumempfindlichkeit, Quellenprotokoll. Dauert 30–90 Sekunden und kostet KI-Budget — nur auf ausdrücklichen Wunsch starten. Liefert das Ergebnis plus web_url.",
    {
      projekt_titel: z.string().describe("Kurztitel des Vorhabens"),
      vorhabenstyp: z.enum(VORHABENSTYPEN).describe("Vorhabenstyp (bestimmt UVPV-Schwelle und typspezifische Prüfaspekte)"),
      groesse: z.number().optional().describe("Massgebende Grösse für die Schwellenprüfung: Parkhaus = Motorwagen, Einkaufszentrum = m² Verkaufsfläche, Kiesgrube = m³ Gesamtvolumen, Deponie = m³ (Typ A/B), Windpark = MW, Logistik = m² Lagerfläche, Sportanlage = Zuschauer"),
      gemeinde: z.string().describe("Gemeinde"),
      kanton: z.string().length(2).describe("Kantonskürzel, z.B. 'ZH'"),
      koordinaten: z.object({ x: z.number(), y: z.number() }).describe("Referenzpunkt in LV95 (x = Ost ~2'600'000, y = Nord ~1'200'000). Mit parzelle_geodaten aus Adresse/Parzelle ermittelbar."),
      polygon: z.array(z.object({ x: z.number(), y: z.number() })).min(3).optional().describe("Projektperimeter in LV95 (≥3 Punkte). Bundes-Layer werden dann flächig geprüft."),
      flaeche_ha: z.number().optional().describe("Fläche in Hektaren (ohne Polygon)"),
      beschreibung: z.string().optional().describe("Kurzbeschreibung des Vorhabens (Betrieb, Verkehr, Emissionen, Bauphasen)"),
      verfahrensstufe: z.enum(["voruntersuchung", "hauptuntersuchung"]).optional().default("voruntersuchung"),
      dokumente: z.array(z.object({ name: z.string(), content: z.string() })).max(3).optional().describe("Projektunterlagen als Volltext (max. 3; serverseitig auf ein Zeichenbudget gekürzt)"),
    },
    async (args) => {
      const data = await callApi("/uvp/screening", { method: "POST", body: args, apiKey: ctx.apiKey });
      return jsonResult(data);
    }
  );

  // ============================================================================
  // TOOL: uvp_screening_ergebnis — gespeicherten Fall abrufen
  // ============================================================================
  server.tool(
    "uvp_screening_ergebnis",
    "Ruft einen gespeicherten UVP-Screening-Fall vollständig ab: UVP-Pflicht, Relevanzmatrix mit Konfidenz und Herleitung (Regelwerk, manuelle Überstimmungen), Massnahmen, Raumempfindlichkeit, Quellenprotokoll (geprüft / Treffer / nicht prüfbar), Grundlagen-Meta, Gegenprüfung.",
    { case_id: z.string().describe("Case-ID aus uvp_screening_starten") },
    async ({ case_id }) => jsonResult(await callApi(`/uvp/${encodeURIComponent(case_id)}`, { apiKey: ctx.apiKey }))
  );

  // ============================================================================
  // TOOL: uvp_gegenpruefung — Self-Critique
  // ============================================================================
  server.tool(
    "uvp_gegenpruefung",
    "Lässt ein UVP-Screening von einem zweiten KI-Durchgang aus Sicht einer kantonalen Umweltfachstelle gegenprüfen: typspezifische Lücken, Widersprüche zu den Geodaten, Datenlücken, fehlende Rechtsgrundlagen, methodische Lücken (Anlageneinheit, Untertyp, Verkehr). Ein KI-Aufruf; Ergebnis wird am Fall gespeichert.",
    {
      case_id: z.string().describe("Case-ID"),
      force: z.boolean().optional().default(false).describe("Erneut erzeugen, auch wenn schon eine Gegenprüfung vorliegt"),
    },
    async ({ case_id, force }) => jsonResult(await callApi(`/uvp/${encodeURIComponent(case_id)}/critique`, { method: "POST", body: { force }, apiKey: ctx.apiKey }))
  );

  // ============================================================================
  // TOOL: uvp_screening_export — Word-Dokument
  // ============================================================================
  server.tool(
    "uvp_screening_export",
    "Erzeugt das Word-Dokument zu einem UVP-Screening: 'screening' (Voruntersuchung und Pflichtenheft-Entwurf), 'pruefliste' (Verfahrens- und Vollständigkeitspunkte Bund/Typ/Kanton mit Belegstatus) oder 'ausfuehrlich' (Tiefenbericht; setzt voraus, dass er in der Web-UI erstellt wurde). Liefert Dateiname, Grösse, Base64-Inhalt und eine Download-URL (mit API-Key).",
    {
      case_id: z.string().describe("Case-ID"),
      variante: z.enum(["screening", "pruefliste", "ausfuehrlich"]).optional().default("screening"),
    },
    async ({ case_id, variante }) => {
      const data = (await callApi(`/uvp/${encodeURIComponent(case_id)}/export?variante=${variante}`, { apiKey: ctx.apiKey })) as Record<string, unknown>;
      // Base64 nicht in den Chat kippen — Metadaten reichen; der Inhalt bleibt im Ergebnisobjekt abrufbar.
      const { base64, ...meta } = data;
      return jsonResult({ ...meta, base64_laenge: typeof base64 === "string" ? base64.length : 0, base64 });
    }
  );

  // ============================================================================
  // TOOL: uvp_rechtsprechung_suchen — UVP-Urteilssammlung
  // ============================================================================
  server.tool(
    "uvp_rechtsprechung_suchen",
    "Sucht in der UVP-Urteilssammlung (eigener Korpus mit eigenen Zusammenfassungen amtlicher Bundesgerichtsurteile): UVP-Pflicht, Anlageneinheit/Gesamtanlage, Voruntersuchung und Pflichtenheft, Kiesabbau, Deponien, Windenergie, Parkierung, Lärm, Gewässer- und Naturschutz. Direkt im Chat nutzbar, kein KI-Budget.",
    {
      vorhabenstyp: z.enum(VORHABENSTYPEN).optional(),
      schutzgut: z.enum(SCHUTZGUETER).optional(),
      kanton: z.string().length(2).optional(),
      nur_verfahren: z.boolean().optional().default(false).describe("Nur Urteile zum UVP-Verfahrensrecht (Pflicht, Anlageneinheit, Voruntersuchung)"),
      thema: z.string().optional().describe("Freitext in Leitsatz, Aktenzeichen, Normen"),
      limit: z.number().min(1).max(50).optional().default(10),
    },
    async (args) => jsonResult(await callApi("/uvp/rechtsprechung", { method: "POST", body: { ...args, verfahren: args.nur_verfahren }, apiKey: ctx.apiKey }))
  );
}
