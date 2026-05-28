# PDV Supermercado MVP

MVP web de PDV para supermercado pequeno ou medio, com login, usuarios por perfil, cadastro de produtos, leitura por codigo de barras, carrinho, desconto, pagamento, caixa, baixa automatica de estoque e relatorios basicos.

Esta versao nao emite NFC-e, SAT, cupom fiscal oficial, TEF ou Pix bancario. O objetivo e validar a operacao interna e deixar a arquitetura pronta para evolucao fiscal e integracoes.

## Stack

- Frontend: React + Vite + TypeScript + TailwindCSS
- Backend: Node.js + Express + TypeScript
- Banco: PostgreSQL
- ORM: Prisma
- Auth: JWT + bcrypt
- Validacao: Zod
- Valores monetarios: armazenados em centavos no banco para evitar erro de arredondamento

## Estrutura

```text
server/   API Express, Prisma, rotas REST, regras de venda/caixa/estoque
web/      Aplicacao React do operador/admin
```

## Como rodar localmente

### Opcao A: PostgreSQL, recomendada

1. Instale dependencias:

```bash
npm install
```

2. Copie o exemplo de ambiente para o backend:

```bash
cp server/.env.example server/.env
```

No Windows PowerShell:

```powershell
Copy-Item server/.env.example server/.env
```

3. Suba o PostgreSQL com Docker:

```bash
docker compose up -d
```

4. Gere o Prisma Client e aplique migrations:

```bash
npm --workspace server run prisma:generate
npm --workspace server run db:migrate
```

5. Rode a seed inicial:

```bash
npm run seed
```

6. Inicie backend e frontend:

```bash
npm run dev
```

- API: http://localhost:3333
- Web: http://localhost:5173

### Opcao B: modo local sem PostgreSQL

Se a maquina ainda nao tiver Docker ou PostgreSQL, use o modo local persistente em arquivo para validar a operacao do MVP:

```env
USE_LOCAL_STORE=true
```

Com essa opcao no `server/.env`, o backend cria automaticamente usuarios, categorias e produtos em `server/data/local-store.json`. Esse modo existe para desenvolvimento e demonstracao; para producao/homologacao use PostgreSQL com Prisma migrations.

## Usuarios de teste

Admin:

```text
E-mail: admin@supermercado.com
Senha: Admin@123
```

Operador:

```text
E-mail: caixa@supermercado.com
Senha: Caixa@123
```

## Fluxo operacional

1. Entrar com Admin ou Operador.
2. Abrir o caixa em Caixa.
3. Ir para PDV.
4. Bipar ou digitar o codigo de barras e pressionar Enter.
5. Ajustar quantidades no carrinho.
6. Aplicar desconto fixo ou percentual, se necessario.
7. Informar pagamento em dinheiro, debito, credito, Pix ou misto.
8. Finalizar venda.
9. O backend salva venda, itens, pagamentos e baixa estoque em transacao.
10. Consultar relatorios de vendas do dia, produtos mais vendidos e estoque baixo.
11. Fechar caixa informando o dinheiro contado.

## Atalhos

- F2: focar codigo de barras
- F6: finalizar venda
- ESC: limpar carrinho/cancelar venda em andamento
- Enter: confirmar codigo de barras

## APIs principais

- `POST /auth/login`
- `GET /auth/me`
- `POST /users`
- `GET /users`
- `PATCH /users/:id`
- `POST /products`
- `GET /products`
- `GET /products/barcode/:barcode`
- `PATCH /products/:id`
- `PATCH /products/:id/deactivate`
- `POST /cash-register/open`
- `POST /cash-register/:id/supply`
- `POST /cash-register/:id/withdraw`
- `POST /cash-register/:id/close`
- `GET /cash-register/current`
- `POST /sales`
- `GET /sales`
- `GET /reports/sales-today`
- `GET /reports/sales-period`
- `GET /reports/top-products`
- `GET /reports/low-stock`

## Regras implementadas

- Senhas com hash bcrypt.
- JWT com expiracao configuravel.
- Middleware de autenticacao e autorizacao por perfil.
- Validacao de entrada com Zod.
- Produto ativo e com estoque para venda.
- Bloqueio de venda sem caixa aberto.
- Revalidacao de estoque no backend antes de finalizar.
- Baixa de estoque, venda, itens e pagamentos em transacao Prisma.
- Desconto fixo ou percentual, com limite por operador.
- Sangria limitada ao saldo estimado em dinheiro.
- Fechamento com valor esperado, valor informado e diferenca.
- Relatorios basicos para Admin.

## Evolucoes preparadas

- Emissao fiscal NFC-e/SAT/cupom oficial.
- TEF, adquirentes e Pix bancario.
- Autorizacao de gerente para desconto/cancelamento.
- Cancelamento com estorno de estoque.
- Exportacao PDF/Excel.
- Auditoria persistente de logs criticos.
