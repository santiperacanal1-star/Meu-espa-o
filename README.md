# Meu Espaço

Site pessoal responsivo em HTML, CSS e JavaScript, em português de Portugal.

## Testar localmente

1. Extrai a pasta `meu-espaco`.
2. Abre `index.html` no navegador. Para melhores resultados, usa um servidor local:
   - Se tiveres Python instalado, abre um terminal nesta pasta e executa `python -m http.server 8000`.
   - Visita `http://localhost:8000`.
3. Sem configurar o Supabase, a app funciona em modo local e guarda os dados no armazenamento local do navegador.

## Publicar no Netlify (sem linha de comandos)

1. Cria uma conta em https://app.netlify.com/.
2. Extrai o ZIP no computador.
3. No painel do Netlify, procura a opção de adicionar um site manualmente / fazer deploy manual.
4. Arrasta a pasta `meu-espaco` (a pasta que contém `index.html`, `styles.css` e `app.js`) para a área de deploy.
5. O Netlify cria um URL público para o site. Podes alterar o nome do subdomínio nas definições do site, se estiver disponível.
6. O site fica público. A página não terá os teus dados locais de outros dispositivos, a menos que configures o Supabase e inicies sessão.

## Configurar sincronização Supabase

1. Cria um projeto em https://supabase.com/.
2. No projeto, abre o SQL Editor e executa o conteúdo de `supabase/schema.sql`.
3. Nas definições do projeto, encontra a URL do projeto e a chave publicável (anon/publishable).
4. Abre o site e clica em **Configurar nuvem**. Introduz a URL e a chave publicável e clica em **Ligar à nuvem**.
5. Clica em **Entrar / criar conta** para criar a conta pessoal. Se a confirmação de e-mail estiver ativada, confirma o e-mail antes de iniciar sessão.
6. Para produção, configura em Supabase Authentication a lista de URLs permitidos e define o URL do teu site Netlify como URL do site e redirecionamento permitido, de acordo com as opções disponíveis no painel.
7. Testa com dados não sensíveis antes de confiar nos dados. A app sincroniza um documento JSON por utilizador; alterações concorrentes em dois dispositivos ao mesmo tempo podem substituir a versão mais recente. Não é um sistema bancário nem deve guardar dados bancários secretos.

## Segurança

- Usa apenas a chave pública/anon/publishable no navegador. Nunca uses `service_role` ou outra chave secreta no JavaScript.
- O esquema ativa Row Level Security (RLS) e limita cada linha ao utilizador autenticado.
- O modo local guarda os dados no navegador atual; limpar os dados do site ou usar outro navegador pode torná-los inacessíveis.
- O projeto usa a biblioteca Supabase JS v2 através de CDN. O acesso à Internet é necessário para carregar essa biblioteca e usar a nuvem.
- A app não inclui recuperação de palavra-passe nem exportação de dados nesta primeira versão.
