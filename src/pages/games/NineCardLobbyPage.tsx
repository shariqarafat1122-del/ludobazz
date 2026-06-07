// src/pages/games/NineCardLobbyPage.tsx

import React from 'react';
import { NineCardLobby } from '../../games/ninecard';

/**
 * Thin wrapper — lives inside MainLayout.
 * NineCardLobby handles all its own state.
 */
const NineCardLobbyPage: React.FC = () => {
  return <NineCardLobby />;
};

export default NineCardLobbyPage;
