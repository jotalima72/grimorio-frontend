import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
export default defineConfig(({mode})=>{
 const env=loadEnv(mode,process.cwd(),'');
 if(process.env.VERCEL && !env.VITE_API_BASE)throw new Error('Configure VITE_API_BASE com a URL HTTPS da API no Render, incluindo /api.');
 const proxy={'/api':{target:env.API_PROXY_TARGET||'http://127.0.0.1:3001',changeOrigin:true}};
 return {cacheDir: process.cwd()+'/.vite-cache',plugins:[vue()],server:{host:'127.0.0.1',port:5173,strictPort:true,proxy},preview:{host:'127.0.0.1',port:4173,proxy}};
});
