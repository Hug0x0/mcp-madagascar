# Publishing

Before publishing:

```bash
npm run build
npm test
npm run test:smoke
npm pack --dry-run
```

Publish to npm:

```bash
npm publish --access public
```

Install with MCP clients:

```json
{
  "command": "npx",
  "args": ["@hug0x0/mcp-madagascar"]
}
```
