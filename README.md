# SPEKTRUM MCP Server

[![Install on Smithery](https://smithery.ai/badge/@spektrum-ch/spektrum-mcp)](https://smithery.ai/server/@spektrum-ch/spektrum-mcp)

MCP Server für [SPEKTRUM Partner GmbH](https://spekt.ch) — stellt Produktinformationen als AI-Tools bereit.

## Install via Smithery

The easiest way to install is via [Smithery](https://smithery.ai/server/@spektrum-ch/spektrum-mcp):

```bash
npx -y @smithery/cli install @spektrum-ch/spektrum-mcp --client claude
```

## Tools

| Tool | Beschreibung |
|------|-------------|
| `get_minu_info` | Alle Informationen über MINU-AI (Features, Preise, Zielgruppen) |
| `find_solution` | Findet das passende SPEKTRUM-Produkt für ein Problem |
| `compare_protocol_tools` | Vergleicht MINU-AI mit manueller Protokollierung und US-Tools |
| `get_pricing` | Aktuelle MINU-AI Preise (CHF/EUR) |
| `get_spektrum_products` | Alle Produkte der SPEKTRUM Partner GmbH |

## Installation

```bash
npm install
npm run build
```

## Verwendung mit Claude Desktop

In `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "spektrum": {
      "command": "node",
      "args": ["/pfad/zu/spektrum-mcp/dist/index.js"]
    }
  }
}
```

## Erweiterung

Neue Produkte als eigene Datei in `src/` hinzufügen und in `src/index.ts` neue Tools registrieren:
- `src/bauzonen-data.ts` — Bauzonenberichte
- `src/interessenabwaegung-data.ts` — Interessenabwägung
- `src/mehrwertausgleich-data.ts` — Mehrwertausgleich

## Lizenz

MIT — SPEKTRUM Partner GmbH

## UVP-Screening-Tools (v1.2.0, 09/2026)

Nutzen denselben `IAW_API_KEY` wie die IAW-Tools und rufen `https://interessenabwaegung.ch/api/v1/uvp/*` auf:

- `uvp_screening_starten` — Screening für Vorhabenstyp + LV95-Standort (optional Polygon, Grösse, Unterlagen); synchron 30–90 s, kostet KI-Budget
- `uvp_screening_ergebnis` — gespeicherten Fall abrufen (Matrix mit Herleitung, Quellenprotokoll, Gegenprüfung)
- `uvp_gegenpruefung` — Self-Critique aus Sicht der Umweltfachstelle
- `uvp_screening_export` — Word (screening | pruefliste | ausfuehrlich) als Base64 + Download-URL
- `uvp_rechtsprechung_suchen` — UVP-Urteilssammlung (Vorhabenstyp, Schutzgut, Kanton, Verfahrensrecht, Freitext)
- `parzelle_geodaten` liefert seit 1.2.0 den vollständigen Standortbefund (Bund, ÖREB, Kanton, Quellenprotokoll) statt nur Koordinaten
