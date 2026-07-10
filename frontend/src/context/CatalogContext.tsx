import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { client } from '../api/client';
import { useAuth } from './AuthContext';
import type { Catalog, CosmeticItem, User } from '../types';

interface CatalogContextValue {
  catalog: Catalog | null;
  getItem: (itemId: string | null | undefined) => CosmeticItem | undefined;
  getEquipped: (user: User | null | undefined) => Partial<Record<string, CosmeticItem>>;
  reload: () => Promise<void>;
}

const CatalogContext = createContext<CatalogContextValue | undefined>(undefined);

export function CatalogProvider({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  const [catalog, setCatalog] = useState<Catalog | null>(null);

  const reload = useCallback(async () => {
    try {
      const res = await client.get('/shop/catalog');
      setCatalog(res.data.catalog);
    } catch {
      setCatalog(null);
    }
  }, []);

  useEffect(() => {
    if (token) reload();
    else setCatalog(null);
  }, [token, reload]);

  const getItem = useCallback(
    (itemId: string | null | undefined) => {
      if (!itemId || !catalog) return undefined;
      return catalog.items.find((i) => i.id === itemId);
    },
    [catalog]
  );

  const getEquipped = useCallback(
    (user: User | null | undefined) => {
      if (!user || !catalog) return {};
      const result: Partial<Record<string, CosmeticItem>> = {};
      for (const [category, itemId] of Object.entries(user.equipped || {})) {
        if (itemId) {
          const item = catalog.items.find((i) => i.id === itemId);
          if (item) result[category] = item;
        }
      }
      return result;
    },
    [catalog]
  );

  return (
    <CatalogContext.Provider value={{ catalog, getItem, getEquipped, reload }}>
      {children}
    </CatalogContext.Provider>
  );
}

export function useCatalog() {
  const ctx = useContext(CatalogContext);
  if (!ctx) throw new Error('useCatalog deve ser usado dentro de um CatalogProvider.');
  return ctx;
}
