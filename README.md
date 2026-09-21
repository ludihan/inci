# Inci

Sistema web de **chamados de suporte** (TI e manutenção) e **denúncias anônimas**,
com painel administrativo, rastreamento por matrícula e interface bilíngue
(português/inglês).

Construído com [Next.js 16](https://nextjs.org) (App Router) + React 19 + TypeScript
+ Tailwind CSS 4.

![Página inicial](docs/screenshots/home.png)

## Funcionalidades

### Público
- **Novo chamado** — abertura com matrícula, tipo (TI/manutenção), assunto,
  descrição e foto obrigatória (até 5 imagens de 5 MB cada).
- **Nova denúncia** — totalmente anônima, foto opcional; gera um código de
  rastreio (`DEN-XXXXXXXX-XXXX`).
- **Acompanhar chamado** — busca por matrícula e timeline com respostas,
  abertura/fechamento e envio de respostas. Chamados abertos antes da adoção da
  matrícula continuam localizáveis pelo CPF usado na época.
- **Acompanhar denúncia** — busca pelo código, com status, fotos, respostas e
  complemento anônimo (bloqueado após encerramento).

### Administrativo (`/admin`)
- Login com sessão assinada via HMAC (cookie `httpOnly`).
- Dashboard com estatísticas de chamados e denúncias, filtráveis por período,
  tipo e unidade.
- Chamados: listagem com filtros, detalhe, resposta, reatribuição de tipo
  (TI/manutenção), abertura/fechamento e exclusão (somente superadmin).
- Denúncias: listagem, resposta e encerramento/reabertura (acesso restrito a
  superadmins e admins com denúncias atribuídas).
- Relatórios em PDF (chamados e denúncias) com filtros e seções configuráveis;
  a Ordem de Serviço (O.S.) resolve a empresa prestadora pela unidade do
  chamado.
- Unidades: gestão das unidades onde ocorrem chamados e denúncias, cada uma
  podendo estar vinculada a uma empresa prestadora.
- Empresa prestadora: múltiplas empresas cadastráveis, com dados e logotipo
  exibidos no cabeçalho das O.S. em PDF.
- Itens e serviços: catálogo com preço padrão, usado para compor o custo total
  de um chamado.
- Usuários: criação/edição/exclusão de administradores (somente superadmin),
  com perfil e permissões (TI e manutenção).
- Configurações: identidade visual (logotipo) e o número de dígitos exigido na
  matrícula ao abrir um novo chamado (somente superadmin).

## Identificação por matrícula

Chamados são rastreados por **matrícula** em vez de CPF. Só um hash HMAC da
matrícula é armazenado (`lib/matricula.ts`) — o valor bruto nunca é gravado no
banco, e o admin vê apenas uma referência opaca (`#a1b2c3d4`), não a matrícula
em si. O número de dígitos exigido é configurável em
`/admin/settings` (padrão: 4); chamados abertos antes de uma mudança de
configuração, ou antes da própria adoção da matrícula (quando o sistema usava
CPF), continuam localizáveis pelo código original.

## Começando

```bash
npm install
cp .env.example .env
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000). A raiz redireciona para o
idioma detectado (`/pt` ou `/en`).

### Credenciais administrativas

Usuário: `admin` / Senha: `admin123`

> O banco de dados é criado automaticamente na primeira execução com esse
> usuário superadmin. **Altere a senha padrão antes de usar em produção.**

## Build de produção

```bash
npm install
cp .env.example .env   # configure as variáveis (veja abaixo)
npm run build
npm run start
```

O servidor de produção roda em [http://localhost:3000](http://localhost:3000).

## Variáveis de ambiente

Copie `.env.example` para `.env` e ajuste conforme necessário. Todas as
variáveis são opcionais em desenvolvimento.

| Variável                                  | Obrigatória | Descrição                                                                                                                            |
|--------------------------------------------|-------------|----------------------------------------------------------------------------------------------------------------------------------------|
| `SESSION_SECRET`                          | sim (prod)  | Segredo para assinar o cookie de sessão do admin e o hash da matrícula. Sem valor, usa um fallback de desenvolvimento. Use um valor aleatório em produção. |
| `NEXT_PUBLIC_DISABLE_COMPLAINTS`          | não         | `true`/`1`/`yes`/`on` desativa o módulo de denúncias.                                                                                 |
| `NEXT_PUBLIC_DISABLE_IT_TICKETS`          | não         | `true`/`1`/`yes`/`on` desativa o módulo de chamados de TI.                                                                            |
| `NEXT_PUBLIC_DISABLE_MAINTENANCE_TICKETS` | não         | `true`/`1`/`yes`/`on` desativa o módulo de chamados de manutenção.                                                                    |
| `COMPANY_NAME`, `COMPANY_CNPJ`, `COMPANY_ADDRESS`, `COMPANY_PHONE` | não | Valores usados para semear a primeira empresa prestadora no primeiro boot, e como nome do controlador de dados na página de privacidade. Depois do primeiro boot, edite a empresa em `/admin/company`. |

> **Atenção:** trocar `SESSION_SECRET` invalida o hash de todas as matrículas
> já armazenadas — chamados antigos deixam de ser localizáveis por matrícula
> até que o segredo original seja restaurado. Defina esse valor antes do
> primeiro deploy em produção e não o altere depois.

> As variáveis `NEXT_PUBLIC_*` são embutidas no bundle no momento do build.
> Alterá-las exige rodar `npm run build` novamente.

## Persistência e uploads

Os dados ficam em um banco SQLite local (`data/db.sqlite`, criado
automaticamente) e as fotos enviadas em `data/uploads/`. O diretório `data/` é
ignorado pelo git.

Para resetar tudo, basta excluir a pasta `data/` — ela é recriada e
re-seedada na próxima execução.

> A camada de dados está isolada em `lib/store.ts` (SQLite embarcado via
> `node:sqlite`). Para escalar para vários servidores, considere trocar por um
> banco cliente-servidor.

## Estrutura

```
app/[lang]/            páginas por idioma (público + admin)
app/uploads/[file]     serve imagens enviadas (com validação)
components/            componentes da UI
dictionaries/          pt.json / en.json (traduções)
docs/screenshots/      capturas de tela usadas neste README
lib/                   actions (server actions), auth, i18n, matrícula, store, types, uploads
proxy.ts               proxy de locale (redirecionamento de idioma)
data/                  db.sqlite + uploads (ignorado pelo git)
```

## Scripts

- `npm run dev` — servidor de desenvolvimento (Turbopack)
- `npm run build` — build de produção
- `npm run start` — serve o build de produção
- `npm run lint` — ESLint

### Popular o banco de desenvolvimento

Scripts em `scripts/` preenchem `data/db.sqlite` com dados de exemplo (não use
em produção). Rode com o resolvedor de tipos do Node:

```
node --experimental-strip-types --loader ./scripts/ts-resolve-hook.mjs scripts/seed-test-tickets.mjs
node --experimental-strip-types --loader ./scripts/ts-resolve-hook.mjs scripts/seed-full-ticket.mjs
```

- `seed-test-tickets.mjs` — cria unidades, áreas, serviços, técnicos e ~16
  chamados.
- `seed-full-ticket.mjs` — cria um chamado completo (com O.S.) e a empresa
  prestadora.

## Capturas de tela

|  |  |
|---|---|
| **Abrir chamado** — matrícula, tipo, unidade, área e anexos | **Painel administrativo** — visão geral filtrável por período, tipo e unidade |
| ![Abrir chamado](docs/screenshots/new-ticket.png) | ![Painel administrativo](docs/screenshots/admin-dashboard.png) |
| **Listagem de chamados** — tabela densa com status, tipo, unidade e matrícula | **Detalhe do chamado** — reatribuição de tipo, exclusão, histórico de mensagens |
| ![Listagem de chamados](docs/screenshots/admin-tickets.png) | ![Detalhe do chamado](docs/screenshots/admin-ticket-detail.png) |
| **Unidades** — cada uma pode ser vinculada a uma empresa prestadora | **Empresas prestadoras** — múltiplas empresas, exibidas na O.S. em PDF |
| ![Unidades](docs/screenshots/admin-units.png) | ![Empresas prestadoras](docs/screenshots/admin-company.png) |

Modo escuro:

![Painel administrativo no modo escuro](docs/screenshots/admin-dashboard-dark.png)
