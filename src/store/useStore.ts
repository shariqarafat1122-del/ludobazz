import { create } from 'zustand';
import { Notification } from '../types';

// ✅ Add User interface
interface User {
  uid: string;
  name: string;
  email?: string;
}

interface AppState {
  notifications: Notification[];
  unreadCount: number;
  sidebarOpen: boolean;
  isProcessing: boolean;
  // ✅ Add user & wallet
  user: User | null;
  walletBalance: number;
  setNotifications: (n: Notification[]) => void;
  setSidebarOpen: (open: boolean) => void;
  setIsProcessing: (p: boolean) => void;
  // ✅ Add setters
  setUser: (user: User | null) => void;
  setWalletBalance: (balance: number) => void;
}

export const useAppStore = create<AppState>((set) => ({
  notifications: [],
  unreadCount: 0,
  sidebarOpen: false,
  isProcessing: false,
  user: null,           // ✅ Added
  walletBalance: 0,     // ✅ Added
  setNotifications: (notifications) =>
    set({ notifications, unreadCount: notifications.filter(n => !n.read).length }),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  setIsProcessing: (isProcessing) => set({ isProcessing }),
  setUser: (user) => set({ user }),                          // ✅ Added
  setWalletBalance: (walletBalance) => set({ walletBalance }), // ✅ Added
}));

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

// ✅ Also export useStore as alias for useAppStore for backward compatibility
export const useStore = useAppStore;
