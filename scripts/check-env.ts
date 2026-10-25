import { config } from 'dotenv';
config({ path: '.env.local', quiet: true });
import { z } from 'zod';
const schema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(10),
  SUPABASE_SECRET_KEY: z.string().min(10),
  DATABASE_URL: z.string().regex(/^postgres(?:ql)?:\/\//),
  GEMINI_API_KEY: z.string().min(10),
  GEMINI_MODEL: z.string().min(1),
  EMBEDDING_MODEL: z.string().min(1),
  RAZORPAY_KEY_ID: z.string().startsWith('rzp_test_'),
  RAZORPAY_KEY_SECRET: z.string().min(10),
  RAZORPAY_WEBHOOK_SECRET: z.string().min(16),
  CRON_SECRET: z.string().min(16),
  NEXT_PUBLIC_SITE_URL: z.string().url(),
  AI_DAILY_LIMIT: z.coerce.number().int().positive().default(150),
});
const result = schema.safeParse(process.env);
if (!result.success) {
  console.error(
    'Missing or invalid configuration keys:',
    [...new Set(result.error.issues.map((i) => i.path[0]))].join(', '),
  );
  process.exit(1);
}
console.log('Runtime configuration valid. Secret values hidden; payments restricted to test mode.');
