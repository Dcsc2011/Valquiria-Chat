const { getUsers, saveUsers, getMessages } = require('./store');

const ACHIEVEMENTS = [
  { id: 'first_message', label: 'Primeira Palavra', description: 'Enviaste a tua primeira mensagem.', threshold: 1 },
  { id: 'chatty_100', label: 'Conversador', description: 'Enviaste 100 mensagens.', threshold: 100 },
  { id: 'chatty_1000', label: 'Voz de Valhalla', description: 'Enviaste 1000 mensagens.', threshold: 1000 },
];

function xpForLevel(level) {
  // Curva simples: cada nível seguinte exige mais XP que o anterior.
  return 50 * level * level;
}

function levelForXp(xp) {
  let level = 1;
  while (xp >= xpForLevel(level + 1)) level += 1;
  return level;
}

// Chamado sempre que um utilizador envia uma mensagem de texto/emoji/ficheiro.
// Atribui XP, recalcula nível e desbloqueia conquistas por contagem de mensagens.
async function registerMessageActivity(userId) {
  const users = getUsers();
  const user = users.find((u) => u.id === userId);
  if (!user) return { leveledUp: false, newAchievements: [] };

  const xpGain = 10;
  const previousLevel = user.level || 1;
  user.xp = (user.xp || 0) + xpGain;
  user.level = levelForXp(user.xp);

  const totalMessages = getMessages().filter((m) => m.senderId === userId).length;
  const owned = new Set(user.achievements || []);
  const newAchievements = [];
  for (const ach of ACHIEVEMENTS) {
    if (totalMessages >= ach.threshold && !owned.has(ach.id)) {
      owned.add(ach.id);
      newAchievements.push(ach.id);
    }
  }
  user.achievements = [...owned];

  await saveUsers(users);

  return {
    leveledUp: user.level > previousLevel,
    newLevel: user.level,
    newAchievements,
    xp: user.xp,
  };
}

module.exports = { ACHIEVEMENTS, xpForLevel, levelForXp, registerMessageActivity };
