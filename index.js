require('dotenv').config();
const {
  Client, GatewayIntentBits, Partials, EmbedBuilder, ActionRowBuilder,
  ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ModalBuilder,
  TextInputBuilder, TextInputStyle, ChannelType, PermissionFlagsBits,
  SlashCommandBuilder, AttachmentBuilder, MessageFlags,
} = require('discord.js');
const path = require('path');
const config = require('./config');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
  partials: [Partials.Channel],
});

// ---------- utilita ----------
const isStaff = (member) =>
  member.permissions.has(PermissionFlagsBits.Administrator) ||
  config.ruoliStaff.some((r) => member.roles.cache.has(r));

const base = () => new EmbedBuilder().setColor(config.colore).setFooter({ text: `${config.nomeServer}  •  Sistema Ticket` });
const LINEA = '▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬';

const slug = (s) =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 20) || 'utente';

// Il topic del canale contiene: ticket:<idUtente>:<idCategoria>:<idStaffClaim|0>
const leggiTopic = (ch) => {
  const m = /^ticket:(\d+):([a-z]+):(\d+)$/.exec(ch.topic || '');
  return m ? { utente: m[1], categoria: m[2], claim: m[3] } : null;
};

async function log(guild, embed, files = []) {
  const ch = await guild.channels.fetch(config.canaleLog).catch(() => null);
  if (ch) await ch.send({ embeds: [embed], files }).catch(() => {});
}

async function creaTrascrizione(channel) {
  let tutti = [];
  let before;
  while (true) {
    const batch = await channel.messages.fetch({ limit: 100, before });
    if (!batch.size) break;
    tutti = tutti.concat([...batch.values()]);
    before = batch.last().id;
    if (batch.size < 100) break;
  }
  tutti.reverse();
  const righe = tutti.map((m) => {
    const ora = m.createdAt.toLocaleString('it-IT', { timeZone: 'Europe/Rome' });
    const allegati = m.attachments.size ? ' [allegati: ' + m.attachments.map((a) => a.url).join(', ') + ']' : '';
    const testo = m.content || (m.embeds.length ? '[embed]' : '');
    return `[${ora}] ${m.author.tag}: ${testo}${allegati}`;
  });
  const header = `TRASCRIZIONE TICKET - ${config.nomeServer}\nCanale: #${channel.name}\nGenerata: ${new Date().toLocaleString('it-IT', { timeZone: 'Europe/Rome' })}\n${'-'.repeat(50)}\n`;
  return new AttachmentBuilder(Buffer.from(header + righe.join('\n'), 'utf8'), { name: `trascrizione-${channel.name}.txt` });
}

// ---------- comandi ----------
const comandi = [
  new SlashCommandBuilder().setName('pannello-ticket').setDescription('Invia il pannello per aprire i ticket')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  new SlashCommandBuilder().setName('ticket-aggiungi').setDescription('Aggiungi un utente al ticket')
    .addUserOption((o) => o.setName('utente').setDescription('Utente da aggiungere').setRequired(true)),
  new SlashCommandBuilder().setName('ticket-rimuovi').setDescription('Rimuovi un utente dal ticket')
    .addUserOption((o) => o.setName('utente').setDescription('Utente da rimuovere').setRequired(true)),
  new SlashCommandBuilder().setName('ticket-rinomina').setDescription('Rinomina il ticket')
    .addStringOption((o) => o.setName('nome').setDescription('Nuovo nome').setRequired(true)),
].map((c) => c.toJSON());

let avviato = false;
const avvio = async () => {
  if (avviato) return;
  avviato = true;
  const guild = await client.guilds.fetch(process.env.GUILD_ID);
  await guild.commands.set(comandi);
  console.log(`Bot online come ${client.user.tag} su ${guild.name}`);
};
client.once('clientReady', avvio);
client.once('ready', avvio); // compatibilita con versioni piu vecchie di discord.js

// ---------- pannello ----------
function pannello() {
  const embed = base()
    .setAuthor({ name: config.nomeServer.toUpperCase() })
    .setTitle('CENTRO TICKET')
    .setDescription(
      `${LINEA}\n` +
      'Hai bisogno di supporto o vuoi contattare la Direzione?\n' +
      'Scegli la categoria dal menu qui sotto: si aprira un canale **privato** con lo staff.\n' +
      `${LINEA}\n\n` +
      config.categorie.map((c) => `${c.emoji}  **${c.etichetta}**\n> ${c.descrizione}`).join('\n\n') +
      `\n\n${LINEA}\n⚠️ *Un solo ticket aperto alla volta. Gli abusi vengono sanzionati.*`
    )
    .setImage('attachment://banner.png');
  if (config.logoUrl) embed.setThumbnail(config.logoUrl);
  const menu = new StringSelectMenuBuilder()
    .setCustomId('ticket_select')
    .setPlaceholder('▸ Seleziona il tipo di ticket...')
    .addOptions(config.categorie.map((c) => ({ label: c.etichetta, description: c.descrizione, value: c.id, emoji: c.emoji })));
  return {
    embeds: [embed],
    components: [new ActionRowBuilder().addComponents(menu)],
    files: [new AttachmentBuilder(path.join(__dirname, config.banner), { name: 'banner.png' })],
  };
}

