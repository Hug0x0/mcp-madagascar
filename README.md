# mcp-madagascar

MCP server for Madagascar humanitarian, weather, risk, and open-data source discovery.

## Scope

Madagascar-focused source discovery for humanitarian data, weather/cyclone context, administrative data, and risk indicators.

## Tools

- `madagascar_get_sources`
- `madagascar_search_data_gouv`
- `madagascar_get_dataset`
- `madagascar_fetch_source_excerpt`
- `madagascar_explain_scope`
- `madagascar_list_reference_items`
- `madagascar_search_hdx_datasets`
- `madagascar_get_gdacs_alerts`
- `madagascar_get_weather`
- `madagascar_get_weather_forecast`

## Install

```bash
npm install
npm run build
npm test
npm run dev
```

## Claude Desktop

```json
{
  "mcpServers": {
    "madagascar": {
      "command": "npx",
      "args": ["@hug0x0/mcp-madagascar"]
    }
  }
}
```

## Sources

- HDX Madagascar API search: https://data.humdata.org/api/3/action/package_search?q=Madagascar&rows=1
- HDX Madagascar group: https://data.humdata.org/api/3/action/group_show?id=mdg
- Météo Madagascar climate maproom: https://map.meteomadagascar.mg/index.html
- Open-Meteo API: https://open-meteo.com/
- GDACS RSS: https://www.gdacs.org/xml/rss.xml

## Example Prompts

- "Find humanitarian datasets for Madagascar."
- "List official or widely used Madagascar risk-data sources."
- "Get a source excerpt from the climate maproom."

## Safety

This MCP helps agents discover and summarize public sources. It is not an official authority. For emergency, legal, or administrative decisions, follow the competent public service.

## Glama / Docker

The repo includes `Dockerfile` and `glama.json`.

Publishing notes: [`docs/publishing.md`](docs/publishing.md).

Build steps:

```json
["npm install", "npm run build"]
```

CMD arguments:

```json
["node", "dist/index.js"]
```

## License

MIT
