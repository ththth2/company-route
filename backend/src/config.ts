import { z } from 'zod';
const coordinate = (min: number, max: number) => z.preprocess(v => v === '' || v === undefined ? undefined : v, z.coerce.number().min(min).max(max).optional());
const schema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  ALLOWED_ORIGINS: z.string().default('http://localhost:3000'),
  GOOGLE_MAPS_API_KEY: z.string().default(''),
  COMPANY_NAME: z.string().default('Innovate AI Co., Ltd.'),
  COMPANY_ADDRESS: z.string().default('Siam Cement Rd. Bangsue Bangkok 10800'),
  COMPANY_LAT: coordinate(-90,90), COMPANY_LNG: coordinate(-180,180),
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(5).default(0),
}).refine(v => (v.COMPANY_LAT === undefined) === (v.COMPANY_LNG === undefined));
export function loadConfig(env: NodeJS.ProcessEnv = process.env) {
  const parsed = schema.safeParse(env);
  if (!parsed.success) throw new Error('Invalid server environment configuration');
  const value = parsed.data;
  const origins = value.ALLOWED_ORIGINS.split(',').map(s => s.trim()).filter(Boolean);
  if (!origins.length || origins.some(origin => {
    try { return new URL(origin).origin !== origin || !/^https?:/.test(origin); } catch { return true; }
  })) throw new Error('ALLOWED_ORIGINS requires explicit HTTP(S) origins');
  return {...value, origins};
}
export type Config = ReturnType<typeof loadConfig>;
