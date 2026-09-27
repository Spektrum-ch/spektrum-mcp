/**
 * Rechtsprechungssuche direkt auf entscheidsuche.ch (Elasticsearch-API).
 *
 * entscheidsuche.ch (gemeinnütziger Verein, Bern) scrapt täglich alle
 * Schweizer Gerichte — BGer/BGE und kantonale Instanzen inkl.
 * Verwaltungs- und Baurekursgerichte. Zugriff ohne API-Key, ohne
 * Rate-Limits; amtliche Urteile sind nicht urheberrechtlich geschützt.
 *
 * Raumplanungs-Kuratierung (der SPEKTRUM-Mehrwert gegenüber der Rohsuche):
 *  - Fach-Boosts je Planungsanlass (Synonyme/verwandte Begriffe)
 *  - Raumplanungs-Kontext-Boost, damit planungsrechtliche Treffer vor
 *    gleichnamigen Treffern aus anderen Rechtsgebieten ranken
 *  - Regeste/Leitsatz (abstract) und Fundstellen-Highlights im Ergebnis
 *
 * Verifizierte Feldstruktur (Stand 2026-09-25): date, canton, hierarchy[],
 * title.{de,fr,it}, reference[], abstract.{de,fr,it}, attachment.content,
 * attachment.content_url, attachment.language, id.
 */

const SUCHE_URL = "https://entscheidsuche.ch/_search.php";

export interface RechtsprechungInput {
  thema: string;
  planungsanlass?: "einzonung" | "umzonung" | "auszonung" | "gestaltungsplan" | "sondernutzungsplan";
  kanton?: string;
  nur_bundesgericht?: boolean;
  ab_datum?: string;
  sortierung?: "relevanz" | "datum";
  limit?: number;
}

// Fach-Synonyme je Planungsanlass — als Boost (should), nie als Filter,
// damit die Nutzer-Anfrage selbst immer massgebend bleibt.
const ANLASS_BOOST: Record<string, string> = {
  einzonung: "Einzonung Bauzone Baugebiet Bauzonenzuweisung",
  umzonung: "Umzonung Zonenänderung Zonenplanänderung Aufzonung",
  auszonung: "Auszonung Rückzonung Nichteinzonung materielle Enteignung",
  gestaltungsplan: "Gestaltungsplan Überbauungsplan Quartierplan Arealüberbauung",
  sondernutzungsplan: "Sondernutzungsplan Sondernutzungsplanung Spezialzone",
};

const RAUMPLANUNG_KONTEXT =
  "Raumplanung Nutzungsplanung Zonenplan Richtplan Baubewilligung RPG Raumplanungsgesetz";

/** <em>/<br>-Markup der API in lesbaren Text überführen. */
function entmarkieren(s: string): string {
  return s
    .replace(/<em>/g, "«")
    .replace(/<\/em>/g, "»")
    .replace(/<br\s*\/?>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function ersterText(mehrsprachig: Record<string, string> | undefined): string | null {
  if (!mehrsprachig) return null;
  const text = mehrsprachig.de ?? mehrsprachig.fr ?? mehrsprachig.it ?? Object.values(mehrsprachig)[0];
  return text ? entmarkieren(text) : null;
}

export async function rechtsprechungSuchen(input: RechtsprechungInput) {
  const limit = Math.min(Math.max(input.limit ?? 5, 1), 20);

  const must: unknown[] = [
    {
      simple_query_string: {
        query: input.thema,
        fields: ["attachment.content", "abstract.de^2", "abstract.fr^2", "abstract.it^2", "title.de^2", "title.fr^2", "title.it^2"],
        default_operator: "and",
      },
    },
  ];

  const should: unknown[] = [
    {
      simple_query_string: {
        query: RAUMPLANUNG_KONTEXT,
        fields: ["attachment.content"],
        default_operator: "or",
        boost: 0.3,
      },
    },
  ];
  if (input.planungsanlass && ANLASS_BOOST[input.planungsanlass]) {
    should.push({
      simple_query_string: {
        query: ANLASS_BOOST[input.planungsanlass],
        fields: ["attachment.content", "abstract.de", "title.de"],
        default_operator: "or",
        boost: 2,
      },
    });
  }

  const filter: unknown[] = [];
  if (input.nur_bundesgericht) {
    filter.push({ term: { canton: "CH" } });
  } else if (input.kanton) {
    filter.push({ term: { canton: input.kanton.toUpperCase() } });
  }
  if (input.ab_datum) {
    filter.push({ range: { date: { gte: input.ab_datum } } });
  }

  const body = {
    query: { bool: { must, should, filter } },
    size: limit,
    _source: ["date", "canton", "hierarchy", "title", "reference", "abstract", "attachment.content_url", "attachment.language"],
    highlight: {
      fields: { "attachment.content": { fragment_size: 180, number_of_fragments: 3 } },
    },
    ...(input.sortierung === "datum" ? { sort: [{ date: "desc" }] } : {}),
  };

  const res = await fetch(SUCHE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`entscheidsuche.ch antwortete mit HTTP ${res.status}`);
  }
  const data: any = await res.json();

  const treffer = (data.hits?.hits ?? []).map((h: any) => {
    const src = h._source ?? {};
    return {
      id: h._id,
      titel: ersterText(src.title) ?? h._id,
      datum: src.date ?? null,
      kanton: src.canton ?? null,
      instanz: Array.isArray(src.hierarchy) ? src.hierarchy[src.hierarchy.length - 1] : null,
      referenz: Array.isArray(src.reference) ? src.reference.join(", ") : null,
      // Regeste/Leitsatz, sofern das Gericht einen publiziert (BGE: immer)
      regeste: ersterText(src.abstract),
      fundstellen: (h.highlight?.["attachment.content"] ?? []).map(entmarkieren),
      dokument_url: src.attachment?.content_url ?? null,
      sprache: src.attachment?.language ?? null,
      relevanz_score: h._score ?? null,
    };
  });

  return {
    anfrage: {
      thema: input.thema,
      planungsanlass: input.planungsanlass ?? null,
      kanton: input.nur_bundesgericht ? "CH (Bundesgericht)" : input.kanton?.toUpperCase() ?? null,
      ab_datum: input.ab_datum ?? null,
      sortierung: input.sortierung ?? "relevanz",
    },
    anzahl_total: data.hits?.total?.value ?? treffer.length,
    treffer,
    quelle:
      "entscheidsuche.ch — gemeinnütziger Verein, tägliche Scrapes aller Schweizer Gerichte (BGer/BGE + kantonale Instanzen)",
    hinweis:
      "Regeste = amtlicher Leitsatz, wo publiziert (BGE immer, kantonale Gerichte teils). " +
      "Fundstellen sind Volltext-Ausschnitte mit «Treffer»-Markierung. " +
      "Kanton 'CH' = Bundesgerichte. Urteile vor Verwendung im Original prüfen (dokument_url).",
  };
}
