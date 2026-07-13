# Valquíria Chat 🗡️

Mensageiro com identidade visual estilo Discord, criptografia ponta-a-ponta genuína, loja premium de cosméticos, gamificação e um logo original inspirado na Valquíria nórdica.

## Segurança: Criptografia Ponta-a-Ponta (E2EE)

**Implementação real, não cosmética.** Cada dispositivo gera um par de chaves ECDH (P-256) que nunca sai do browser. Cada conversa tem uma chave AES-256-GCM própria, embrulhada individualmente para cada participante. O servidor:
- **Nunca** vê o conteúdo das mensagens de texto/emoji em claro — só ciphertext e IVs.
- Guarda apenas chaves públicas e chaves de conversa já embrulhadas (inúteis sem a chave privada certa).
- Não consegue, mesmo com acesso total à base de dados, ler o histórico de conversas.

**Limitações honestas desta implementação:**
- Imagens, áudios e documentos **não são encriptados** nesta versão (ficam como antes, acessíveis por URL). Só texto e emoji são cifrados ponta-a-ponta.
- A **pesquisa de mensagens no servidor deixou de ser possível** — é uma consequência directa e esperada de E2EE real (se o servidor pudesse pesquisar o conteúdo, não seria E2EE).
- Se limpares os dados do navegador ou mudares de dispositivo **sem exportar a tua chave** (Perfil → Segurança → Exportar), perdes o acesso ao histórico antigo para sempre — ninguém consegue recuperá-lo, nem o servidor.
- Conversas criadas antes desta funcionalidade (ou com participantes que ainda não abriram a app actualizada) só ficam encriptadas a partir do momento em que todos os participantes tiverem gerado a sua chave — a app trata isto automaticamente ("migração preguiçosa").

## Estilo Discord

- Lista de mensagens plana (sem balões), avatar + nome só na primeira mensagem de cada sequência do mesmo remetente
- Barra de acções flutuante ao passar o rato (reagir, responder, editar, apagar)
- **Página de perfil estilo Discord**: banner, avatar sobreposto com moldura/auréola, insígnias, "Sobre mim", nível
- **Efeitos de perfil**: partículas animadas (faíscas, cinzas, neve, pétalas, estrelas) que aparecem ao abrir o perfil de alguém com esse cosmético equipado — mais um efeito subtil de entrada em todos os perfis
- **Bandeiras com efeito de brilho** (sweep) a percorrer o banner do perfil

## Funcionalidades

**Mensagens directas e de grupo**
- Conversas 1-a-1 e grupos com múltiplos membros, admins de grupo, promoção/remoção de membros
- Texto, emoji, imagem, documento e áudio
- Responder a mensagens (reply/quote), editar e apagar mensagens próprias
- Reacções rápidas com emoji (estilo Discord/Telegram)
- **Mensagens de visualização única** (estilo WhatsApp): imagens/áudios que só podem ser abertos uma vez por cada destinatário; depois de abertos mostram "já visualizada"
- Indicador "a escrever...", confirmações de entrega e leitura
- **Notificações do sistema operativo** (como o WhatsApp Web): quando a aba não está em foco, uma mensagem nova mostra uma notificação nativa do browser/SO com som — mesmo com a app minimizada
- **Ver perfil de outros utilizadores**: clica no cabeçalho de uma conversa directa, num membro de grupo, ou num resultado de pesquisa

**Loja Premium (cosméticos)**
- 11 bundles temáticos: Royal, Ragnarok, Valhalla, Aurora, Galaxy, Shadow, Dragon, Cyber, Celestial, Bifrost, Kraken
- Categorias: bandeiras (banners), molduras, auréolas, insígnias cosméticas, fundos, packs de emoji, cursores
- **Efeitos por raridade**: comum/raro são estáticos, épico tem glow pulsante, lendário tem brilho intenso + bandeira animada (shimmer), mítico tem **anel giratório** à volta do avatar + shimmer + glow máximo — visual inspirado nos orbs e bandeiras animadas da loja do Discord
- Moeda virtual "Runas" (500 de boas-vindas), sem pagamentos reais — o admin concede mais quando quiser
- Favoritos, pesquisa, pré-visualização, inventário e sistema de equipar
- **Códigos de oferta** (gift codes): resgatar no perfil; o admin cria, revoga e define limites/validade
- **Cosméticos exclusivos por estatuto** — Dono, Admin e Fundador têm molduras/auréolas/bandeiras próprias, atribuídas automaticamente ao inventário assim que ganham esse estatuto (não precisam de comprar nem resgatar código)

**Perfis**
- Avatar + banner de perfil, molduras e auréolas equipáveis (corrigido o bug visual que cortava a imagem quando uma moldura estava equipada)
- Estado personalizado (custom status), bio
- Presença estilo Discord: online / ausente / ocupado / invisível
- Insígnias de prestígio: verificado ✔, developer 💻, fundador 👑, apoiante inicial ⭐, tradutor 🌐
- Definições de privacidade: estado online, confirmações de leitura, quem pode iniciar conversa

