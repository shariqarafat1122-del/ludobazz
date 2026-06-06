import { create } from 'zustand';
import { Notification } from '../types';

interface User {
  uid: string;
  name: string;
  email?: string;
}

interface AppState {
  user: User | null;
  walletBalance: number;
  notifications: Notification[];
  unreadCount: number;
  sidebarOpen: boolean;
  isProcessing: boolean;
  setUser: (user: User | null) => void;
  setWalletBalance: (balance: number) => void;
  setNotifications: (n: Notification[]) => void;
  setSidebarOpen: (open: boolean) => void;
  setIsProcessing: (p: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  walletBalance: 0,
  notifications: [],
  unreadCount: 0,
  sidebarOpen: false,
  isProcessing: false,
  setUser: (user) => set({ user }),
  setWalletBalance: (walletBalance) => set({ walletBalance }),
  setNotifications: (notifications) =>
    set({ notifications, unreadCount: notifications.filter(n => !n.read).length }),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  setIsProcessing: (isProcessing) => set({ isProcessing }),
}));

// ✅ useStore alias - same as useAppStore
export const useStore = useAppStore;

interface GameState {
  colorRoundId: string | null;
  colorTimeLeft: number;
  diceRolling: boolean;
  matchmakingQueueId: string | null;
  gameRoomId: string | null;
  setColorRoundId: (id: string | null) => void;
  setColorTimeLeft: (t: number) => void;
  setDiceRolling: (r: boolean) => void;
  setMatchmakingQueueId: (id: string | null) => void;
  setGameRoomId: (id: string | null) => void;
}

export const useGameStore = create<GameState>((set) => ({
  colorRoundId: null,
  colorTimeLeft: 60,
  diceRolling: false,
  matchmakingQueueId: null,
  gameRoomId: null,
  setColorRoundId: (colorRoundId) => set({ colorRoundId }),
  setColorTimeLeft: (colorTimeLeft) => set({ colorTimeLeft }),
  setDiceRolling: (diceRolling) => set({ diceRolling }),
  setMatchmakingQueueId: (matchmakingQueueId) => set({ matchmakingQueueId }),
  setGameRoomId: (gameRoomId) => set({ gameRoomId }),
}));
