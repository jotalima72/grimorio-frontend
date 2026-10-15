const marker='grimorio.session';
export function sessionKey(){return sessionStorage.getItem('grimorio.token')||localStorage.getItem(marker);}
export function rememberSession(expiresAt){
 const expiry=new Date(expiresAt).getTime();
 if(!Number.isFinite(expiry))return;
 localStorage.setItem(marker,JSON.stringify({expiresAt:expiry,id:crypto.randomUUID()}));
 sessionStorage.removeItem('grimorio.token');
}
export function clearSession(){sessionStorage.removeItem('grimorio.token');localStorage.removeItem(marker);}
export function hasSession(){
 if(sessionStorage.getItem('grimorio.token'))return true;
 const value=localStorage.getItem(marker);if(!value)return false;
 try{if(JSON.parse(value).expiresAt>Date.now())return true;}catch{}
 localStorage.removeItem(marker);return false;
}