**Gamificação**
- XP e níveis por actividade de mensagens
- Conquistas (primeira mensagem, 100 mensagens, 1000 mensagens, mais fácil de estender)
- Centro de notificações (menções, reacções, convites de grupo, prendas, subidas de nível)
- Pesquisa global (utilizadores, grupos, mensagens nas tuas conversas)

**Temas**
- **Valquíria** (padrão) — dourado, preto e roxo, cores do logo
- Discord — inspirado no Discord Dark clássico (blurple)
- Midnight — azul/roxo nórdico
- Ragnarok — fogo e cinzas
- Aurora — verde e azul boreal
- Claro

**Painel do Dono** (`/owner`, dentro da própria conta — não precisa do login separado de admin)
- Visível apenas para o utilizador com estatuto de Dono (`isOwner`)
- Estatísticas rápidas (utilizadores, online, conversas, mensagens)
- Atribuir insígnias de prestígio directamente a qualquer utilizador

**Painel administrativo** (login separado por `.env`, em `/admin/login`)
- Gestão de utilizadores: criar, editar, eliminar, resetar senha, promover/remover admin
- Atribuir insígnias, suspender/reactivar contas (ban), tornar "Fundador" (owner), conceder Runas
- Gestão de conversas e grupos: ver, eliminar
- **Loja**: criar/eliminar cosméticos e bundles
- **Códigos de oferta**: criar, revogar, eliminar
- **Registo de auditoria** das acções administrativas
- Estatísticas de uso (utilizadores, mensagens, uploads)
- Configuração: nome da app, registo aberto, uploads, anúncio/banner global
- Backups: criar, restaurar, exportar/importar JSON, limpar uploads

## Stack

**Backend:** Node.js, Express, Socket.IO, JWT, bcrypt, Helmet, CORS, dotenv, Multer
**Frontend:** React + Vite, TypeScript, TailwindCSS, Lucide Icons

## App para telemóvel e ambiente de trabalho

- **iPhone/Android**: a app é uma PWA instalável. Abre o site no telemóvel e usa "Adicionar ao ecrã principal" (a app mostra automaticamente esse aviso). Funciona como uma app normal, com ícone próprio.
- **Windows/Mac/Linux (.exe/.dmg/.AppImage)**: a pasta `/electron` tem um wrapper de ambiente de trabalho completo. Vê `electron/README.md` para gerar o instalador — precisa de correr no teu PC (não é possível compilar um `.exe` a partir desta conversa).

## Estrutura

```
/backend      -> API REST + Socket.IO + armazenamento em JSON
/frontend     -> React + Vite + TypeScript + Tailwind
/database     -> users.json, chats.json, messages.json, sessions.json, config.json, catalog.json, codes.json
/uploads      -> imagens, documentos, áudios, avatares e banners enviados
/scripts      -> install.ps1 (instalação) e start.ps1 (arranque) para Windows
railway.json  -> configuração de deploy no Railway
nginx.conf.example -> configuração opcional de proxy reverso para VPS próprio
```

## Como correr localmente (modo desenvolvimento)

### Opção rápida (Windows / PowerShell)

```powershell
cd scripts

# Primeira vez (ou depois de mudar de PC): instala tudo
powershell -ExecutionPolicy Bypass -File .\install.ps1

# Todas as vezes seguintes: só isto
powershell -ExecutionPolicy Bypass -File .\start.ps1
```

Se o PowerShell bloquear o script por não estar assinado, usa sempre o prefixo `powershell -ExecutionPolicy Bypass -File .\nome-do-script.ps1`, ou corre uma vez `Set-Executionpolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser` para não precisares de repetir isto.

- **`install.ps1`** — corre uma vez: instala dependências do backend e frontend, cria a base de dados JSON vazia, os uploads, e os ficheiros `.env` com valores por omissão.
- **`start.ps1`** — corre sempre que quiseres usar a app: arranca backend (porta 4000) e frontend (porta 5173), e tenta expor tudo publicamente via **Cloudflared → Ngrok → LocalTunnel** (usa o que estiver instalado; se tiveres o ngrok instalado, ele tem prioridade sobre o LocalTunnel).

### Manual

```bash
# Backend
cd backend
cp .env.example .env
npm install
npm run dev

# Frontend (noutro terminal)
cd frontend
cp .env.example .env
npm install
npm run dev
```

Acede a `http://localhost:5173`.

**A primeira conta que registares fica automaticamente Admin + Dono + Fundador**, com todos os cosméticos exclusivos dessas categorias já no inventário, prontos a equipar na Loja.

## Painel administrativo

Acede a `http://localhost:5173/admin/login`.

Credenciais definidas no `.env` do backend:

```
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
```