// ---------- interazioni ----------
client.on('interactionCreate', async (i) => {
  try {
    // Slash commands
    if (i.isChatInputCommand()) {
      if (i.commandName === 'pannello-ticket') {
        await i.channel.send(pannello());
        return i.reply({ content: '✅ Pannello inviato.', flags: MessageFlags.Ephemeral });
      }
      const info = leggiTopic(i.channel);
      if (!info) return i.reply({ content: '❌ Questo comando funziona solo dentro un ticket.', flags: MessageFlags.Ephemeral });
      if (!isStaff(i.member)) return i.reply({ content: '❌ Solo lo staff puo usare questo comando.', flags: MessageFlags.Ephemeral });

      if (i.commandName === 'ticket-aggiungi') {
        const u = i.options.getUser('utente');
        await i.channel.permissionOverwrites.edit(u.id, { ViewChannel: true, SendMessages: true, ReadMessageHistory: true, AttachFiles: true });
        return i.reply(`✅ ${u} aggiunto al ticket.`);
      }
      if (i.commandName === 'ticket-rimuovi') {
        const u = i.options.getUser('utente');
        if (u.id === info.utente) return i.reply({ content: '❌ Non puoi rimuovere il proprietario del ticket.', flags: MessageFlags.Ephemeral });
        await i.channel.permissionOverwrites.delete(u.id);
        return i.reply(`✅ ${u} rimosso dal ticket.`);
      }
      if (i.commandName === 'ticket-rinomina') {
        await i.channel.setName(slug(i.options.getString('nome')));
        return i.reply({ content: '✅ Ticket rinominato.', flags: MessageFlags.Ephemeral });
      }
    }

    // Selezione categoria -> modulo
    if (i.isStringSelectMenu() && i.customId === 'ticket_select') {
      const cat = config.categorie.find((c) => c.id === i.values[0]);
      // Reset del menu
      await i.message.edit({ components: pannello().components }).catch(() => {});

      const aperti = i.guild.channels.cache.filter((c) => {
        const t = leggiTopic(c);
        return t && t.utente === i.user.id;
      }).size;
      if (aperti >= config.maxTicketPerUtente) {
        return i.reply({ content: `❌ Hai gia ${aperti} ticket aperto/i. Chiudilo prima di aprirne un altro.`, flags: MessageFlags.Ephemeral });
      }

      const modal = new ModalBuilder().setCustomId(`ticket_modal:${cat.id}`).setTitle(cat.etichetta.slice(0, 45));
      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('nick').setLabel('Nickname Roblox / Nome RP').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(60)),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('motivo').setLabel('Descrivi il motivo del ticket').setStyle(TextInputStyle.Paragraph).setRequired(true).setMaxLength(1000)),
      );
      return i.showModal(modal);
    }

    // Modulo inviato -> crea canale
    if (i.isModalSubmit() && i.customId.startsWith('ticket_modal:')) {
      await i.deferReply({ flags: MessageFlags.Ephemeral });
      const cat = config.categorie.find((c) => c.id === i.customId.split(':')[1]);
      const nick = i.fields.getTextInputValue('nick');
      const motivo = i.fields.getTextInputValue('motivo');

      const permessi = [
        { id: i.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
        { id: i.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles] },
        { id: client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.EmbedLinks] },
        ...config.ruoliStaff.map((r) => ({ id: r, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.ManageMessages] })),
      ];

      const canale = await i.guild.channels.create({
        name: `${cat.prefisso}-${slug(i.user.username)}`,
        type: ChannelType.GuildText,
        parent: cat.categoriaDiscord,
        topic: `ticket:${i.user.id}:${cat.id}:0`,
        permissionOverwrites: permessi,
      });

      const embed = base()
        .setAuthor({ name: `${config.nomeServer.toUpperCase()}  |  TICKET` })
        .setTitle(`${cat.emoji}  ${cat.etichetta}`)
        .setDescription(
          `${LINEA}\nBenvenuto ${i.user}, lo staff ti rispondera appena possibile.\nNel frattempo aggiungi tutti i dettagli utili.\n${LINEA}`)
        .addFields(
          { name: '👤  Nickname / Nome RP', value: `\`${nick}\``, inline: true },
          { name: '🎫  Aperto da', value: `${i.user}`, inline: true },
          { name: '📌  Stato', value: '🟡 In attesa di un membro dello staff', inline: false },
          { name: '📝  Motivo', value: `>>> ${motivo}` },
        )
        .setThumbnail(i.user.displayAvatarURL())
        .setTimestamp();
      const righe = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('ticket_claim').setLabel('Prendi in carico').setEmoji('✋').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('ticket_close').setLabel('Chiudi').setEmoji('🔒').setStyle(ButtonStyle.Danger),
      );
      await canale.send({
        content: `${i.user} ${config.ruoliStaff.map((r) => `<@&${r}>`).join(' ')}`,
        embeds: [embed],
        components: [righe],
        allowedMentions: { parse: ['users', 'roles'] },
      });

      await log(i.guild, base().setTitle('📂 Ticket aperto').addFields(
        { name: 'Canale', value: `${canale}`, inline: true },
        { name: 'Utente', value: `${i.user} (${nick})`, inline: true },
        { name: 'Categoria', value: cat.etichetta, inline: true }).setTimestamp());
      return i.editReply(`✅ Ticket creato: ${canale}`);
    }

    // Bottoni
    if (i.isButton()) {
      const info = leggiTopic(i.channel);
      if (!info) return;

      if (i.customId === 'ticket_claim') {
        if (!isStaff(i.member)) return i.reply({ content: '❌ Solo lo staff puo prendere in carico.', flags: MessageFlags.Ephemeral });
        if (info.claim !== '0') return i.reply({ content: `❌ Gia preso in carico da <@${info.claim}>.`, flags: MessageFlags.Ephemeral });
        await i.channel.setTopic(`ticket:${info.utente}:${info.categoria}:${i.user.id}`);
        const embed = EmbedBuilder.from(i.message.embeds[0]);
        const campi = embed.data.fields.map((f) => (f.name.includes('Stato') ? { ...f, value: `🟢 Preso in carico da ${i.user}` } : f));
        embed.setFields(campi);
        await i.update({ embeds: [embed] });
        return i.channel.send(`✋ ${i.user} ha preso in carico il ticket.`);
      }

      if (i.customId === 'ticket_close') {
        if (!isStaff(i.member) && i.user.id !== info.utente)
          return i.reply({ content: '❌ Non puoi chiudere questo ticket.', flags: MessageFlags.Ephemeral });
        const modal = new ModalBuilder().setCustomId('ticket_close_modal').setTitle('Chiusura ticket');
        modal.addComponents(new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('motivo').setLabel('Motivo / esito (opzionale)').setStyle(TextInputStyle.Paragraph).setRequired(false).setMaxLength(500)));
        return i.showModal(modal);
      }
    }

    // Chiusura
    if (i.isModalSubmit() && i.customId === 'ticket_close_modal') {
      const info = leggiTopic(i.channel);
      if (!info) return;
      const motivo = i.fields.getTextInputValue('motivo') || 'Nessun motivo specificato';
      await i.reply('🔒 Ticket in chiusura, il canale verra eliminato tra 5 secondi...');

      const file = await creaTrascrizione(i.channel);
      const cat = config.categorie.find((c) => c.id === info.categoria);
      const embed = base().setTitle('🔒 Ticket chiuso').addFields(
        { name: 'Ticket', value: `#${i.channel.name}`, inline: true },
        { name: 'Categoria', value: cat ? cat.etichetta : info.categoria, inline: true },
        { name: 'Proprietario', value: `<@${info.utente}>`, inline: true },
        { name: 'Preso in carico da', value: info.claim !== '0' ? `<@${info.claim}>` : 'Nessuno', inline: true },
        { name: 'Chiuso da', value: `${i.user}`, inline: true },
        { name: 'Motivo', value: motivo },
      ).setTimestamp();
      await log(i.guild, embed, [file]);

      // Invia trascrizione in DM al proprietario (se ha i DM aperti)
      const proprietario = await client.users.fetch(info.utente).catch(() => null);
      if (proprietario) await proprietario.send({ embeds: [embed], files: [file] }).catch(() => {});

      setTimeout(() => i.channel.delete().catch(() => {}), 5000);
    }
  } catch (err) {
    console.error(err);
    const msg = { content: '❌ Si e verificato un errore. Contatta un amministratore.', flags: MessageFlags.Ephemeral };
    if (i.deferred || i.replied) i.followUp(msg).catch(() => {});
    else if (i.isRepliable()) i.reply(msg).catch(() => {});
  }
});

// ---------- Render: server HTTP minimo ----------
// Render (Web Service) richiede una porta in ascolto; serve anche per tenere il servizio sveglio.
const http = require('http');
const PORT = process.env.PORT || 3000;
http
  .createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('ASL Napoli 1 Centro - Bot Ticket online');
  })
  .listen(PORT, () => console.log(`Server HTTP in ascolto sulla porta ${PORT}`));

// Auto-ping ogni 10 minuti (Render imposta RENDER_EXTERNAL_URL) per evitare lo spin-down del piano gratuito
if (process.env.RENDER_EXTERNAL_URL) {
  setInterval(() => fetch(process.env.RENDER_EXTERNAL_URL).catch(() => {}), 10 * 60 * 1000);
}

client.login(process.env.DISCORD_TOKEN);
