# Meu Espaço — versão gratuita sem IA

Site pessoal em HTML, CSS e JavaScript, em português. Inclui áreas para início, treinos, calendário, estudos e dinheiro.

## Testar no Windows
1. Extrai todos os ficheiros desta pasta.
2. Faz duplo clique em `index.html` para abrir no navegador.
3. Os registos são guardados localmente neste navegador.

## Publicar gratuitamente no Netlify
1. Abre https://app.netlify.com/drop
2. Extrai o ZIP primeiro.
3. Arrasta a pasta que contém `index.html`, `app.js` e `styles.css` para a página do Netlify.
4. O Netlify fornece um endereço terminado em `netlify.app`.

## Importante sobre os dados
- Esta versão não inclui o assistente de IA nem qualquer função de servidor de IA.
- Sem configurar uma base de dados, os dados ficam apenas no armazenamento local do navegador e não sincronizam entre dispositivos.
- Publicar o site não transfere automaticamente os teus registos locais para a internet.
- Se limpares os dados do navegador ou mudares de dispositivo/navegador, podes perder o acesso aos registos. Faz cópias de segurança antes de usar dados importantes.
- Para sincronização e contas, será necessário configurar Supabase separadamente e testar as permissões antes de guardar dados pessoais reais.
- Não guardes palavras-passe bancárias, dados completos de cartões ou informação sensível.


## Assistente local gratuito

Esta versão inclui um assistente baseado em regras JavaScript, sem chamadas a APIs externas e sem custos de IA. Pode resumir os registos, consultar o orçamento, listar eventos da próxima semana e preparar eventos para o calendário após confirmação. Não é um modelo de linguagem avançado e pode interpretar mal pedidos livres; verifica sempre a proposta antes de confirmar. O assistente usa os dados carregados no navegador.


## Aba Loja (sem custos)
A aba Loja permite guardar produtos manualmente com preço estimado, categoria, notas e link externo. A pesquisa abre o Google Shopping/Web; não existe catálogo automático nem checkout no site. Ao confirmar uma compra, o produto é removido da lista e é registada uma despesa na área Dinheiro. A lista de desejos entra na estimativa do orçamento restante, mas não é tratada como despesa até confirmares a compra. Os dados seguem o mesmo armazenamento local/Supabase da aplicação. Confirma sempre preços, portes e disponibilidade no site do vendedor.


## Correção da Loja
A aba Loja inclui agora cartões de produtos de exemplo com preços indicativos, links de pesquisa em lojas externas e botão Adicionar à lista. Os preços não são verificados em tempo real; confirma o preço final, portes e disponibilidade na loja. O botão Adicionar guarda o item na lista pessoal e atualiza a estimativa do orçamento. Não há checkout nem pagamentos dentro do site.


## Melhorias de nuvem, cópias de segurança e painel
- O painel inicial inclui um resumo automático dos eventos, tarefas, treinos, estudo e saldo, calculado localmente sem IA paga.
- Em Início, usa **Exportar cópia** para descarregar um ficheiro JSON dos teus registos. Usa **Importar cópia** para restaurar; a importação substitui os dados atuais, por isso exporta primeiro.
- A configuração Supabase é guardada no navegador antes de testar a ligação, para evitar voltar a introduzir URL/chave se a ligação falhar temporariamente.
- O calendário já suporta vistas de mês, semana e dia, seleção de data e ligação automática de treinos/sessões de estudo aos eventos.
- GitHub Pages suporta apenas o site estático. A sincronização na nuvem usa Supabase e exige a tabela `user_data`, políticas RLS corretas e início de sessão.
- A chave pública/anon do Supabase pode ser usada no navegador com RLS bem configurado; nunca uses `service_role`.
