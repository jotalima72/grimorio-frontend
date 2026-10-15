import { isTemporaryError, waitForRetry } from './retry.js';
export class ApiError extends Error { constructor(message,status,code){super(message);this.status=status;this.code=code;} }
let onUnauthorized=()=>{};
let onConnectionChange=()=>{};const reconnecting=new Set();
const apiBase=(import.meta.env?.VITE_API_BASE||'/api').replace(/\/+$/,'');
export function setUnauthorizedHandler(handler){onUnauthorized=handler;}
export function setConnectionHandler(handler){onConnectionChange=handler;}
export async function request(path,options={}){
 const {method='GET',signal,retries=method==='GET'?3:0,retryDelayMs=2000}=options;
 const sessionToken=sessionStorage.getItem('grimorio.token');
 const key=Symbol();
 try{
  for(let attempt=0;;attempt++){
   if(attempt>0&&sessionStorage.getItem('grimorio.token')!==sessionToken)throw new DOMException('A sessão mudou durante a reconexão.','AbortError');
   try{return await send(path,{...options,timeoutMs:options.timeoutMs??(method==='GET'?20000:90000)});}
   catch(error){
    if(signal?.aborted||!isTemporaryError(error)||attempt>=retries)throw error;
    reconnecting.add(key);onConnectionChange(reconnecting.size);
    await waitForRetry(Math.min(retryDelayMs*2**attempt,10000),signal);
   }
  }
 }finally{if(reconnecting.delete(key))onConnectionChange(reconnecting.size);}
}
async function send(path,{method='GET',body,signal,timeoutMs=90000}={}){
 const token=sessionStorage.getItem('grimorio.token');
 const headers={};if(token)headers.Authorization=`Bearer ${token}`;
 if(body!==undefined)headers['Content-Type']='application/json';
 let response;
 try{response=await fetch(`${apiBase}${path}`,{method,headers,body:body===undefined?undefined:JSON.stringify(body),signal:signal?AbortSignal.any([signal,AbortSignal.timeout(timeoutMs)]):AbortSignal.timeout(timeoutMs)});}
 catch(e){if(e.name==='AbortError')throw e;throw new ApiError(e.name==='TimeoutError'?'O servidor demorou para responder. Ele pode estar iniciando; tente novamente.':'Não foi possível acessar o servidor. Confira a conexão e tente novamente.',0,'NETWORK_ERROR');}
 let payload;try{payload=response.status===204?null:await response.json();}catch{throw new ApiError('O servidor enviou uma resposta inválida.',response.status,'INVALID_RESPONSE');}
 if(!response.ok){if(response.status===401 && payload?.error?.code==='UNAUTHENTICATED' && token && sessionStorage.getItem('grimorio.token')===token)onUnauthorized();throw new ApiError(payload?.error?.message||'Não foi possível concluir a operação.',response.status,payload?.error?.code);}
 return payload;
}
