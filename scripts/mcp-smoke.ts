import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
async function main() {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: ['node_modules/tsx/dist/cli.mjs', 'scripts/mcp.ts'],
    stderr: 'pipe',
  });
  const client = new Client({ name: 'rajvya-protocol-verifier', version: '1.0.0' });
  await client.connect(transport);
  try {
    const tools = await client.listTools();
    const names = tools.tools.map((t) => t.name);
    for (const name of [
      'search_catalog',
      'get_quote',
      'set_gold_rate',
      'mark_sold',
      'sales_summary',
    ])
      if (!names.includes(name)) throw new Error('Missing MCP capability');
    const search = await client.callTool({
      name: 'search_catalog',
      arguments: { query: 'silver ring', maxPaise: 300000, purity: '925' },
    });
    if (search.isError) throw new Error('MCP catalogue failed');
    const summary = await client.callTool({ name: 'sales_summary', arguments: {} });
    if (summary.isError) throw new Error('MCP summary failed');
    const refused = await client.callTool({
      name: 'set_gold_rate',
      arguments: { purity: '22K', ratePaise: 915000, confirm: false },
    });
    if (!refused.isError) throw new Error('MCP mutation did not require confirmation');
    console.log(
      'PASS MCP initialize, list tools, catalogue, summary and unconfirmed mutation rejection.',
    );
  } finally {
    await client.close();
  }
}
main().catch(() => {
  console.error('MCP protocol verification failed');
  process.exit(1);
});
