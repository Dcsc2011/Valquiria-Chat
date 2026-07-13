// Catálogo de cosméticos do Valquíria Chat Premium.
// Os visuais são gerados via CSS (gradientes animados, glows, anéis giratórios)
// em vez de imagens binárias — leves, editáveis pelo admin, e sem depender de
// arte externa. Raridades mais altas ganham efeitos mais elaborados:
// common/rare = estático · epic = glow · legendary = shimmer + glow forte ·
// mythic = anel giratório + shimmer + glow máximo.

const CATEGORIES = ['banner', 'frame', 'aura', 'badge', 'background', 'emoji', 'cursor', 'profileEffect'];
const RARITIES = ['common', 'rare', 'epic', 'legendary', 'mythic'];

const BUNDLES = [
  { id: 'royal', name: 'Royal', theme: 'Ouro e roxo imperial' },
  { id: 'ragnarok', name: 'Ragnarok', theme: 'Fogo e cinzas do fim dos tempos' },
  { id: 'valhalla', name: 'Valhalla', theme: 'Dourado celestial dos guerreiros' },
  { id: 'aurora', name: 'Aurora', theme: 'Luzes do norte, verde e azul' },
  { id: 'galaxy', name: 'Galaxy', theme: 'Nebulosas roxas e estrelas' },
  { id: 'shadow', name: 'Shadow', theme: 'Preto profundo e prata fosca' },
  { id: 'dragon', name: 'Dragon', theme: 'Escamas verdes e vermelhas' },
  { id: 'cyber', name: 'Cyber', theme: 'Neon ciano e magenta' },
  { id: 'celestial', name: 'Celestial', theme: 'Azul-noite com constelações' },
  { id: 'bifrost', name: 'Bifrost', theme: 'Ponte arco-íris entre mundos' },
  { id: 'kraken', name: 'Kraken', theme: 'Abismo oceânico e tentáculos de tinta' },
];

