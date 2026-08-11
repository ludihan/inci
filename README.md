# Inci

Sistema web de **chamados de suporte** (TI e manutenção) e **denúncias anônimas**, com painel administrativo, rastreamento por CPF/código e interface bilíngue (português/inglês).

Construído com [Next.js 16](https://nextjs.org) (App Router) + React 19 + TypeScript + Tailwind CSS 4.

## Funcionalidades

### Público
- **Novo chamado** — abertura com CPF, tipo (TI/manutenção), assunto, descrição e foto obrigatória (máx. 5 MB).
- **Nova denúncia** — totalmente anônima, foto opcional; gera um código de rastreio (`DEN-XXXXXXXX-XXXX`).
- **Acompanhar chamado** — busca por CPF e timeline com respostas, abertura/fechamento e envio de respostas.
- **Acompanhar denúncia** — busca pelo código, com status, fotos, respostas e complemento anônimo (bloqueado após encerramento).

### Administrativo (`/admin`)
- Login com sessão assinada via HMAC (cookie `httpOnly`).
- Dashboard com estatísticas de chamados e denúncias visíveis ao admin.
- Chamados: listagem com filtros, detalhe, resposta e abertura/fechamento.
- Denúncias: listagem, resposta e encerramento/reabertura (acesso restrito a superadmins e admins com denúncias atribuídas).
- Relatórios em PDF (chamados e denúncias) com filtros e seções configuráveis.
- Locais: gestão dos locais disponíveis nos formulários.
- Usuários: criação/edição/exclusão de administradores (somente superadmin), com perfil e permissões (TI e manutenção).
- Configurações: ajustes gerais do sistema.

## Começando

```bash
npm install
cp .env.example .env
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000). A raiz redireciona para o idioma detectado (`/pt` ou `/en`).

### Credenciais administrativas

Usuário: `admin` / Senha: `admin123`

> O banco de dados é criado automaticamente na primeira execução com esse usuário superadmin. **Altere a senha padrão antes de usar em produção.**

## Build de produção

```bash
npm install
cp .env.example .env   # configure as variáveis (veja abaixo)
npm run build
npm run start
```

O servidor de produção roda em [http://localhost:3000](http://localhost:3000).

## Variáveis de ambiente

Copie `.env.example` para `.env` e ajuste conforme necessário. Todas as variáveis são opcionais em desenvolvimento.

| Variável                                | Obrigatória | Descrição                                                                                                      |
|-----------------------------------------|-------------|----------------------------------------------------------------------------------------------------------------|
| `SESSION_SECRET`                        | sim (prod)  | Segredo para assinar o cookie de sessão do admin. Sem valor, usa um fallback de desenvolvimento. Use um valor aleatório em produção. |
| `NEXT_PUBLIC_DISABLE_COMPLAINTS`        | não         | `true`/`1`/`yes`/`on` desativa o módulo de denúncias.                                                          |
| `NEXT_PUBLIC_DISABLE_IT_TICKETS`        | não         | `true`/`1`/`yes`/`on` desativa o módulo de chamados de TI.                                                     |
| `NEXT_PUBLIC_DISABLE_MAINTENANCE_TICKETS` | não       | `true`/`1`/`yes`/`on` desativa o módulo de chamados de manutenção.                                             |

> As variáveis `NEXT_PUBLIC_*` são embutidas no bundle no momento do build. Alterá-las exige rodar `npm run build` novamente.

## Persistência e uploads

Os dados ficam em um banco SQLite local (`data/db.sqlite`, criado automaticamente) e as fotos enviadas em `data/uploads/`. O diretório `data/` é ignorado pelo git.

Para resetar tudo, basta excluir a pasta `data/` — ela é recriada e re-seedada na próxima execução.

> A camada de dados está isolada em `lib/store.ts` (SQLite embarcado via `node:sqlite`). Para escalar para vários servidores, considere trocar por um banco cliente-servidor.

## Estrutura

```
app/[lang]/            páginas por idioma (público + admin)
app/uploads/[file]     serve imagens enviadas (com validação)
components/            componentes da UI
dictionaries/          pt.json / en.json (traduções)
lib/                   actions (server actions), auth, i18n, store, types, uploads
proxy.ts               proxy de locale (redirecionamento de idioma)
data/                  db.sqlite + uploads (ignorado pelo git)
```

## Scripts

- `npm run dev` — servidor de desenvolvimento (Turbopack)
- `npm run build` — build de produção
- `npm run start` — serve o build de produção
- `npm run lint` — ESLint
