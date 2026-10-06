import { readFileSync } from 'node:fs';
const template = readFileSync(new URL('../robots.txt', import.meta.url), 'utf8');
export function searchAssets(siteUrl, preview = false) {
  const url = new URL(siteUrl);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error('SITE_URL deve ser a origem pública do frontend, sem caminho ou credenciais.');
  const origin = url.origin;
  const escape = value => value.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&apos;');
  return {
    'robots.txt': preview ? 'User-agent: *\nDisallow: /\n' : template + '\nSitemap: ' + origin + '/sitemap.xml\n',
    'sitemap.xml': '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + (preview ? '' : '<url><loc>' + escape(origin + '/entrar') + '</loc></url>') + '</urlset>\n',
  };
}
export function searchAssetsPlugin(siteUrl, preview = false) {
  const assets = searchAssets(siteUrl, preview);
  return {
    name: 'grimorio-search-assets',
    generateBundle() {
      for (const [fileName, source] of Object.entries(assets)) this.emitFile({type:'asset', fileName, source});
    },
    configureServer(server) {
      server.middlewares.use((req,res,next) => {
        const name = new URL(req.url,'http://localhost').pathname.slice(1);
        if (!Object.hasOwn(assets,name)) return next();
        res.setHeader('Content-Type',name.endsWith('.xml')?'application/xml; charset=utf-8':'text/plain; charset=utf-8');
        res.end(assets[name]);
      });
    },
  };
}