const ITEMS = [
  // ---------- Royal ----------
  { id: 'banner_royal', type: 'banner', bundleId: 'royal', name: 'Bandeira Real', rarity: 'legendary', price: 800,
    preview: { background: 'linear-gradient(120deg, #1a0b2e 0%, #5b21b6 45%, #d4af37 75%, #5b21b6 100%)', shimmer: true } },
  { id: 'frame_royal', type: 'frame', bundleId: 'royal', name: 'Moldura Real', rarity: 'epic', price: 500,
    preview: { border: '3px solid #d4af37', boxShadow: '0 0 14px #d4af37cc', animation: 'pulse 2.5s infinite' } },
  { id: 'aura_royal', type: 'aura', bundleId: 'royal', name: 'Auréola Real', rarity: 'legendary', price: 700,
    preview: { boxShadow: '0 0 26px 6px #7C3AED99', ringGradient: 'conic-gradient(from 0deg, #7C3AED, #d4af37, #7C3AED)', spinDuration: '4s' } },

  // ---------- Ragnarok ----------
  { id: 'banner_ragnarok', type: 'banner', bundleId: 'ragnarok', name: 'Bandeira Ragnarok', rarity: 'legendary', price: 800,
    preview: { background: 'linear-gradient(120deg, #1a0000 0%, #7f1d1d 40%, #f97316 70%, #7f1d1d 100%)', shimmer: true } },
  { id: 'frame_ragnarok', type: 'frame', bundleId: 'ragnarok', name: 'Moldura Ragnarok', rarity: 'epic', price: 500,
    preview: { border: '3px solid #f97316', boxShadow: '0 0 14px #f97316cc', animation: 'pulse 2s infinite' } },
  { id: 'aura_ragnarok', type: 'aura', bundleId: 'ragnarok', name: 'Auréola de Cinzas', rarity: 'mythic', price: 1200,
    preview: { boxShadow: '0 0 30px 8px #dc2626aa', ringGradient: 'conic-gradient(from 90deg, #dc2626, #f97316, #1a0000, #dc2626)', spinDuration: '2.5s' } },

  // ---------- Valhalla ----------
  { id: 'banner_valhalla', type: 'banner', bundleId: 'valhalla', name: 'Bandeira de Valhalla', rarity: 'mythic', price: 1200,
    preview: { background: 'linear-gradient(120deg, #1a1400 0%, #92720a 40%, #ffd76e 70%, #92720a 100%)', shimmer: true } },
  { id: 'frame_valhalla', type: 'frame', bundleId: 'valhalla', name: 'Moldura Dourada', rarity: 'legendary', price: 700,
    preview: { border: '3px solid #ffd76e', boxShadow: '0 0 18px #ffd76eee', animation: 'pulse 3s infinite' } },
  { id: 'aura_valhalla', type: 'aura', bundleId: 'valhalla', name: 'Auréola Celestial', rarity: 'mythic', price: 1300,
    preview: { boxShadow: '0 0 30px 8px #ffd76eaa', ringGradient: 'conic-gradient(from 0deg, #ffd76e, #ffffff, #ffd76e)', spinDuration: '5s' } },

  // ---------- Aurora ----------
  { id: 'banner_aurora', type: 'banner', bundleId: 'aurora', name: 'Bandeira Aurora', rarity: 'epic', price: 500,
    preview: { background: 'linear-gradient(120deg, #04121a 0%, #0d9488 40%, #34d399 70%, #0d9488 100%)', shimmer: true } },
  { id: 'frame_aurora', type: 'frame', bundleId: 'aurora', name: 'Moldura Aurora', rarity: 'rare', price: 300,
    preview: { border: '3px solid #34d399', boxShadow: '0 0 10px #34d399cc' } },
  { id: 'aura_aurora', type: 'aura', bundleId: 'aurora', name: 'Auréola Boreal', rarity: 'epic', price: 500,
    preview: { boxShadow: '0 0 22px 5px #2dd4bfaa', animation: 'pulse 2.2s infinite' } },

  // ---------- Galaxy ----------
  { id: 'banner_galaxy', type: 'banner', bundleId: 'galaxy', name: 'Bandeira Galáctica', rarity: 'epic', price: 500,
    preview: { background: 'radial-gradient(circle at 30% 30%, #6d28d9, #0b0f19 70%)', shimmer: true } },
  { id: 'frame_galaxy', type: 'frame', bundleId: 'galaxy', name: 'Moldura Nebulosa', rarity: 'rare', price: 300,
    preview: { border: '3px solid #8b5cf6', boxShadow: '0 0 10px #8b5cf6cc' } },
  { id: 'aura_galaxy', type: 'aura', bundleId: 'galaxy', name: 'Auréola Cósmica', rarity: 'legendary', price: 700,
    preview: { boxShadow: '0 0 24px 6px #8b5cf6aa', ringGradient: 'conic-gradient(from 45deg, #8b5cf6, #ec4899, #8b5cf6)', spinDuration: '4.5s' } },

  // ---------- Shadow ----------
  { id: 'banner_shadow', type: 'banner', bundleId: 'shadow', name: 'Bandeira das Sombras', rarity: 'rare', price: 300,
    preview: { background: 'linear-gradient(120deg, #000000 0%, #1c1c1c 45%, #4b5563 70%, #1c1c1c 100%)' } },
  { id: 'frame_shadow', type: 'frame', bundleId: 'shadow', name: 'Moldura Sombria', rarity: 'common', price: 150,
    preview: { border: '3px solid #6b7280', boxShadow: '0 0 8px #6b7280aa' } },
  { id: 'aura_shadow', type: 'aura', bundleId: 'shadow', name: 'Auréola Sombria', rarity: 'common', price: 150,
    preview: { boxShadow: '0 0 16px 4px #374151aa', animation: 'pulse 3.5s infinite' } },

  // ---------- Dragon ----------
  { id: 'banner_dragon', type: 'banner', bundleId: 'dragon', name: 'Bandeira do Dragão', rarity: 'legendary', price: 800,
    preview: { background: 'linear-gradient(120deg, #052e16 0%, #166534 40%, #b91c1c 70%, #166534 100%)', shimmer: true } },
  { id: 'frame_dragon', type: 'frame', bundleId: 'dragon', name: 'Moldura Escamada', rarity: 'epic', price: 500,
    preview: { border: '3px solid #16a34a', boxShadow: '0 0 14px #16a34acc', animation: 'pulse 2.4s infinite' } },
  { id: 'aura_dragon', type: 'aura', bundleId: 'dragon', name: 'Auréola Flamejante', rarity: 'legendary', price: 700,
    preview: { boxShadow: '0 0 26px 6px #b91c1caa', ringGradient: 'conic-gradient(from 20deg, #b91c1c, #f97316, #166534, #b91c1c)', spinDuration: '3.5s' } },

  // ---------- Cyber ----------
  { id: 'banner_cyber', type: 'banner', bundleId: 'cyber', name: 'Bandeira Cyber', rarity: 'epic', price: 500,
    preview: { background: 'linear-gradient(120deg, #0b0f19 0%, #0891b2 40%, #d946ef 70%, #0891b2 100%)', shimmer: true } },
  { id: 'frame_cyber', type: 'frame', bundleId: 'cyber', name: 'Moldura Neon', rarity: 'rare', price: 300,
    preview: { border: '3px solid #22d3ee', boxShadow: '0 0 14px #22d3eeee' } },
  { id: 'aura_cyber', type: 'aura', bundleId: 'cyber', name: 'Auréola Neon', rarity: 'epic', price: 550,
    preview: { boxShadow: '0 0 22px 5px #d946efaa', animation: 'pulse 1.5s infinite' } },

  // ---------- Celestial ----------
  { id: 'banner_celestial', type: 'banner', bundleId: 'celestial', name: 'Bandeira Celestial', rarity: 'mythic', price: 1200,
    preview: { background: 'linear-gradient(120deg, #020617 0%, #1e3a8a 40%, #93c5fd 70%, #1e3a8a 100%)', shimmer: true } },
  { id: 'frame_celestial', type: 'frame', bundleId: 'celestial', name: 'Moldura Estelar', rarity: 'legendary', price: 700,
    preview: { border: '3px solid #93c5fd', boxShadow: '0 0 18px #93c5fdee', animation: 'pulse 3.2s infinite' } },
  { id: 'aura_celestial', type: 'aura', bundleId: 'celestial', name: 'Auréola das Constelações', rarity: 'mythic', price: 1250,
    preview: { boxShadow: '0 0 30px 8px #60a5faaa', ringGradient: 'conic-gradient(from 60deg, #60a5fa, #ffffff, #1e3a8a, #60a5fa)', spinDuration: '6s' } },

  // ---------- Bifrost ----------
  { id: 'banner_bifrost', type: 'banner', bundleId: 'bifrost', name: 'Bandeira do Bifrost', rarity: 'mythic', price: 1200,
    preview: { background: 'linear-gradient(120deg, #ef4444, #f59e0b, #22c55e, #3b82f6, #8b5cf6, #ef4444)', shimmer: true } },
  { id: 'frame_bifrost', type: 'frame', bundleId: 'bifrost', name: 'Moldura Arco-Íris', rarity: 'legendary', price: 700,
    preview: { border: '3px solid #f59e0b', boxShadow: '0 0 18px #a78bfaee', animation: 'pulse 2.6s infinite' } },
  { id: 'aura_bifrost', type: 'aura', bundleId: 'bifrost', name: 'Auréola do Bifrost', rarity: 'mythic', price: 1300,
    preview: { boxShadow: '0 0 30px 8px #a78bfaaa', ringGradient: 'conic-gradient(from 0deg, #ef4444, #f59e0b, #22c55e, #3b82f6, #8b5cf6, #ef4444)', spinDuration: '3s' } },

  // ---------- Kraken ----------
  { id: 'banner_kraken', type: 'banner', bundleId: 'kraken', name: 'Bandeira do Kraken', rarity: 'epic', price: 550,
    preview: { background: 'linear-gradient(120deg, #020617 0%, #0e4d64 45%, #0a2540 100%)', shimmer: true } },
  { id: 'frame_kraken', type: 'frame', bundleId: 'kraken', name: 'Moldura Tentacular', rarity: 'rare', price: 320,
    preview: { border: '3px solid #0891b2', boxShadow: '0 0 12px #0891b2cc' } },
  { id: 'aura_kraken', type: 'aura', bundleId: 'kraken', name: 'Auréola do Abismo', rarity: 'epic', price: 550,
    preview: { boxShadow: '0 0 22px 6px #075985aa', animation: 'pulse 3s infinite' } },

  // ---------- Extras avulsos ----------
  { id: 'badge_pioneer', type: 'badge', bundleId: null, name: 'Pioneiro', rarity: 'mythic', price: null, codeOnly: true,
    preview: { emoji: '🛡️', color: '#d4af37' } },
  { id: 'badge_valquiria', type: 'badge', bundleId: null, name: 'Insígnia da Valquíria', rarity: 'legendary', price: 1000,
    preview: { emoji: '🪽', color: '#7C3AED' } },
  { id: 'badge_dragon_heart', type: 'badge', bundleId: null, name: 'Coração de Dragão', rarity: 'epic', price: 600,
    preview: { emoji: '🐉', color: '#16a34a' } },
  { id: 'background_runes', type: 'background', bundleId: null, name: 'Fundo de Runas', rarity: 'rare', price: 250,
    preview: { background: 'repeating-linear-gradient(45deg, #0b0f19 0 12px, #131a2b 12px 24px)' } },
  { id: 'background_frost', type: 'background', bundleId: null, name: 'Fundo Gélido', rarity: 'rare', price: 250,
    preview: { background: 'linear-gradient(180deg, #0b1220 0%, #1e293b 100%)' } },
  { id: 'background_nebula', type: 'background', bundleId: null, name: 'Fundo Nebulosa', rarity: 'epic', price: 400,
    preview: { background: 'radial-gradient(circle at 70% 20%, #4c1d95, #0b0f19 65%)', shimmer: true } },
  { id: 'emoji_pack_norse', type: 'emoji', bundleId: null, name: 'Pack de Emoji Nórdico', rarity: 'epic', price: 400,
    preview: { emojis: ['⚔️', '🛡️', '🪓', '🐺', '🌌', '⚡'] } },
  { id: 'emoji_pack_dragon', type: 'emoji', bundleId: null, name: 'Pack de Emoji Dragão', rarity: 'rare', price: 300,
    preview: { emojis: ['🐉', '🔥', '💎', '🗡️'] } },
  { id: 'cursor_gold', type: 'cursor', bundleId: null, name: 'Cursor Dourado', rarity: 'epic', price: 400,
    preview: { cursorColor: '#d4af37' } },
  { id: 'cursor_neon', type: 'cursor', bundleId: null, name: 'Cursor Neon', rarity: 'rare', price: 250,
    preview: { cursorColor: '#22d3ee' } },

  // ---------- Exclusivo do Fundador (badge 'founder') ----------
  { id: 'frame_founder', type: 'frame', bundleId: null, name: 'Moldura do Fundador', rarity: 'mythic', price: null, founderOnly: true,
    preview: { border: '3px solid #f59e0b', boxShadow: '0 0 24px 6px #f59e0bcc', animation: 'pulse 2s infinite' } },
  { id: 'badge_founder_exclusive', type: 'badge', bundleId: null, name: 'Selo do Fundador', rarity: 'mythic', price: null, founderOnly: true,
    preview: { emoji: '🏛️', color: '#f59e0b' } },

  // ---------- Exclusivo de Admin ----------
  { id: 'frame_admin', type: 'frame', bundleId: null, name: 'Moldura de Administrador', rarity: 'legendary', price: null, adminOnly: true,
    preview: { border: '3px solid #ef4444', boxShadow: '0 0 20px 5px #ef4444cc', animation: 'pulse 1.8s infinite' } },
  { id: 'aura_admin', type: 'aura', bundleId: null, name: 'Auréola de Administrador', rarity: 'legendary', price: null, adminOnly: true,
    preview: { boxShadow: '0 0 24px 6px #ef4444aa', ringGradient: 'conic-gradient(from 0deg, #ef4444, #7f1d1d, #ef4444)', spinDuration: '4s' } },

  // ---------- Exclusivo do Owner (dono da instância) ----------
  { id: 'frame_owner', type: 'frame', bundleId: null, name: 'Moldura do Fundador Supremo', rarity: 'mythic', price: null, ownerOnly: true,
    preview: { border: '3px solid #ffffff', boxShadow: '0 0 30px 10px #ffffffcc', animation: 'pulse 1.2s infinite' } },
  { id: 'aura_owner', type: 'aura', bundleId: null, name: 'Auréola do Dono', rarity: 'mythic', price: null, ownerOnly: true,
    preview: { boxShadow: '0 0 36px 12px #ffffffcc', ringGradient: 'conic-gradient(from 0deg, #ffffff, #d4af37, #7C3AED, #ffffff)', spinDuration: '2s' } },
  { id: 'banner_owner', type: 'banner', bundleId: null, name: 'Bandeira do Dono', rarity: 'mythic', price: null, ownerOnly: true,
    preview: { background: 'linear-gradient(120deg, #000000, #d4af37, #7C3AED, #000000)', shimmer: true } },

  // ---------- Efeitos de perfil (partículas animadas ao abrir o perfil) ----------
  { id: 'effect_sparkles', type: 'profileEffect', bundleId: null, name: 'Faíscas Douradas', rarity: 'epic', price: 450,
    preview: { emoji: '✨', color: '#d4af37' } },
  { id: 'effect_embers', type: 'profileEffect', bundleId: null, name: 'Cinzas de Ragnarok', rarity: 'legendary', price: 700,
    preview: { emoji: '🔥', color: '#f97316' } },
  { id: 'effect_snow', type: 'profileEffect', bundleId: null, name: 'Neve de Valhalla', rarity: 'rare', price: 300,
    preview: { emoji: '❄️', color: '#93c5fd' } },
  { id: 'effect_petals', type: 'profileEffect', bundleId: null, name: 'Pétalas Nórdicas', rarity: 'rare', price: 300,
    preview: { emoji: '🌸', color: '#f472b6' } },
  { id: 'effect_stars', type: 'profileEffect', bundleId: null, name: 'Poeira de Estrelas', rarity: 'legendary', price: 700,
    preview: { emoji: '🌟', color: '#60a5fa' } },
];

function buildDefaultCatalog() {
  return {
    categories: CATEGORIES,
    rarities: RARITIES,
    bundles: BUNDLES.map((b) => ({
      ...b,
      itemIds: ITEMS.filter((i) => i.bundleId === b.id).map((i) => i.id),
    })),
    items: ITEMS,
  };
}

module.exports = { CATEGORIES, RARITIES, buildDefaultCatalog };
