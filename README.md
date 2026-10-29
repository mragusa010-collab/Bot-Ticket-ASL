# Bot Ticket - ASL Napoli 1 Centro (Discord RP)

## 1. Crea il bot
1. Vai su https://discord.com/developers/applications > **New Application**.
2. Scheda **Bot**: premi **Reset Token** e copia il token.
3. Sempre in **Bot**, attiva **Message Content Intent**.
4. Scheda **OAuth2 > URL Generator**: spunta `bot` + `applications.commands`,
   permessi: **Administrator** (oppure Manage Channels, Manage Roles, Send Messages, Embed Links, Attach Files, Read Message History).
5. Apri il link generato e aggiungi il bot al server.

## 2. Configura
1. Copia `.env.example` in `.env` e inserisci `DISCORD_TOKEN` e `GUILD_ID`.
2. Apri `config.js` e sostituisci tutti gli `ID_...` con gli ID reali di ruoli, canale log e categorie Discord
   (attiva Modalita sviluppatore in Discord > tasto destro > Copia ID).

## 3. Avvia
```
npm install
npm start
```
Poi nel canale desiderato usa `/pannello-ticket`.

## Funzioni
- Pannello con menu a tendina (5 categorie modificabili in `config.js`)
- Modulo: Nickname Roblox / Nome RP + motivo
- Canale privato creato nella categoria giusta, visibile a utente + staff
- Bottoni **Prendi in carico** e **Chiudi** (con motivo)
- Trascrizione .txt inviata nel canale log e in DM all'utente
- Limite ticket per utente
- Comandi staff: `/ticket-aggiungi`, `/ticket-rimuovi`, `/ticket-rinomina`

## Hosting H24
Per tenerlo sempre online usa un VPS, Railway, Render o un Raspberry Pi (`npm i -g pm2 && pm2 start index.js --name asl-ticket`).

## Grafica
- Tema nero (`colore` in `config.js`) con banner in `assets/banner.png` (1200x400): sostituiscilo con il tuo logo/banner mantenendo lo stesso nome.
