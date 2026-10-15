# Grimório — Vue 3 + Vite

Ao reabrir uma página com sessão salva, a interface aguarda a validação do token antes de decidir a rota. Falhas de rede, timeout e erros temporários do servidor mantêm a tela de reconexão e acionam novas tentativas automaticamente. Um `401` com código `UNAUTHENTICATED` confirmado pela API encerra a sessão; falhas de conexão não removem o token. O usuário pode escolher explicitamente entrar com outra conta. Consultas de leitura em uma sessão ativa repetem falhas temporárias até três vezes; gravações não são reenviadas automaticamente.

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
BACKEND_URL=https://SEU-BACKEND.onrender.com
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

## Seleção de magias por classe

Em Classes e compêndios, clique na classe para abrir as magias ainda sem vínculo. Filtre por nome, escola ou círculo, marque magias (ou a página inteira) e use Adicionar como homebrew. A seleção é mantida entre páginas e filtros, com limite de 500 por operação. Os vínculos ficam na sua conta e preservam os textos das magias.

## Espaços de magia

A página Magias preparadas inclui um marcador por personagem. Em Configurar espaços por círculo, informe os totais da ficha para o 1º ao 9º círculo (0 para círculos sem espaços, máximo 20 por círculo). Os totais são manuais: não são calculados a partir da classe ou do número de magias preparadas, permitindo homebrew e ajustes da mesa.

Gastar 1 consome um espaço; Recuperar 1 desfaz um gasto; Recuperar todos zera os gastos, mantendo os totais. Os valores são salvos no backend, separados por personagem e conta. Truques não entram no controle. Para uma conjuração em círculo superior, marque um espaço do círculo efetivamente usado. O controle não altera a lista preparada.

Publique primeiro o backend com a migração dos espaços e depois este frontend.
### Onde configurar os espaços

Em Magias preparadas, Configurar espaços por círculo aparece apenas para personagens ainda não configurados. Após salvar, os ajustes ficam na edição da página Personagens, junto de nome, classe e nível. Uma configuração salva com todos os totais em zero também conta como concluída. Gastar e recuperar espaços continuam disponíveis na página de magias preparadas.

Na lista de magias preparadas e no seu modal, Usar magia consome um espaço do círculo daquela magia e atualiza os contadores na página. Truques são gratuitos. Sem espaços disponíveis, o botão fica desabilitado. É possível desfazer o gasto usando Recuperar 1 no marcador de espaços.

## Sessão persistente de sete dias

O navegador recebe um cookie HttpOnly, Secure em produção, SameSite=Lax, Path=/api, com Max-Age e Expires de sete dias após o login. O banco continua controlando a expiração absoluta: a restauração não renova os sete dias. Fechar a aba ou o navegador não apaga o cookie. O logout revoga a sessão no backend e expira o cookie.

Na Vercel, configure BACKEND_URL com a origem HTTPS do Render. O gateway também aceita o VITE_API_BASE HTTPS já configurado como alternativa, para facilitar a atualização. Em produção o navegador chama /api no próprio domínio da Vercel; api/gateway.js encaminha as requisições ao Render e preserva o cookie. Esse fluxo evita cookies de terceiros. O backend continua hospedado no Render; não há conexão ao banco no frontend/gateway. CORS_ORIGINS deve continuar contendo a origem exata da Vercel.

Em desenvolvimento, mantenha VITE_API_BASE=/api e API_PROXY_TARGET apontando ao backend local. O preview estático do Vite precisa desse proxy; as Functions são executadas pela Vercel.

Um marcador sem credenciais fica no localStorage para indicar que uma sessão pode ser restaurada. O token não fica salvo no JavaScript. Sessões antigas da aba são migradas para o cookie na primeira validação da sessão. Quem já fechou a aba antes desta atualização precisará entrar novamente uma vez.

Publique primeiro o backend e depois o frontend. Não é necessária uma migração no banco. Depois valide: entrar, fechar e reabrir o navegador, acessar o grimório e sair.