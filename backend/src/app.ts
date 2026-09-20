import express, {type ErrorRequestHandler} from 'express';
import cors from 'cors';
import helmet from 'helmet';
import {rateLimit} from 'express-rate-limit';
import type {Config} from './config.js';
import {ApiError,computeRoute,originSchema} from './routes.js';
export function createApp(config:Config, fetcher:typeof fetch = fetch) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy',config.TRUST_PROXY_HOPS);
  app.use(helmet());
  app.use(cors({origin(origin,callback) {
    if (!origin || config.origins.includes(origin)) callback(null,true);
    else callback(new ApiError(403,'ORIGIN_NOT_ALLOWED','ไม่อนุญาตให้เรียกจากเว็บไซต์นี้'));
  }}));
  app.use(express.json({limit:'2kb'}));
  app.get('/api/health',(_req,res) => res.json({status:'ok'}));
  app.get('/api/company',(_req,res) => res.json({
    name:config.COMPANY_NAME,address:config.COMPANY_ADDRESS,
    location:config.COMPANY_LAT === undefined ? null : {latitude:config.COMPANY_LAT,longitude:config.COMPANY_LNG},
    routingAvailable:Boolean(config.GOOGLE_MAPS_API_KEY && config.COMPANY_LAT !== undefined),
  }));
  app.post('/api/routes',rateLimit({windowMs:60000,limit:10,standardHeaders:'draft-8',legacyHeaders:false,
    message:{code:'RATE_LIMIT',message:'ค้นหาเส้นทางบ่อยเกินไป กรุณารอสักครู่'}}),async(req,res) => {
    res.set('Cache-Control','no-store');
    const origin = originSchema.safeParse(req.body);
    if (!origin.success) throw new ApiError(400,'INVALID_ORIGIN','พิกัดต้นทางไม่ถูกต้อง');
    res.json(await computeRoute(origin.data,config,fetcher));
  });
  app.use((_req,res) => res.status(404).json({code:'NOT_FOUND',message:'ไม่พบรายการที่ร้องขอ'}));
  const errors:ErrorRequestHandler = (error:unknown,_req,res,_next) => {
    if (error instanceof ApiError) {res.status(error.status).json({code:error.code,message:error.message});return;}
    const status = typeof error === 'object' && error && 'status' in error ? error.status : undefined;
    if (status === 400 || status === 413) {res.status(status).json({code:'INVALID_BODY',message:'ข้อมูลคำขอไม่ถูกต้องหรือมีขนาดใหญ่เกินไป'});return;}
    // Never log coordinates, raw exceptions, request headers, or Google responses.
    console.error('Unhandled API failure');
    res.status(500).json({code:'INTERNAL_ERROR',message:'เกิดข้อผิดพลาด กรุณาลองอีกครั้ง'});
  };
  app.use(errors);
  return app;
}
