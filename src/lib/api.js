export class ApiError extends Error { constructor(message,status,code){super(message);this.status=status;this.code=code;} }
let onUnauthorized=()=>{};
const apiBase=(import.meta.env.VITE_API_BASE||'/api').replace(/\/+$/,'');
export function setUnauthorizedHandler(handler){onUnauthorized=handler;}
export async function request(path,{method='GET',body,signal}={}){
 const token=sessionStorage.getItem('grimorio.token');
 const headers={};if(token)headers.Authorization=`Bearer ${token}`;
 if(body!==undefined)headers['Content-Type']='application/json';
 let response;
 try{response=await fetch(`${apiBase}${path}`,{method,headers,body:body===undefined?undefined:JSON.stringify(body),signal:signal?AbortSignal.any([signal,AbortSignal.timeout(90000)]):AbortSignal.timeout(90000)});}
 catch(e){if(e.name==='AbortError')throw e;throw new ApiError(e.name==='TimeoutError'?'O servidor demorou para responder. Ele pode estar iniciando; tente novamente.':'Não foi possível acessar o servidor. Confira a conexão e tente novamente.',0,'NETWORK_ERROR');}
 let payload;try{payload=response.status===204?null:await response.json();}catch{throw new ApiError('O servidor enviou uma resposta inválida.',response.status,'INVALID_RESPONSE');}
 if(!response.ok){if(response.status===401 && !path.startsWith('/auth/login'))onUnauthorized();throw new ApiError(payload?.error?.message||'Não foi possível concluir a operação.',response.status,payload?.error?.code);}
 return payload;
}
