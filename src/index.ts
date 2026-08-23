#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const CONFIG = {
  "name": "mcp-madagascar",
  "prefix": "madagascar",
  "title": "Madagascar",
  "description": "MCP server for Madagascar humanitarian, weather, risk, and open-data source discovery.",
  "domain": "Madagascar-focused source discovery for humanitarian data, weather/cyclone context, administrative data, and risk indicators.",
  "sources": [
    {
      "title": "HDX Madagascar API search",
      "url": "https://data.humdata.org/api/3/action/package_search?q=Madagascar&rows=1"
    },
    {
      "title": "HDX Madagascar group",
      "url": "https://data.humdata.org/api/3/action/group_show?id=mdg"
    },
    {
      "title": "Météo Madagascar climate maproom",
      "url": "https://map.meteomadagascar.mg/index.html"
    },
    {
      "title": "Open-Meteo API",
      "url": "https://open-meteo.com/"
    },
    {
      "title": "GDACS RSS",
      "url": "https://www.gdacs.org/xml/rss.xml"
    }
  ],
  "examples": [
    "Find humanitarian datasets for Madagascar.",
    "List official or widely used Madagascar risk-data sources.",
    "Get a source excerpt from the climate maproom."
  ],
  "dataGouvDefaultQuery": "Madagascar",
  "localItems": [
    "Antananarivo",
    "Toamasina",
    "Antsirabe",
    "Mahajanga",
    "Fianarantsoa",
    "Toliara",
    "Antsiranana",
    "Sambava",
    "Manakara",
    "Morondava"
  ]
} as const;

interface ToolResult {
  [key: string]: unknown;
  content: Array<{ type: 'text'; text: string }>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}

function jsonResult(data: Record<string, unknown>): ToolResult {
  return {
    content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
    structuredContent: data,
  };
}

function errorResult(message: string): ToolResult {
  const data = { error: message };
  return {
    content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
    structuredContent: data,
    isError: true,
  };
}

function normalizeText(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function htmlToText(html: string): string {
  return normalizeText(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
  );
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json,*/*',
      'User-Agent': `${CONFIG.name}/0.1 (+https://github.com/Hug0x0/${CONFIG.name})`,
    },
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} while fetching ${url}`);
  }
  return response.json() as Promise<T>;
}

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      Accept: 'text/html,text/plain,*/*',
      'User-Agent': `${CONFIG.name}/0.1 (+https://github.com/Hug0x0/${CONFIG.name})`,
    },
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} while fetching ${url}`);
  }
  return response.text();
}

function sourceByKey(key: string) {
  const normalized = key.toLowerCase();
  return CONFIG.sources.find((source, index) =>
    String(index + 1) === normalized ||
    source.title.toLowerCase().includes(normalized) ||
    source.url.toLowerCase().includes(normalized)
  );
}

const CITY_COORDINATES = [
  { name: 'Antananarivo', lat: -18.8792, lon: 47.5079 },
  { name: 'Toamasina', lat: -18.1492, lon: 49.4023 },
  { name: 'Antsirabe', lat: -19.8659, lon: 47.0333 },
  { name: 'Mahajanga', lat: -15.7167, lon: 46.3167 },
  { name: 'Fianarantsoa', lat: -21.4536, lon: 47.0857 },
  { name: 'Toliara', lat: -23.35, lon: 43.6667 },
  { name: 'Antsiranana', lat: -12.2787, lon: 49.2917 },
  { name: 'Sambava', lat: -14.2667, lon: 50.1667 },
  { name: 'Manakara', lat: -22.1333, lon: 48.0167 },
  { name: 'Morondava', lat: -20.2833, lon: 44.2833 },
] as const;

function findCity(query: string) {
  const normalized = query.toLowerCase();
  return CITY_COORDINATES.find((city) => city.name.toLowerCase().includes(normalized));
}

function resolveMadagascarLocation(city?: string, lat?: number, lon?: number) {
  const resolved = city ? findCity(city) : undefined;
  const latitude = resolved?.lat ?? lat;
  const longitude = resolved?.lon ?? lon;
  if (latitude === undefined || longitude === undefined) {
    return undefined;
  }
  return {
    location: resolved ?? { lat: latitude, lon: longitude },
    latitude,
    longitude,
  };
}

const server = new McpServer({
  name: CONFIG.name,
  version: '0.1.0',
});

server.tool(
  `${CONFIG.prefix}_get_sources`,
  `List curated official and high-value sources for ${CONFIG.title}.`,
  {},
  async () => jsonResult({
    server: CONFIG.name,
    domain: CONFIG.domain,
    sources: CONFIG.sources,
    examples: CONFIG.examples,
  })
);

server.tool(
  `${CONFIG.prefix}_search_data_gouv`,
  'Search public datasets on data.gouv.fr using the official public API.',
  {
    query: z.string().default(CONFIG.dataGouvDefaultQuery).describe('Search query.'),
    page_size: z.number().int().min(1).max(50).default(10).describe('Number of datasets to return.'),
  },
  async ({ query, page_size }) => {
    try {
      const url = new URL('https://www.data.gouv.fr/api/1/datasets/');
      url.searchParams.set('q', query);
      url.searchParams.set('page_size', String(page_size));
      const data = await fetchJson<{ data?: Array<Record<string, unknown>>; total?: number }>(url.toString());
      return jsonResult({
        query,
        total: data.total,
        datasets: (data.data ?? []).map((dataset) => ({
          id: dataset.id,
          slug: dataset.slug,
          title: dataset.title,
          page: dataset.page,
          organization: typeof dataset.organization === 'object' && dataset.organization
            ? (dataset.organization as Record<string, unknown>).name
            : undefined,
          resources_count: Array.isArray(dataset.resources) ? dataset.resources.length : undefined,
        })),
      });
    } catch (error) {
      return errorResult(error instanceof Error ? error.message : 'Failed to search data.gouv.fr');
    }
  }
);

server.tool(
  `${CONFIG.prefix}_get_dataset`,
  'Inspect one data.gouv.fr dataset by slug or id using the official public API.',
  {
    dataset: z.string().describe('Dataset slug or id.'),
  },
  async ({ dataset }) => {
    try {
      const url = `https://www.data.gouv.fr/api/1/datasets/${encodeURIComponent(dataset)}/`;
      const data = await fetchJson<Record<string, unknown>>(url);
      return jsonResult({
        id: data.id,
        slug: data.slug,
        title: data.title,
        description: data.description,
        page: data.page,
        tags: data.tags,
        resources: Array.isArray(data.resources)
          ? data.resources.slice(0, 25).map((resource) => ({
              id: resource.id,
              title: resource.title,
              type: resource.type,
              format: resource.format,
              url: resource.url,
              latest: resource.latest,
            }))
          : [],
      });
    } catch (error) {
      return errorResult(error instanceof Error ? error.message : 'Failed to inspect dataset');
    }
  }
);

