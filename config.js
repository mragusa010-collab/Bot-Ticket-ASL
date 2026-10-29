// ============================================================
//  CONFIGURAZIONE - sostituisci gli ID con quelli del tuo server
//  (Impostazioni utente > Avanzate > Modalita sviluppatore,
//   poi tasto destro su ruolo/canale/categoria > Copia ID)
// ============================================================
module.exports = {
  nomeServer: 'ASL Napoli 1 Centro',
  colore: 0x111111, // nero (0x000000 su Discord viene mostrato come 'nessun colore')
  logoUrl: '', // opzionale: link diretto al logo ASL (png/jpg)
  banner: './assets/banner.png', // banner del pannello (sostituiscilo con il tuo, 1200x400)

  // Ruoli che possono vedere e gestire i ticket
  ruoliStaff: ['ID_RUOLO_STAFF', 'ID_RUOLO_DIREZIONE'],

  // Canale dove vengono inviati i log e le trascrizioni
  canaleLog: 'ID_CANALE_LOG',

  // Massimo ticket aperti per utente
  maxTicketPerUtente: 1,

  // Categorie ticket. Ogni categoria ha la sua categoria Discord dove viene creato il canale.
  categorie: [
    {
      id: 'assistenza',
      etichetta: 'Assistenza generale',
      descrizione: 'Domande e supporto sul server',
      emoji: '🛠️',
      categoriaDiscord: 'ID_CATEGORIA_ASSISTENZA',
      prefisso: 'assistenza',
    },
    {
      id: 'candidatura',
      etichetta: 'Candidatura / Assunzione',
      descrizione: 'Entra in ASL (Soccorritore, Infermiere, Medico)',
      emoji: '📝',
      categoriaDiscord: 'ID_CATEGORIA_CANDIDATURE',
      prefisso: 'candidatura',
    },
    {
      id: 'corsi',
      etichetta: 'Corsi ed Esami',
      descrizione: 'Prenota corsi, esami teorici, BLS-D',
      emoji: '🎓',
      categoriaDiscord: 'ID_CATEGORIA_CORSI',
      prefisso: 'corsi',
    },
    {
      id: 'segnalazione',
      etichetta: 'Segnalazione',
      descrizione: 'Segnala un comportamento o un problema',
      emoji: '🚨',
      categoriaDiscord: 'ID_CATEGORIA_SEGNALAZIONI',
      prefisso: 'segnalazione',
    },
    {
      id: 'amministrativo',
      etichetta: 'Ferie / Dimissioni / Amministrativo',
      descrizione: 'Richieste interne al personale ASL',
      emoji: '📁',
      categoriaDiscord: 'ID_CATEGORIA_AMMINISTRATIVO',
      prefisso: 'admin',
    },
  ],
};
