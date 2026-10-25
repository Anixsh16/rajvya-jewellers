import { db, plain } from './db';
import type { Product } from './types';
import { keywordQuery } from './search-query';
export const productFields = [
  'id',
  'sku',
  'name',
  'description',
  'description_hi',
  'category',
  'purity',
  'net_mg',
  'gross_mg',
  'making_bps',
  'making_fixed_paise',
  'stone_paise',
  'huid',
  'tags',
  'image_url',
  'status',
  'availability',
  'price',
  'embedding_status',
  'review_confirmed',
];
export async function catalogue(
  filters: {
    q?: string;
    category?: string;
    purity?: string;
    max?: number;
    includeUnavailable?: boolean;
  } = {},
) {
  const sql = db();
  const query = (filters.q ?? '').slice(0, 200),
    keywords = keywordQuery(query);
  const rows = await sql`select ${sql(productFields)} from catalogue where status<>'draft'
 and (${filters.includeUnavailable ?? false} or availability='live')
 and (${filters.category ?? ''}='' or category=${filters.category ?? ''})
 and (${filters.purity ?? ''}='' or purity=${filters.purity ?? ''})
 and (${filters.max ?? 0}=0 or (price->>'totalPaise')::bigint<=${filters.max ?? 0})
 and (${query}='' or search_document_v2 @@ websearch_to_tsquery('simple',${keywords}) or name ilike ${'%' + query + '%'} or ${query}=ANY(tags))
 order by case when ${query}<>'' then ts_rank_cd(search_document_v2,websearch_to_tsquery('simple',${keywords})) else 0 end desc,created_at,sku limit 60`;
  return plain(rows) as unknown as Product[];
}
export async function product(id: string) {
  const [p] =
    await db()`select ${db()(productFields)} from catalogue where id=${id} and status<>'draft'`;
  return p ? (plain(p) as Product) : null;
}
export async function rates() {
  return plain(
    await db()`select distinct on(purity) purity,rate_paise,rate_date from metal_rates where rate_date=(now() at time zone 'Asia/Kolkata')::date order by purity,created_at desc`,
  );
}
