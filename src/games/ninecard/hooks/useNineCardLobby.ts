// src/games/ninecard/hooks/useNineCardLobby.ts

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { NineCardTable, CreateTableForm } from '../types';
import { subscribeNineCardLobby, createNineCardTable } from '../service';

export function useNineCardLobby() {
  const { firebaseUser, user } = useAuth();
  const [tables, setTables] = useState<NineCardTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = subscribeNineCardLobby((t) => {
      setTables(t);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const createTable = useCallback(
    async (form: CreateTableForm): Promise<string> => {
      if (!firebaseUser) throw new Error('Not authenticated');
      setCreating(true);
      setError(null);
      try {
        const id = await createNineCardTable(
          firebaseUser.uid,
          form.name,
          user?.name ?? firebaseUser.displayName ?? 'Player',
          form.bootAmount,
          user?.photoURL ?? firebaseUser.photoURL ?? undefined
        );
        return id;
      } catch (e: any) {
        setError(e?.message ?? 'Failed to create table');
        throw e;
      } finally {
        setCreating(false);
      }
    },
    [firebaseUser, user]
  );

  return { tables, loading, creating, error, createTable };
}
