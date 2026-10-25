import { config } from 'dotenv';
config({ path: '.env.local', quiet: true });
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
async function main() {
  const { db, plain } = await import('../src/lib/db');
  const { catalogue } = await import('../src/lib/catalogue');
  const { getQuote } = await import('../src/lib/commerce');
  const { setRate, markSold } = await import('../src/lib/admin');
  const [profile] =
    await db()`select id,name,role from profiles where role='owner' order by created_at limit 1`;
  if (!profile) throw new Error('Owner account not provisioned');
  const owner = { id: profile.id, name: profile.name, role: 'owner' as const };
  const server = new McpServer({ name: 'rajvya-owner', version: '1.0.0' });
  const result = (data: unknown) => ({
    content: [{ type: 'text' as const, text: JSON.stringify(data) }],
  });
  server.registerTool(
    'search_catalog',
    {
      description: 'Search demo catalogue; all prices are computed from current confirmed rates.',
      inputSchema: {
        query: z.string().max(200).default(''),
        maxPaise: z.number().int().positive().optional(),
        purity: z.enum(['22K', '18K', '925']).optional(),
      },
    },
    async (v) => result(await catalogue({ q: v.query, max: v.maxPaise, purity: v.purity })),
  );
  server.registerTool(
    'get_quote',
    {
      description: 'Create a 15-minute owner quote for available demo pieces. No payment or hold.',
      inputSchema: { productIds: z.array(z.string().uuid()).min(1).max(12) },
    },
    async (v) => result(await getQuote(owner, v.productIds)),
  );
  server.registerTool(
    'set_gold_rate',
    {
      description:
        'Owner-only rate change. Set confirm=true only after showing the value to the owner. A change over 5% also requires explicit override.',
      inputSchema: {
        purity: z.enum(['22K', '18K', '925']),
        ratePaise: z.number().int().positive(),
        confirm: z.boolean().default(false),
        override: z.boolean().default(false),
      },
    },
    async (v) => result(await setRate(owner, v.purity, v.ratePaise, v.confirm, v.override)),
  );
  server.registerTool(
    'mark_sold',
    {
      description:
        'Record a counter sale, subject to the same inventory locks as the dashboard. Requires explicit owner confirmation.',
      inputSchema: { productId: z.string().uuid(), confirm: z.boolean().default(false) },
    },
    async (v) => result(await markSold(owner, v.productId, v.confirm)),
  );
  server.registerTool(
    'sales_summary',
    {
      description:
        'Report purchases and reservations separately; never double-count a converted reservation.',
      inputSchema: {},
    },
    async () =>
      result(
        plain(
          await db()`select type,payment_status,fulfillment_status,count(*) as count,sum(total_paise) as total_paise from orders where not internal_only and created_at>now()-interval '7 days' group by type,payment_status,fulfillment_status`,
        ),
      ),
  );
  await server.connect(new StdioServerTransport());
  console.error('Rajvya owner MCP ready (local stdio).');
}
main().catch(() => {
  console.error('Owner MCP could not start. Check local server credentials.');
  process.exit(1);
});
