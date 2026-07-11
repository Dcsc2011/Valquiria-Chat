# Valquíria Chat — App de Ambiente de Trabalho (Electron)

Isto é um "wrapper" nativo que abre o teu Valquíria Chat (Railway, ou local) numa janela própria de Windows/Mac/Linux, tal como o WhatsApp Desktop ou o Discord fazem com as suas apps web.

**Importante:** isto não é uma cópia offline da app — precisa sempre de se ligar a um servidor Valquíria Chat já a correr (o teu deploy no Railway, ou `http://localhost:4000` se estiveres a correr localmente). Por defeito aponta para `http://localhost:4000`; muda isto no menu **"Valquíria Chat → Alterar servidor..."** assim que abrires a app pela primeira vez.

## Como gerar o instalador `.exe` (Windows)

Isto tem de ser corrido **no teu PC** (não corre neste ambiente de conversa) — o `electron-builder` precisa de descarregar binários específicos do Windows.

```powershell
cd electron
npm install
npm run dist:win
```

O instalador `.exe` fica em `electron/dist/`. Corre-o para instalar a app normalmente, com atalho no ambiente de trabalho e no menu iniciar.

## Outras plataformas

```bash
npm run dist:mac     # gera um .dmg (tem de correr num Mac)
npm run dist:linux   # gera um .AppImage
```

## Testar sem gerar instalador

```bash
cd electron
npm install
npm start
```

Isto abre a app directamente, sem empacotar nada — útil para testar antes de gerares o instalador final.

## Porque não vem já um `.exe` pronto?

Compilar um instalador `.exe` do Windows exige o Windows (ou `wine` num Linux) e faz o download de binários grandes específicos do Electron para essa plataforma — algo que não é possível fazer de forma fiável a partir deste ambiente de conversa. Em vez de fingir entregar um ficheiro que não funcionaria, preferi deixar-te o projecto completo e testado (sintaticamente válido), pronto a compilar com um único comando no teu PC.
