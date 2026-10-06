# Grimório — Vue 3 + Vite

Frontend independente para personagens, magias preparadas, consulta do catálogo e criação de homebrews. O backend Node tem um repositório separado.

## Desenvolvimento

Use Node 24, conforme `.node-version`.

```powershell
npm ci
Copy-Item .env.example .env
npm run dev
```

O navegador abre `http://127.0.0.1:5173`. `API_PROXY_TARGET` aponta para o backend local, por padrão `http://127.0.0.1:3001`. `VITE_API_BASE=/api` usa esse proxy. Execute o backend separadamente seguindo sua documentação.

## Git

Crie um repositório vazio só para esta pasta:

```powershell
git add .
git commit -m "Prepara frontend Vue para Vercel"
git remote add origin https://github.com/SEU-USUARIO/SEU-REPO-FRONTEND.git
git push -u origin main
```

O repositório local já foi inicializado. `.env`, `dist`, caches e dependências são ignorados. Inclua `package-lock.json`.

## Vercel

Importe o repositório do frontend. Use o preset **Vite**, Root Directory vazio, build `npm run build` e Output Directory `dist`.

Em **Environment Variables**, configure:

```text
VITE_API_BASE=https://SEU-BACKEND.onrender.com/api
```

Configure essa variável nos ambientes desejados (Production e, se necessário, Preview/Development). Depois de mudar a variável, faça um novo deploy: o Vite incorpora o valor no build. A URL é pública; nunca coloque senha do banco ou chave secreta em uma variável `VITE_*`.

No Render, configure `CORS_ORIGINS` com a origem exata da Vercel, por exemplo `https://SEU-FRONTEND.vercel.app`, sem `/api` nem barra final. Domínios próprios e previews precisam ser adicionados explicitamente. `API_PROXY_TARGET` só serve para desenvolvimento local; não é necessário na Vercel.

`vercel.json` configura o build e o fallback para `index.html`, permitindo abrir e atualizar `/entrar` e outras rotas diretamente. [Documentação oficial do Vite na Vercel](https://vercel.com/docs/frameworks/frontend/vite).

## Validação do deploy

1. Abra `/entrar` diretamente e atualize a página.
2. Crie uma conta, um personagem e prepare uma magia.
3. Saia e entre novamente; confirme que os dados persistem.
4. Teste em uma tela estreita e abra um card de magia.

`npm test` verifica busca e filtros; `npm run build` produz o bundle de publicação. O workflow do GitHub executa ambos automaticamente.

## Buscadores

O build gera `/robots.txt` e `/sitemap.xml`. Somente `/entrar` é permitido como página; `/assets/` é liberado para renderizar o login. As demais rotas recebem `X-Robots-Tag: noindex, nofollow` na Vercel. O sitemap contém apenas a URL do login. Previews da Vercel bloqueiam todo rastreamento e geram sitemap vazio.

O domínio é obtido de `SITE_URL` ou da variável de produção da Vercel `VERCEL_PROJECT_PRODUCTION_URL`. Para um domínio próprio, configure `SITE_URL=https://seu-dominio.com` e faça um novo deploy. Localmente é usado `http://127.0.0.1:5173`.

Robots.txt orienta robôs cooperativos, sem substituir autenticação. URLs já indexadas e bloqueadas podem continuar aparecendo sem conteúdo: nesse caso, use a ferramenta de remoção do buscador. Não são criados arquivos de verificação do Google/Bing sem os códigos fornecidos por esses serviços.
