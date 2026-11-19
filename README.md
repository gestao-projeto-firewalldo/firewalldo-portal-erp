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
