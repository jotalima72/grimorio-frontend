import test from 'node:test';
import assert from 'node:assert/strict';

const storage=()=>{const values=new Map();return {getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,String(value)),removeItem:key=>values.delete(key)};};
globalThis.sessionStorage=storage();globalThis.localStorage=storage();globalThis.window=new EventTarget();
const {state,restore,waitForSession,useAnotherAccount}=await import('../src/lib/store.js');
const {request}=await import('../src/lib/api.js');
const originalFetch=globalThis.fetch;
test.after(()=>{globalThis.fetch=originalFetch;});
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});
const metadata=url=>String(url).endsWith('/auth/me')?json({data:{id:1,name:'Teste',email:'teste@example.test'}}):json({data:[]});
function start(){sessionStorage.setItem('grimorio.token','token-de-teste');state.user=null;state.ready=false;state.restoreError='';}

test('servidor indisponível mantém token e navegação pendente até validar a sessão',async()=>{
 start();let calls=0,ready=false;waitForSession().then(()=>{ready=true;});
 globalThis.fetch=async url=>{
  if(String(url).endsWith('/auth/me')){
   calls++;assert.equal(state.ready,false);assert.equal(sessionStorage.getItem('grimorio.token'),'token-de-teste');
   if(calls===1)throw new TypeError('Failed to fetch');
   if(calls===2)throw new DOMException('The operation timed out','TimeoutError');
   if(calls===3)return new Response('<html>Starting</html>',{status:503});
  }
  return metadata(url);
 };
 await restore({retryDelayMs:0});
 assert.equal(calls,4);assert.equal(state.user.id,1);assert.equal(state.ready,true);assert.equal(ready,true);
 assert.equal(sessionStorage.getItem('grimorio.token'),'token-de-teste');assert.equal(state.restoring,false);
});

test('somente sessão confirmada como inválida encerra autenticação',async()=>{
 start();globalThis.fetch=async()=>json({error:{code:'UNAUTHENTICATED',message:'Sessão expirada.'}},401);
 await restore({retryDelayMs:0});assert.equal(state.user,null);assert.equal(state.ready,true);assert.equal(sessionStorage.getItem('grimorio.token'),null);
});

test('erro permanente exibe recuperação sem remover token; nova tentativa funciona',async()=>{
 start();globalThis.fetch=async()=>json({error:{code:'CORS_FORBIDDEN',message:'Origem não autorizada.'}},403);
 await restore({retryDelayMs:0});assert.equal(state.ready,false);assert.equal(state.restoreError,'Origem não autorizada.');assert.equal(sessionStorage.getItem('grimorio.token'),'token-de-teste');
 globalThis.fetch=metadata;await restore({retryDelayMs:0});assert.equal(state.ready,true);assert.equal(state.user.id,1);
});

test('leituras repetem falhas temporárias; gravações não são reenviadas automaticamente',async()=>{
 let calls=0;globalThis.fetch=async()=>{calls++;return calls<3?json({error:{message:'Iniciando'}},502):json({data:[]});};
 assert.deepEqual(await request('/spells',{retryDelayMs:0}),{data:[]});assert.equal(calls,3);assert.equal(state.reconnecting,false);
 calls=0;globalThis.fetch=async()=>{calls++;throw new TypeError('Failed to fetch');};
 await assert.rejects(request('/spells',{method:'POST',body:{},retryDelayMs:0}),error=>error.status===0);assert.equal(calls,1);assert.equal(sessionStorage.getItem('grimorio.token'),'token-de-teste');
});

test('401 de proxy sem confirmação da API preserva token',async()=>{
 globalThis.fetch=async()=>json({error:{message:'Proxy não autorizado'}},401);
 await assert.rejects(request('/auth/me'),error=>error.status===401);assert.equal(sessionStorage.getItem('grimorio.token'),'token-de-teste');
});

test('trocar de conta cancela a espera e impede restaurar sessão antiga',async()=>{
 start();let started;const waiting=new Promise(resolve=>{started=resolve;});
 globalThis.fetch=async(_url,{signal})=>{started();return new Promise((_resolve,reject)=>{signal.addEventListener('abort',()=>reject(signal.reason),{once:true});});};
 const restoring=restore({retryDelayMs:0});await waiting;useAnotherAccount();await restoring;
 assert.equal(state.ready,true);assert.equal(state.user,null);assert.equal(sessionStorage.getItem('grimorio.token'),null);assert.equal(state.restoring,false);
});
