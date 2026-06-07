// src/pages/games/NineCardGamePage.tsx

import React from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { NineCardTable } from '../../games/ninecard';

/**
 * Full-screen game page — NO MainLayout wrapper.
 * Guards: must be logged in + tableId must exist.
 */
const NineCardGamePage: React.FC = () => {
  const { tableId } = useParams<{ tableId: string }>();
  const { firebaseUser, loading } = useAuth();

  // Wait for auth to resolve
  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          background: '#030712',
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            border: '3px solid rgba(255,255,255,0.1)',
            borderTop: '3px solid #eab308',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!firebaseUser) return <Navigate to="/login" replace />;
  if (!tableId)      return <Navigate to="/games/nine-card" replace />;

  return <NineCardTable tableId={tableId} />;
};

export default NineCardGamePage;