**Muda estes valores antes de expores a aplicação publicamente.**

No painel podes: gerir utilizadores (criar/editar/eliminar/resetar senha/promover admin), ver e eliminar conversas e mensagens, ver estatísticas, alterar configurações (registo aberto, uploads), e criar/restaurar/exportar/importar backups da base de dados.

## Deploy no Railway

1. Cria um novo projecto no Railway a partir deste repositório.
2. O `Dockerfile` na raiz constrói o frontend e serve tudo através do backend (um único serviço). O `railway.json` já define o build via Dockerfile e um healthcheck em `/api/health`.
3. Define as variáveis de ambiente (copia de `.env.example`):
   - `JWT_SECRET`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `CLIENT_URL` (o domínio público do Railway)
4. Railway atribui automaticamente a variável `PORT` — o servidor já a respeita.
5. **Importante:** os ficheiros `/database` e `/uploads` não são persistentes entre deploys a menos que actives um **Volume** no Railway apontando para essas pastas.

### Deploy alternativo num VPS próprio (Nginx)

Se preferires alojar num VPS em vez do Railway, o ficheiro `nginx.conf.example` na raiz mostra uma configuração de proxy reverso pronta a adaptar (inclui suporte a WebSocket para o Socket.IO). Não é necessário para o Railway — só para quem gere o próprio servidor.

## Configuração (`database/config.json`)

```json
{
  "appName": "Valquíria Chat",
  "theme": "dark",
  "port": 4000,
  "openRegistration": true,
  "allowUploads": true,
  "maxUploadSizeMb": 15
}
```

Pode ser editado directamente ou através do painel admin.

## Segurança

- Senhas com bcrypt (10 rounds)
- Autenticação via JWT (utilizadores) e JWT separado (admin)
- Helmet para headers HTTP seguros
- Rate limiting nas rotas de login/registo
- Sanitização básica de texto e usernames
- Bloqueio de extensões de ficheiro perigosas no upload

## Eventos Socket.IO

| Evento | Direcção | Descrição |
|---|---|---|
| `message` | cliente → servidor → participantes | Envia uma nova mensagem (directa ou de grupo) |
| `typing` / `stopTyping` | cliente → participantes | Indicador "a escrever..." |
| `readMessage` | cliente → servidor → participantes | Marca mensagens como lidas |
| `reactMessage` | cliente → servidor → participantes | Adiciona/remove uma reacção de emoji |
| `editMessage` | cliente → servidor → participantes | Edita uma mensagem própria de texto |
| `deleteMessage` | cliente → servidor → participantes | Apaga (soft-delete) uma mensagem |
| `statusChange` | cliente → servidor → todos | Muda o estado de presença (online/ausente/ocupado/invisível) |
| `userOnline` / `userOffline` | servidor → todos | Estado de ligação |
| `userStatusChanged` | servidor → todos | Estado de presença actualizado |
| `messageStatus` | servidor → participantes | Actualiza estado (entregue/lida) |
| `messageReaction` / `messageEdited` / `messageDeleted` | servidor → participantes | Sincroniza reacções, edições e remoções |

---

## Notas sobre o alcance desta versão

O prompt original pedia um sistema à escala do Discord Nitro/Steam Market (150+ itens únicos, tickets de suporte, wishlist, presentes entre utilizadores, dashboard de analytics avançado). Para entregar algo real e testado em vez de uma fachada, esta versão prioriza uma base sólida e extensível:

- Os cosméticos (banners, molduras, auréolas, fundos) são gerados via **CSS** (gradientes, glows, bordas), não imagens de arte binária — leves, editáveis pelo admin sem precisar de um designer, e fáceis de multiplicar. O catálogo inicial tem 36 itens across 9 bundles; o admin pode criar quantos quiser pelo painel.
- **Moeda virtual apenas** ("Runas") — não há integração de pagamentos reais (Stripe/PayPal), o que evitaria complexidade legal/fiscal fora do âmbito de um projecto pessoal.
- Wishlist, presentes entre utilizadores e sistema de tickets de suporte **não foram incluídos** nesta ronda — o registo de auditoria e o centro de notificações cobrem parte dessa necessidade, mas ficam como próximos passos naturais.
- Conquistas e níveis usam uma fórmula simples baseada em contagem de mensagens; é fácil de expandir no `backend/src/services/gamification.js`.
- As **mensagens de visualização única** impedem reabrir pela interface normal depois de vistas, mas — tal como a maioria das implementações caseiras deste tipo de funcionalidade — o ficheiro em si continua acessível através do URL directo em `/uploads`, já que não há encriptação ponta-a-ponta nem streaming único ao nível do servidor. É suficiente para o uso casual pretendido, mas não é uma garantia de segurança absoluta.

Feito para ser simples, rápido e funcional. Sem PostgreSQL, MySQL, MongoDB, Prisma ou Redis — apenas ficheiros JSON.
