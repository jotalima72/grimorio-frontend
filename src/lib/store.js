import { reactive, computed } from 'vue';
import {request,setUnauthorizedHandler,setConnectionHandler} from './api.js';
import { isTemporaryError, waitForRetry } from './retry.js';
export const state=reactive({user:null,characters:[],classes:[],schools:[],sources:[],activeId:null,ready:false,restoring:false,reconnecting:false,restoreAttempt:0,restoreError:'',notice:'',error:''});
let readyResolve;const sessionReady=new Promise(resolve=>{readyResolve=resolve;});
let restorePromise,restoreController;
export const waitForSession=()=>state.ready?Promise.resolve():sessionReady;
function markReady(){state.ready=true;readyResolve();}
setConnectionHandler(count=>{state.reconnecting=count>0;});
export const activeCharacter=computed(()=>state.characters.find(c=>c.id===state.activeId)||null);
export function notify(message){state.notice=message;}
function reset(){sessionStorage.removeItem('grimorio.token');state.user=null;state.characters=[];state.classes=[];state.schools=[];state.sources=[];state.activeId=null;}
setUnauthorizedHandler(()=>{restoreController?.abort();reset();markReady();window.dispatchEvent(new Event('grimorio:unauthorized'));});
export async function refreshReference({signal}={}){const userId=state.user?.id;const [cl,sc,so]=await Promise.all([request('/classes',{signal}),request('/schools',{signal}),request('/sources',{signal})]);if(signal?.aborted||state.user?.id!==userId)return;state.classes=cl.data;state.schools=sc.data;state.sources=so.data;}
export async function refreshCharacters({signal}={}){const userId=state.user?.id;if(!userId)return;const response=await request('/characters',{signal});if(state.user?.id!==userId||signal?.aborted)return;state.characters=response.data;
 if(!state.characters.some(c=>c.id===state.activeId)){const saved=Number(localStorage.getItem(`grimorio.character.${state.user.id}`));state.activeId=state.characters.find(c=>c.id===saved)?.id||state.characters[0]?.id||null;}
}
export function chooseCharacter(id){state.activeId=Number(id)||null;if(state.user)localStorage.setItem(`grimorio.character.${state.user.id}`,String(state.activeId||''));}
export async function authenticate(mode,body){const response=await request(`/auth/${mode}`,{method:'POST',body});sessionStorage.setItem('grimorio.token',response.data.token);state.user=response.data.user;state.ready=true;await Promise.all([refreshReference(),refreshCharacters()]);}
export function restore({retryDelayMs=2000}={}){
 if(restorePromise)return restorePromise;
 const controller=new AbortController();restoreController=controller;
 state.restoring=true;state.restoreError='';state.restoreAttempt=0;
 restorePromise=(async()=>{
  await Promise.resolve();
  try{
   while(!controller.signal.aborted){
    const token=sessionStorage.getItem('grimorio.token');
    if(!token){markReady();return;}
    state.restoreAttempt++;
    try{
     const response=await request('/auth/me',{signal:controller.signal,retries:0,timeoutMs:20000});
     if(controller.signal.aborted||sessionStorage.getItem('grimorio.token')!==token)return;
     state.user=response.data;
     await Promise.all([refreshReference({signal:controller.signal}),refreshCharacters({signal:controller.signal})]);
     if(!controller.signal.aborted){state.restoreError='';markReady();}return;
    }catch(error){
     if(controller.signal.aborted)return;
     if(error.status===401&&error.code==='UNAUTHENTICATED'){reset();markReady();return;}
     if(!isTemporaryError(error)){state.restoreError=error.message;return;}
     await waitForRetry(Math.min(retryDelayMs*2**Math.min(state.restoreAttempt-1,4),10000),controller.signal);
    }
   }
  }catch(error){if(!controller.signal.aborted)state.restoreError=error.message;}
  finally{state.restoring=false;restorePromise=undefined;}
 })();
 return restorePromise;
}
export function useAnotherAccount(){restoreController?.abort();reset();markReady();}
export async function logout(){try{await request('/auth/logout',{method:'POST'});}finally{reset();}}
