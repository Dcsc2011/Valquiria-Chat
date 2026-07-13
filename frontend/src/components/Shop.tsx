import React, { useMemo, useState } from 'react';
import { X, Search, Coins, Ticket, Star, Lock, Package } from 'lucide-react';
import { client } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useCatalog } from '../context/CatalogContext';
import { CosmeticSwatch, RarityTag } from './CosmeticPreview';
import type { CosmeticCategory, CosmeticItem } from '../types';

interface ShopProps {
  onClose: () => void;
}

const CATEGORY_LABELS: Record<CosmeticCategory | 'all' | 'bundles', string> = {
  all: 'Tudo',
  bundles: 'Bundles',
  banner: 'Bandeiras',
  frame: 'Molduras',
  aura: 'Auréolas',
  badge: 'Insígnias',
  background: 'Fundos',
  emoji: 'Emojis',
  cursor: 'Cursores',
  profileEffect: 'Efeitos de Perfil',
};

export default function Shop({ onClose }: ShopProps) {
  const { user, setUser } = useAuth();
  const { catalog, reload } = useCatalog();
  const [activeCategory, setActiveCategory] = useState<CosmeticCategory | 'all' | 'bundles'>('all');
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [redeemOpen, setRedeemOpen] = useState(false);
  const [redeemCode, setRedeemCode] = useState('');
  const [redeemMsg, setRedeemMsg] = useState('');

  if (!user || !catalog) return null;

  const categories: (CosmeticCategory | 'all' | 'bundles')[] = ['all', 'bundles', ...catalog.categories];

  const filteredItems = useMemo(() => {
    let items = catalog.items;
    if (activeCategory !== 'all' && activeCategory !== 'bundles') {
      items = items.filter((i) => i.type === activeCategory);
    }
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      items = items.filter((i) => i.name.toLowerCase().includes(q));
    }
    return items;
  }, [catalog, activeCategory, query]);

  const isOwned = (itemId: string) => user.inventory.includes(itemId);
  const isFavorite = (itemId: string) => user.favorites.includes(itemId);

  const toggleFavorite = async (itemId: string) => {
    if (isFavorite(itemId)) {
      const res = await client.delete(`/shop/favorites/${itemId}`);
      setUser({ ...user, favorites: res.data.favorites });
    } else {
      const res = await client.post(`/shop/favorites/${itemId}`);
      setUser({ ...user, favorites: res.data.favorites });
    }
  };

  const purchase = async (item: CosmeticItem) => {
    setError('');
    try {
      const res = await client.post(`/shop/purchase/${item.id}`);
      setUser(res.data.user);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Erro ao comprar item.');
    }
  };

  const equip = async (item: CosmeticItem) => {
    setError('');
    try {
      const alreadyEquipped = user.equipped[item.type] === item.id;
      const res = await client.post('/shop/equip', {
        category: item.type,
        itemId: alreadyEquipped ? null : item.id,
      });
      setUser(res.data.user);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Erro ao equipar item.');
    }
  };

  const purchaseBundle = async (bundleId: string) => {
    setError('');
    try {
      const res = await client.post(`/shop/purchase-bundle/${bundleId}`);
      setUser(res.data.user);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Erro ao comprar bundle.');
    }
  };

  const redeem = async () => {
    setRedeemMsg('');
    try {
      const res = await client.post('/shop/redeem', { code: redeemCode });
      setUser(res.data.user);
      setRedeemMsg(`Resgataste ${res.data.grantedItemIds.length} item(ns) com sucesso!`);
      setRedeemCode('');
      reload();
    } catch (err: any) {
      setRedeemMsg(err?.response?.data?.error || 'Erro ao resgatar código.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="flex h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-panelLight shadow-2xl animate-fade-in">
        <div className="flex items-center justify-between border-b border-panelHeader/60 px-5 py-3">
          <h2 className="text-lg font-semibold text-textPrimary">Loja Valquíria Premium</h2>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 rounded-full bg-panel px-3 py-1 text-sm text-accent">
              <Coins className="h-4 w-4" /> {user.currency}
            </span>
            <button
              onClick={() => setRedeemOpen((v) => !v)}
              className="flex items-center gap-1 rounded-full bg-panel px-3 py-1 text-sm text-textPrimary hover:bg-panelHeader"
            >
              <Ticket className="h-4 w-4" /> Resgatar código
            </button>
            <button onClick={onClose} className="rounded-full p-1.5 hover:bg-panelHeader">
              <X className="h-5 w-5 text-textMuted" />
            </button>
          </div>
        </div>

        {redeemOpen && (
          <div className="flex items-center gap-2 border-b border-panelHeader/60 bg-panel px-5 py-3">
            <input
              className="flex-1 rounded-lg bg-panelHeader px-3 py-2 text-sm text-textPrimary outline-none placeholder:text-textMuted"
              placeholder="Introduz o teu código (ex: VALHALLA2026)"
              value={redeemCode}
              onChange={(e) => setRedeemCode(e.target.value)}
            />
            <button onClick={redeem} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-panel hover:bg-accentDark">
              Resgatar
            </button>
            {redeemMsg && <p className="text-xs text-textMuted">{redeemMsg}</p>}
          </div>
        )}

        <div className="flex items-center gap-2 overflow-x-auto border-b border-panelHeader/60 px-5 py-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium ${
                activeCategory === cat ? 'bg-accent text-panel' : 'bg-panel text-textMuted hover:bg-panelHeader'
              }`}
            >
              {CATEGORY_LABELS[cat]}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-2 rounded-lg bg-panel px-3 py-1.5">
            <Search className="h-3.5 w-3.5 text-textMuted" />
            <input
              className="w-32 bg-transparent text-xs text-textPrimary outline-none placeholder:text-textMuted"
              placeholder="Pesquisar"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>

        {error && <p className="border-b border-panelHeader/60 bg-red-500/10 px-5 py-2 text-xs text-red-400">{error}</p>}

        <div className="flex-1 overflow-y-auto p-5">
          {activeCategory === 'bundles' ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {catalog.bundles.map((bundle) => {
                const items = bundle.itemIds.map((id) => catalog.items.find((i) => i.id === id)).filter(Boolean) as CosmeticItem[];
                const purchasable = items.filter((i) => !i.codeOnly && !i.ownerOnly && i.price !== null);
                const totalPrice = purchasable.reduce((sum, i) => sum + (i.price || 0), 0);
                const allOwned = purchasable.length > 0 && purchasable.every((i) => isOwned(i.id));

                return (
                  <div key={bundle.id} className="rounded-xl bg-panel p-4">
                    <div className="mb-2 flex items-center gap-2">
                      <Package className="h-4 w-4 text-accent" />
                      <p className="font-medium text-textPrimary">{bundle.name}</p>
                    </div>
                    <p className="mb-3 text-xs text-textMuted">{bundle.theme}</p>
                    <div className="mb-3 flex gap-2">
                      {items.slice(0, 3).map((item) => (
                        <CosmeticSwatch key={item.id} item={item} size={44} />
                      ))}
                    </div>
                    <button
                      onClick={() => purchaseBundle(bundle.id)}
                      disabled={allOwned || purchasable.length === 0}
                      className="w-full rounded-lg bg-accent py-2 text-xs font-medium text-panel hover:bg-accentDark disabled:opacity-50"
                    >
                      {allOwned ? 'Já possuis tudo' : `Comprar tudo por ${totalPrice} 🪙`}
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {filteredItems.map((item) => {
                const owned = isOwned(item.id);
                const equipped = user.equipped[item.type] === item.id;
                const locked = (item.ownerOnly && !user.isOwner) || item.codeOnly;

                return (
                  <div key={item.id} className="flex flex-col gap-2 rounded-xl bg-panel p-3">
                    <div className="flex items-center justify-between">
                      <RarityTag rarity={item.rarity} />
                      <button onClick={() => toggleFavorite(item.id)}>
                        <Star
                          className={`h-4 w-4 ${isFavorite(item.id) ? 'fill-yellow-400 text-yellow-400' : 'text-textMuted'}`}
                        />
                      </button>
                    </div>
                    <div className="flex justify-center py-2">
                      <CosmeticSwatch item={item} size={64} />
                    </div>
                    <p className="truncate text-center text-sm font-medium text-textPrimary">{item.name}</p>

                    {owned ? (
                      <button
                        onClick={() => equip(item)}
                        className={`rounded-lg py-1.5 text-xs font-medium ${
                          equipped ? 'bg-accent text-panel' : 'bg-panelHeader text-textPrimary hover:bg-panel'
                        }`}
                      >
                        {equipped ? 'Equipado ✓' : 'Equipar'}
                      </button>
                    ) : locked ? (
                      <div className="flex items-center justify-center gap-1 rounded-lg bg-panelHeader py-1.5 text-xs text-textMuted">
                        <Lock className="h-3.5 w-3.5" />
                        {item.ownerOnly ? 'Exclusivo do fundador' : 'Só por código'}
                      </div>
                    ) : (
                      <button
                        onClick={() => purchase(item)}
                        className="rounded-lg bg-accent py-1.5 text-xs font-medium text-panel hover:bg-accentDark"
                      >
                        {item.price} 🪙
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
