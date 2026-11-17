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

O arquivo `BACKEND_INTEGRACAO.txt` registra o contrato original da versão 1.2.
A autenticação atual usa cookie de sessão HttpOnly. O tipo de dado de cada
módulo continua em `src/types/models.ts`.
