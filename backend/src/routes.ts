import { z } from 'zod';
import type { Config } from './config.js';
export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}
export const originSchema = z.object({latitude:z.number().min(-90).max(90),longitude:z.number().min(-180).max(180)}).strict();
const googleSchema = z.object({ routes: z.array(z.object({
  distanceMeters:z.number().nonnegative(), duration:z.string().regex(/^\d+(\.\d+)?s$/),
  polyline:z.object({encodedPolyline:z.string().min(1)}),
})).optional() });
export async function computeRoute(origin:z.infer<typeof originSchema>, config:Config, fetcher:typeof fetch = fetch) {
  if (!config.GOOGLE_MAPS_API_KEY || config.COMPANY_LAT === undefined || config.COMPANY_LNG === undefined)
    throw new ApiError(503,'NOT_CONFIGURED','ระบบยังไม่พร้อมคำนวณเส้นทาง กรุณาติดต่อบริษัท');
  const calculatedAt = new Date();
  let response:Response;
  try {
    response = await fetcher('https://routes.googleapis.com/directions/v2:computeRoutes', {
      method:'POST',
      headers:{'Content-Type':'application/json','X-Goog-Api-Key':config.GOOGLE_MAPS_API_KEY,
        'X-Goog-FieldMask':'routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline'},
      body:JSON.stringify({
        origin:{location:{latLng:origin}},
        destination:{location:{latLng:{latitude:config.COMPANY_LAT,longitude:config.COMPANY_LNG}}},
        travelMode:'DRIVE',routingPreference:'TRAFFIC_AWARE',
        // Google's default departure time is the current request time, avoiding local clock skew.
        computeAlternativeRoutes:false,languageCode:'th-TH',units:'METRIC',
      }),
      signal:AbortSignal.timeout(12000),
    });
  } catch { throw new ApiError(504,'UPSTREAM_TIMEOUT','เชื่อมต่อบริการเส้นทางไม่สำเร็จ กรุณาลองอีกครั้ง'); }
  if (!response.ok) throw new ApiError(502,'UPSTREAM_ERROR','บริการเส้นทางไม่พร้อมใช้งาน กรุณาลองอีกครั้ง');
  const data = googleSchema.safeParse(await response.json().catch(() => null));
  if (!data.success) throw new ApiError(502,'INVALID_RESPONSE','ได้รับข้อมูลเส้นทางไม่สมบูรณ์');
  const route = data.data.routes?.[0];
  if (!route) throw new ApiError(404,'NO_ROUTE','ไม่พบเส้นทางรถยนต์จากตำแหน่งนี้ไปบริษัท');
  const durationSeconds = Number(route.duration.slice(0,-1));
  return {origin,destination:{latitude:config.COMPANY_LAT,longitude:config.COMPANY_LNG},
    distanceMeters:route.distanceMeters,durationSeconds,encodedPolyline:route.polyline.encodedPolyline,
    calculatedAt:calculatedAt.toISOString(),
    estimatedArrivalAt:new Date(calculatedAt.getTime()+durationSeconds*1000).toISOString()};
}
