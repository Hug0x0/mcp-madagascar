#!/usr/bin/env node

const sources = [
  [
    "HDX Madagascar API search",
    "https://data.humdata.org/api/3/action/package_search?q=Madagascar&rows=1"
  ],
  [
    "HDX Madagascar group",
    "https://data.humdata.org/api/3/action/group_show?id=mdg"
  ],
  [
    "Météo Madagascar climate maproom",
    "https://map.meteomadagascar.mg/index.html"
  ],
  [
    "Open-Meteo API",
    "https://open-meteo.com/"
  ],
  [
    "GDACS RSS",
    "https://www.gdacs.org/xml/rss.xml"
  ]
];

let failures = 0;

for (const [title, url] of sources) {
  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'text/html,application/json,*/*',
        'User-Agent': 'mcp-madagascar-smoke/0.1',
      },
    });
    const body = await response.text();
    const ok = response.ok && body.length > 100;
    console.log(`${ok ? 'OK' : 'FAIL'} ${response.status} ${title} ${url}`);
    if (!ok) failures += 1;
  } catch (error) {
    failures += 1;
    console.log(`FAIL ${title} ${url} ${error.message}`);
  }
}

const api = new URL('https://www.data.gouv.fr/api/1/datasets/');
api.searchParams.set('q', 'Madagascar');
api.searchParams.set('page_size', '1');
try {
  const response = await fetch(api);
  const body = await response.json();
  const ok = response.ok && Array.isArray(body.data);
  console.log(`${ok ? 'OK' : 'FAIL'} ${response.status} data.gouv.fr API search`);
  if (!ok) failures += 1;
} catch (error) {
  failures += 1;
  console.log(`FAIL data.gouv.fr API search ${error.message}`);
}

process.exitCode = failures === 0 ? 0 : 1;