server.tool(
  `${CONFIG.prefix}_fetch_source_excerpt`,
  'Fetch a short text excerpt from one curated source URL. Use source_key as a number, title keyword, or URL fragment from get_sources.',
  {
    source_key: z.string().describe('Source index, title keyword, or URL fragment.'),
    max_chars: z.number().int().min(200).max(4000).default(1200).describe('Maximum excerpt length.'),
  },
  async ({ source_key, max_chars }) => {
    try {
      const source = sourceByKey(source_key);
      if (!source) {
        return errorResult(`Unknown source: ${source_key}`);
      }
      const html = await fetchText(source.url);
      return jsonResult({
        source,
        excerpt: htmlToText(html).slice(0, max_chars),
      });
    } catch (error) {
      return errorResult(error instanceof Error ? error.message : 'Failed to fetch source excerpt');
    }
  }
);

server.tool(
  `${CONFIG.prefix}_explain_scope`,
  `Explain what this MCP is useful for and how an agent should combine its sources.`,
  {},
  async () => jsonResult({
    server: CONFIG.name,
    useful_for: CONFIG.domain,
    recommended_flow: [
      'Start with get_sources to understand trusted sources.',
      'Use search_data_gouv for discoverable French public datasets.',
      'Use get_dataset for dataset/resource inspection.',
      'Use fetch_source_excerpt for human-readable official pages.',
      'Cite official sources and avoid presenting source discovery as emergency or legal advice.',
    ],
    limitations: [
      'This is a discovery and summarization MCP, not an official authority.',
      'Some portals are HTML pages and can change without notice.',
      'For emergencies or administrative decisions, follow the competent official service.',
    ],
  })
);

server.tool(
  `${CONFIG.prefix}_list_reference_items`,
  'List built-in reference items for this MCP, when available.',
  {},
  async () => jsonResult({
    items: CONFIG.localItems,
    count: CONFIG.localItems.length,
    note: CONFIG.localItems.length > 0
      ? 'These are lightweight reference hints, not a complete authoritative dataset.'
      : 'No local reference list is bundled yet. Use the source and dataset search tools.',
  })
);

server.tool(
  'madagascar_search_hdx_datasets',
  'Search HDX / Humanitarian Data Exchange for Madagascar datasets using the CKAN API.',
  {
    query: z.string().default('Madagascar').describe('HDX search query.'),
    rows: z.number().int().min(1).max(50).default(10).describe('Number of datasets to return.'),
  },
  async ({ query, rows }) => {
    try {
      const url = new URL('https://data.humdata.org/api/3/action/package_search');
      url.searchParams.set('q', query);
      url.searchParams.set('rows', String(rows));
      const data = await fetchJson<{ result?: { count?: number; results?: Array<Record<string, unknown>> } }>(url.toString());
      const results = data.result?.results ?? [];
      return jsonResult({
        query,
        total: data.result?.count,
        datasets: results.map((dataset) => ({
          id: dataset.id,
          name: dataset.name,
          title: dataset.title,
          organization: dataset.organization && typeof dataset.organization === 'object'
            ? (dataset.organization as Record<string, unknown>).title
            : undefined,
          url: `https://data.humdata.org/dataset/${dataset.name}`,
          metadata_modified: dataset.metadata_modified,
          resources_count: Array.isArray(dataset.resources) ? dataset.resources.length : undefined,
        })),
      });
    } catch (error) {
      return errorResult(error instanceof Error ? error.message : 'Failed to search HDX datasets');
    }
  }
);

