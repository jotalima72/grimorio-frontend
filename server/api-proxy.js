export default async function proxy(req,res){
 res.setHeader('Cache-Control','no-store');
 const fail=(status,code,message)=>{res.statusCode=status;res.setHeader('Content-Type','application/json');res.end(JSON.stringify({error:{code,message}}));};
 let base;
 try{
  base=new URL(process.env.BACKEND_URL||process.env.VITE_API_BASE||process.env.API_PROXY_TARGET);
  if(base.protocol!=='https:'||base.username||base.password)throw new Error();
 }catch{return fail(503,'PROXY_NOT_CONFIGURED','Configure BACKEND_URL com a URL HTTPS do backend no Render.');}
 const path=new URL(req.url,'https://frontend.local');
 const rewritten=req.query?.__route??path.searchParams.get('__route');
 if(typeof rewritten==='string'){
  path.pathname='/api/'+rewritten;
  // O parâmetro capturado pelo rewrite da Vercel não é um filtro da API.
  path.searchParams.delete('path');
 }
 path.searchParams.delete('__route');
 if(!path.pathname.startsWith('/api/'))return fail(404,'NOT_FOUND','Rota não encontrada.');
 if(!['GET','HEAD','POST','PUT','PATCH','DELETE','OPTIONS'].includes(req.method))return fail(405,'METHOD_NOT_ALLOWED','Método não permitido.');
 const headers={};
 for(const name of ['authorization','content-type','origin'])if(req.headers[name])headers[name]=req.headers[name];
 const cookie=req.headers.cookie?.split(';').map(part=>part.trim()).find(part=>/^grimorio_session=[a-f0-9]{64}$/.test(part));
 if(cookie)headers.cookie=cookie;
 let body;
 if(!['GET','HEAD'].includes(req.method)){
  if(req.body!==undefined)body=typeof req.body==='string'||Buffer.isBuffer(req.body)?req.body:JSON.stringify(req.body);
  else{const chunks=[];let size=0;for await(const chunk of req){size+=Buffer.byteLength(chunk);if(size>262144)return fail(413,'BODY_TOO_LARGE','Corpo excede 256 KiB.');chunks.push(Buffer.from(chunk));}if(chunks.length)body=Buffer.concat(chunks);}
  if(body&&Buffer.byteLength(body)>262144)return fail(413,'BODY_TOO_LARGE','Corpo excede 256 KiB.');
 }
 try{
  const upstream=await fetch(new URL(path.pathname+path.search,base.origin),{method:req.method,headers,body,redirect:'manual',signal:AbortSignal.timeout(90000)});
  res.statusCode=upstream.status;
  for(const name of ['content-type','retry-after','x-request-id','server-timing']){const value=upstream.headers.get(name);if(value)res.setHeader(name,value);}
  const cookies=upstream.headers.getSetCookie().filter(value=>value.startsWith('grimorio_session='));
  if(cookies.length)res.setHeader('Set-Cookie',cookies);
  if(upstream.status===204||req.method==='HEAD'){res.end();return;}
  if(['/api/auth/login','/api/auth/register'].includes(path.pathname)&&upstream.ok){
    const payload=await upstream.json();if(payload.data){delete payload.data.token;delete payload.data.tokenType;}
    res.end(JSON.stringify(payload));return;
  }
  res.end(Buffer.from(await upstream.arrayBuffer()));
 }catch{return fail(502,'UPSTREAM_UNAVAILABLE','O servidor está iniciando ou temporariamente indisponível.');}
}
