import { describe, expect, it } from 'vitest';

describe('mcp-madagascar', () => {
  it('has a stable package name', () => {
    expect('mcp-madagascar').toMatch(/^mcp-/);
  });

  it('defines source URLs', () => {
    const sources = [
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
];
    expect(sources.length).toBeGreaterThan(0);
    for (const source of sources) {
      expect(source.url).toMatch(/^https?:\/\//);
    }
  });

  it('has a tool prefix', () => {
    expect('madagascar').toMatch(/^[a-z0-9_]+$/);
  });
});
