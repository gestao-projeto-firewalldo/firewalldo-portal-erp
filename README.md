# Firewalldo · Portal de Desenvolvimento

Portal interno em React, TypeScript e Vite. Inclui projetos, Kanban, ideias,
Radar de notícias, gestão de usuários e atalhos da equipe.

## Desenvolvimento local

```bash
npm ci
npm run dev
```

Sem um arquivo `.env`, o portal funciona em modo demonstração. Para testar a
API, copie `.env.example` para `.env` e execute o backend na porta 3333
com `SESSION_SECURE=false`. O Vite encaminha `/api` para o backend.

## Railway

O Dockerfile compila em modo API e serve o portal com Caddy. Defina
`API_UPSTREAM` com o host privado e a porta do serviço Spring Boot no mesmo
projeto. Gere um domínio público para este serviço. `/api/health` verifica a
conectividade do front até o banco. A API usa o mesmo domínio do portal pelo
proxy, inclusive para o cookie de sessão.

A versão 1.4 corrigiu o foco ao digitar, mostra validações no rodapé dos modais, salva atalhos individualmente e mantém preferências por conta no banco. Inclui edição de projetos/marcos e biblioteca real de arquivos de até 5 MB. A auditoria usa datas de texto com barras automáticas e filtros de período em Brasília.

O arquivo `BACKEND_INTEGRACAO.txt` resume o contrato da versão 1.5.
A autenticação atual usa cookie de sessão HttpOnly. O tipo de dado de cada
módulo continua em `src/types/models.ts`.


A versão 1.5 inclui a configuração da coleta OpenAI, fila de aprovação de notícias, leitura com imagens reais e créditos, categorias/marca em projetos, herança de categoria nas novas tarefas e relatórios com filtros reais por marca/projeto. A chave só é configurada no serviço api. Veja ../REVISAO-1.5.md e ../ATUALIZAR-CMD.md.

A revisão também inclui Web Push com ativação por aparelho, manifesto, Service Worker, teste e histórico. As chaves VAPID são geradas na API; no iPhone a instalação na Tela de Início é necessária. O usuário precisa permitir as notificações em cada aparelho.


A versão 1.6 reorganiza o mobile (fontes, históricos, painéis, filtros e modais), apresenta gráficos por categoria com rótulos legíveis em telas pequenas e usa datas numéricas com barras automáticas em todos os formulários de projeto/marco, tarefa e notícia. Mensagens da coleta agora diferenciam as causas de erro da API. Veja ../REVISAO-1.6.md.


## Revisão 1.7 — Agenda e tickets

Regras persistentes diárias/a cada N dias, semanais e por datas selecionadas. A API libera tarefas individuais por responsável e horário de Brasília, sem antecipar a criação. Contador transacional global identifica cada tarefa manual/automática com ticket próprio, sem renumerar edições ou reaproveitar excluídos. V6 mantém V1–V5 intactas. Usuários recebem somente suas tarefas pela API; administradores podem filtrar todos ou cada responsável. A versão aparece ao lado do sino. Consulte ../REVISAO-1.7.md e ../ATUALIZAR-CMD.md.


## Portal 1.1.11

- Capa das notícias por arraste: solte uma imagem PNG, JPG ou WEBP na janela de cadastro/edição para carregar a prévia e publicar. O seletor de arquivos continua disponível. Arquivos inválidos não substituem a capa atual nem abrem outra página.
- Backlog com seleção de quem pode aceitar, separada dos aceites confirmados e do número de vagas necessárias para iniciar. Sem seleção, qualquer conta ativa pode aceitar.
- Até três fotos redondas sobrepostas, sem bordas; nomes dos três primeiros participantes e lista completa ao passar o mouse, focar com teclado ou tocar.
- No tema claro, coluna Em andamento em amarelo opaco e cartões amarelos mais claros. As cores do tema escuro foram mantidas.


## Portal 1.1.12 — Agenda e Backlog

O editor da Agenda oferece coluna de entrada Backlog/A fazer e número de vagas necessárias para iniciar. No Backlog, os vinculados são candidatos e podem exceder as vagas; sem seleção, qualquer conta ativa pode aceitar. Em A fazer, todos os vinculados recebem uma única tarefa compartilhada. O Kanban mostra os candidatos com fotos e nomes separados dos aceites. A mesma regra vale para tarefas normais, recorrentes, semanais e por datas. Próximas aberturas seguem a regra editada; tarefas antigas são preservadas.


## Portal 1.1.13 — finalizar e consultar histórico

Somente o administrador principal vê Finalizar nas tarefas concluídas. Após confirmação, saem do Kanban e aparecem resumidas no histórico do projeto; clicar abre os dados em modo de consulta. Relatórios agora aparece no menu Gestão para administradores, com Histórico de ações, Tarefas finalizadas e Indicadores. Filtros permitem identificar a autoria de notícias, tarefas, projetos e demais ações auditadas, mesmo após exclusões, com detalhes e exportação CSV. O histórico usa dados persistidos da auditoria; registros antigos podem ter detalhes limitados.


## Portal 1.1.14 — navegação e cards dos projetos

Paginação acima dos registros em Auditoria e no histórico dos Relatórios. Cards de projetos mostram a descrição em até três linhas (texto completo ao abrir o projeto), fundo com a cor escolhida, borda superior e progresso na mesma cor. Relatórios fica no submenu Sistema. Os submenus começam fechados, não reaproveitam o estado antigo salvo e permitem no máximo um aberto. Navegações internas, atalhos, voltar e avançar abrem apenas o grupo da página de destino; páginas sem grupo fecham todos. Atalhos de mesma origem usam navegação interna; links externos continuam em nova aba. A API e o banco não foram alterados nesta versão.

Revisão de 25/11/2026: campos numéricos da Agenda (vagas, intervalo e prazo) e limite de vagas das tarefas aceitam apagar e redigitar sem forçar zero ou um durante a edição. Valores inteiros e limites continuam validados ao salvar, antes do envio numérico à API.


## Portal 1.1.15 — Driver e descrição completa

A página interna do projeto mostra a descrição integral em um painel próprio, preservando as quebras de linha. Conteúdo > Driver organiza atalhos em campos com nome, foto e descrição. Cada campo contém atalhos com nome, foto e URL, com ações de criação, edição e exclusão para administradores. Contas comuns podem consultar, buscar e abrir os links.

A busca geral procura campos por nome/descrição e atalhos por nome/URL; a busca em cada campo filtra apenas os próprios atalhos. O seletor de filtros lista os campos do banco, acompanha renomeações e exclusões e permite marcar vários, iniciando com todos. Campos novos entram automaticamente quando o filtro está em Todos. Imagens aceitam seletor ou arraste, com prévia. URLs internas mantêm a navegação e o submenu correspondente; URLs externas abrem em nova aba. As ações também aparecem em Auditoria e Relatórios > Histórico de ações. Requer a API com migração V13. As mudanças anteriores até 1.1.14 permanecem.