server.tool(
  'madagascar_get_gdacs_alerts',
  'Fetch GDACS RSS and return recent disaster alert entries mentioning Madagascar or tropical cyclones.',
  {
    query: z.string().default('Madagascar').describe('Text filter applied to GDACS RSS item title/description.'),
    limit: z.number().int().min(1).max(30).default(10).describe('Max alerts to return.'),
  },
  async ({ query, limit }) => {
    try {
      const xml = await fetchText('https://www.gdacs.org/xml/rss.xml');
      const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((match) => match[1]);
      const normalized = query.toLowerCase();
      const alerts = items
        .map((item) => ({
          title: htmlToText(item.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? ''),
          link: htmlToText(item.match(/<link>([\s\S]*?)<\/link>/)?.[1] ?? ''),
          published_at: htmlToText(item.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] ?? ''),
          description: htmlToText(item.match(/<description>([\s\S]*?)<\/description>/)?.[1] ?? ''),
        }))
        .filter((item) => `${item.title} ${item.description}`.toLowerCase().includes(normalized))
        .slice(0, limit);
      return jsonResult({
        source: 'https://www.gdacs.org/xml/rss.xml',
        query,
        count: alerts.length,
        alerts,
      });
    } catch (error) {
      return errorResult(error instanceof Error ? error.message : 'Failed to fetch GDACS alerts');
    }
  }
);

server.tool(
  'madagascar_get_weather',
  'Fetch current weather from Open-Meteo for a Madagascar reference city or explicit coordinates.',
  {
    city: z.string().optional().describe('Known city: Antananarivo, Toamasina, Antsirabe, Mahajanga, Fianarantsoa, Toliara, Antsiranana, Sambava, Manakara, Morondava.'),
    lat: z.number().optional().describe('Latitude if city is omitted.'),
    lon: z.number().optional().describe('Longitude if city is omitted.'),
  },
  async ({ city, lat, lon }) => {
    try {
      const resolved = resolveMadagascarLocation(city, lat, lon);
      if (!resolved) {
        return errorResult('Provide either a known city or both lat/lon.');
      }
      const url = new URL('https://api.open-meteo.com/v1/forecast');
      url.searchParams.set('latitude', String(resolved.latitude));
      url.searchParams.set('longitude', String(resolved.longitude));
      url.searchParams.set('current', 'temperature_2m,relative_humidity_2m,precipitation,rain,wind_speed_10m,wind_direction_10m');
      url.searchParams.set('timezone', 'Indian/Antananarivo');
      const data = await fetchJson<Record<string, unknown>>(url.toString());
      return jsonResult({
        location: resolved.location,
        source: url.toString(),
        current: data.current,
        units: data.current_units,
      });
    } catch (error) {
      return errorResult(error instanceof Error ? error.message : 'Failed to fetch Madagascar weather');
    }
  }
);

server.tool(
  'madagascar_get_weather_forecast',
  'Fetch a short daily weather forecast from Open-Meteo for a Madagascar reference city or explicit coordinates.',
  {
    city: z.string().optional().describe('Known city: Antananarivo, Toamasina, Antsirabe, Mahajanga, Fianarantsoa, Toliara, Antsiranana, Sambava, Manakara, Morondava.'),
    lat: z.number().optional().describe('Latitude if city is omitted.'),
    lon: z.number().optional().describe('Longitude if city is omitted.'),
    forecast_days: z.number().int().min(1).max(7).default(3).describe('Number of forecast days to return.'),
  },
  async ({ city, lat, lon, forecast_days }) => {
    try {
      const resolved = resolveMadagascarLocation(city, lat, lon);
      if (!resolved) {
        return errorResult('Provide either a known city or both lat/lon.');
      }
      const url = new URL('https://api.open-meteo.com/v1/forecast');
      url.searchParams.set('latitude', String(resolved.latitude));
      url.searchParams.set('longitude', String(resolved.longitude));
      url.searchParams.set('daily', 'temperature_2m_max,temperature_2m_min,precipitation_sum,rain_sum,wind_speed_10m_max,wind_gusts_10m_max');
      url.searchParams.set('forecast_days', String(forecast_days));
      url.searchParams.set('timezone', 'Indian/Antananarivo');
      const data = await fetchJson<Record<string, unknown>>(url.toString());
      return jsonResult({
        location: resolved.location,
        forecast_days,
        source: url.toString(),
        daily: data.daily,
        units: data.daily_units,
      });
    } catch (error) {
      return errorResult(error instanceof Error ? error.message : 'Failed to fetch Madagascar weather forecast');
    }
  }
);

async function main(): Promise<void> {
  await server.connect(new StdioServerTransport());
  console.error(`${CONFIG.name} running on stdio`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
