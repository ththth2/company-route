import {test} from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import {createApp} from '../src/app.js';
import {loadConfig} from '../src/config.js';
const origin={latitude:13.75,longitude:100.5};
const config=loadConfig({GOOGLE_MAPS_API_KEY:'test-placeholder',COMPANY_LAT:'13.8',COMPANY_LNG:'100.52'});
const good=()=>new Response(JSON.stringify({routes:[{distanceMeters:12500,duration:'1500s',polyline:{encodedPolyline:'test-polyline'}}]}));
test('Google request uses traffic-aware driving and the fixed server destination',async()=>{
  const mock:typeof fetch=async(url,init)=>{
    assert.equal(url,'https://routes.googleapis.com/directions/v2:computeRoutes');
    const body=JSON.parse(String(init?.body));
    assert.deepEqual(body.origin.location.latLng,origin);
    assert.deepEqual(body.destination.location.latLng,{latitude:13.8,longitude:100.52});
    assert.equal(body.travelMode,'DRIVE');
    assert.equal(body.routingPreference,'TRAFFIC_AWARE');
    assert.equal(body.departureTime,undefined);
    assert.equal(new Headers(init?.headers).get('X-Goog-Api-Key'),'test-placeholder');
    assert.match(new Headers(init?.headers).get('X-Goog-FieldMask')!,/routes.duration/);
    return good();
  };
  const res=await request(createApp(config,mock)).post('/api/routes').send(origin).expect(200);
  assert.equal(res.body.distanceMeters,12500);
  assert.equal(res.body.durationSeconds,1500);
  assert.equal(Date.parse(res.body.estimatedArrivalAt)-Date.parse(res.body.calculatedAt),1500000);
  assert.equal(res.headers['cache-control'],'no-store');
  assert.ok(!JSON.stringify(res.body).includes('test-placeholder'));
});
test('invalid coordinates and destination overrides never reach Google',async()=>{
  let calls=0;
  const app=createApp(config,async()=>{calls++;return good();});
  for(const body of [{latitude:91,longitude:100},{latitude:'13.7',longitude:100},{...origin,destination:origin},{}])
    await request(app).post('/api/routes').send(body).expect(400);
  assert.equal(calls,0);
});
test('missing configuration is explicit and company never exposes secrets',async()=>{
  const app=createApp(loadConfig({}));
  const res=await request(app).get('/api/company').expect(200);
  assert.equal(res.body.location,null);
  assert.equal(res.body.routingAvailable,false);
  assert.deepEqual(Object.keys(res.body).sort(),['address','location','name','routingAvailable']);
  await request(app).post('/api/routes').send(origin).expect(503);
});
test('CORS allows only explicit website origins',async()=>{
  const app=createApp(config);
  await request(app).get('/api/company').set('Origin','https://evil.example').expect(403);
  const res=await request(app).options('/api/routes').set('Origin','http://localhost:3000').set('Access-Control-Request-Method','POST').expect(204);
  assert.equal(res.headers['access-control-allow-origin'],'http://localhost:3000');
});
test('upstream error details do not reach users',async()=>{
  const app=createApp(config,async()=>new Response('private upstream detail',{status:403}));
  const res=await request(app).post('/api/routes').send(origin).expect(502);
  assert.ok(!JSON.stringify(res.body).includes('private upstream detail'));
});
test('empty routes, malformed responses, and timeouts are handled',async()=>{
  for(const [payload,status] of [[{},404],[{routes:[]},404],[{routes:[{duration:'broken'}]},502]] as const) {
    const app=createApp(config,async()=>new Response(JSON.stringify(payload)));
    await request(app).post('/api/routes').send(origin).expect(status);
  }
  const app=createApp(config,async()=>{throw new DOMException('timeout','TimeoutError');});
  await request(app).post('/api/routes').send(origin).expect(504);
});
test('reject malformed JSON and rate limit repeated route requests',async()=>{
  const app=createApp(config,async()=>good());
  await request(app).post('/api/routes').set('Content-Type','application/json').send('{').expect(400);
  for(let i=0;i<10;i++) await request(app).post('/api/routes').send(origin).expect(200);
  await request(app).post('/api/routes').send(origin).expect(429);
});
