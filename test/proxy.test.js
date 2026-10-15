import test from 'node:test';
import assert from 'node:assert/strict';
import proxy from '../server/api-proxy.js';
const originalFetch=globalThis.fetch,originalUrl=process.env.BACKEND_URL;
test.after(()=>{globalThis.fetch=originalFetch;if(originalUrl===undefined)delete process.env.BACKEND_URL;else process.env.BACKEND_URL=originalUrl;});
const response=()=>({headers:{},setHeader(name,value){this.headers[name]=value;},end(body){this.body=body;}});
test('proxy preserva cookie HttpOnly sem encaminhar outros cookies ou expor token no login',async()=>{
 process.env.BACKEND_URL='https://api.example/api';
 globalThis.fetch=async(url,options)=>{
  assert.equal(url.href,'https://api.example/api/auth/login');assert.equal(options.headers.cookie,'grimorio_session='+'a'.repeat(64));
  assert.equal(options.headers.origin,'https://frontend.example');
  return new Response(JSON.stringify({data:{user:{id:1},token:'secreto',tokenType:'Bearer',expiresAt:'2026-10-22T00:00:00Z'}}),{headers:{'Content-Type':'application/json','Set-Cookie':'grimorio_session=novo; Path=/api; HttpOnly; Secure; SameSite=Lax; Max-Age=604800'}});
 };
 const res=response();await proxy({url:'/api/auth/login',method:'POST',headers:{cookie:'analytics=privado; grimorio_session='+'a'.repeat(64),origin:'https://frontend.example'},body:{email:'teste@example.test',password:'Exemplo123'}},res);
 assert.equal(res.statusCode,200);assert.equal(res.headers['Cache-Control'],'no-store');assert.match(res.headers['Set-Cookie'][0],/HttpOnly/);
 const payload=JSON.parse(res.body);assert.equal(payload.data.token,undefined);assert.equal(payload.data.user.id,1);
});
test('proxy não transforma falha de conexão em sessão expirada',async()=>{
 globalThis.fetch=async()=>{throw new TypeError('Failed to fetch');};const res=response();
 await proxy({url:'/api/auth/me',method:'GET',headers:{}},res);assert.equal(res.statusCode,502);assert.equal(JSON.parse(res.body).error.code,'UPSTREAM_UNAVAILABLE');
});
test('rewrite da Vercel conserva caminho e filtros da API',async()=>{
 globalThis.fetch=async(url)=>{assert.equal(url.href,'https://api.example/api/spells?level=3&limit=40');return new Response('{"data":[]}');};
 const res=response();await proxy({url:'/api/gateway?level=3&limit=40&__route=spells',query:{__route:'spells'},method:'GET',headers:{}},res);
 assert.equal(res.statusCode,200);
});

test('rewrite remove o parâmetro path interno sem perder filtros e paginação',async()=>{
 globalThis.fetch=async(url)=>{
  assert.equal(url.pathname,'/api/spells');
  assert.deepEqual(Object.fromEntries(url.searchParams),{name:'Mísseis',schoolId:'1',classId:'2',characterId:'3',level:'1',limit:'40',offset:'40'});
  return new Response('{"data":[],"meta":{"total":0}}');
 };
 const res=response();
 await proxy({url:'/api/gateway?path=spells&__route=spells&name=M%C3%ADsseis&schoolId=1&classId=2&characterId=3&level=1&limit=40&offset=40',query:{path:'spells',__route:'spells'},method:'GET',headers:{}},res);
 assert.equal(res.statusCode,200);
});
