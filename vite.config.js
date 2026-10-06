import { searchAssetsPlugin } from './build/search-assets.js';
import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
export default defineConfig(({mode})=>{
 const env=loadEnv(mode,process.cwd(),'');
 if(process.env.VERCEL && !env.VITE_API_BASE)throw new Error('Configure VITE_API_BASE com a URL HTTPS da API no Render, incluindo /api.');
 const productionHost=env.VERCEL_PROJECT_PRODUCTION_URL||env.VITE_VERCEL_PROJECT_PRODUCTION_URL;
 const siteUrl=env.SITE_URL||(productionHost?'https://'+productionHost:'http://127.0.0.1:5173');
 if(process.env.VERCEL && !env.SITE_URL && !productionHost)throw new Error('Configure SITE_URL com a origem pública do frontend para gerar o sitemap.');
 const preview=(env.VERCEL_ENV||env.VITE_VERCEL_ENV)==='preview';
 const proxy={'/api':{target:env.API_PROXY_TARGET||'http://127.0.0.1:3001',changeOrigin:true}};
 return {cacheDir: process.cwd()+'/.vite-cache',plugins:[vue(),searchAssetsPlugin(siteUrl,preview)],server:{host:'127.0.0.1',port:5173,strictPort:true,proxy},preview:{host:'127.0.0.1',port:4173,proxy}};
});
