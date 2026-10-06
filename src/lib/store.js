import { reactive, computed } from 'vue';
import {request,setUnauthorizedHandler} from './api';
export const state=reactive({user:null,characters:[],classes:[],schools:[],sources:[],activeId:null,ready:false,notice:'',error:''});
export const activeCharacter=computed(()=>state.characters.find(c=>c.id===state.activeId)||null);
export function notify(message){state.notice=message;}
function reset(){sessionStorage.removeItem('grimorio.token');state.user=null;state.characters=[];state.classes=[];state.schools=[];state.sources=[];state.activeId=null;}
setUnauthorizedHandler(()=>{reset();window.dispatchEvent(new Event('grimorio:unauthorized'));});
export async function refreshReference(){const [cl,sc,so]=await Promise.all([request('/classes'),request('/schools'),request('/sources')]);state.classes=cl.data;state.schools=sc.data;state.sources=so.data;}
export async function refreshCharacters(){const userId=state.user?.id;if(!userId)return;const response=await request('/characters');if(state.user?.id!==userId)return;state.characters=response.data;
 if(!state.characters.some(c=>c.id===state.activeId)){const saved=Number(localStorage.getItem(`grimorio.character.${state.user.id}`));state.activeId=state.characters.find(c=>c.id===saved)?.id||state.characters[0]?.id||null;}
}
export function chooseCharacter(id){state.activeId=Number(id)||null;if(state.user)localStorage.setItem(`grimorio.character.${state.user.id}`,String(state.activeId||''));}
export async function authenticate(mode,body){const response=await request(`/auth/${mode}`,{method:'POST',body});sessionStorage.setItem('grimorio.token',response.data.token);state.user=response.data.user;state.ready=true;await Promise.all([refreshReference(),refreshCharacters()]);}
export async function restore(){try{if(sessionStorage.getItem('grimorio.token')){state.user=(await request('/auth/me')).data;await Promise.all([refreshReference(),refreshCharacters()]);}}catch(e){if(e.status!==401)state.error=e.message;}finally{state.ready=true;}}
export async function logout(){try{await request('/auth/logout',{method:'POST'});}finally{reset();}}
