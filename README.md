# SPEKTRUM MCP Server

MCP Server für [SPEKTRUM Partner GmbH](https://spekt.ch) — stellt Produktinformationen als AI-Tools bereit.

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
