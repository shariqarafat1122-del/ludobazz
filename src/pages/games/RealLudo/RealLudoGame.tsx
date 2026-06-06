import React, {
  useEffect, useState, useCallback, useMemo,
  useRef, memo,
} from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import {
  LudoGame, LudoToken, LudoPlayerState, PlayerSlot,
  subscribeLudoGame, rollDice, moveTokenOnBoard,
  skipTurn, updatePlayerOnline, forfeitGame,
  getMovableTokens, getAbsolutePosition,
  TOKEN_BASE_POSITION, TOKEN_HOME_POSITION, SAFE_POSITIONS,
} from '../../firebase/RealLudo';
import {
  GRID, CELL, TRACK, HOME_PATH, YARD_SLOTS, SAFE_CELLS,
  COLOR_THEME, LudoColor, toPercent, getTokenCoord, getAbsIdx,
} from './constants/boardLayout';
import LudoBoardSVG from './components/LudoBoardSVG';
import TokenPiece    from './components/TokenPiece';
import TopHeader     from './components/TopHeader';
import PlayerPanel   from './components/PlayerPanel';
import BottomActionBar from './components/BottomActionBar';
import WinModal      from './components/WinModal';
import LeaveModal    from './components/LeaveModal';
import ParticleBackground from './components/ParticleBackground';

// ─── Token overlay on board ───────────────────────────────────────────────────
interface TokenOverlayProps {
  game: LudoGame;
  myColor: LudoColor | null;
  movableIds: number[];
  boardRef: React.RefObject<HTMLDivElement>;
  onTokenClick: (color: LudoColor, tokenId: number) => void;
}

const TokenOverlay: React.FC<TokenOverlayProps> = memo(({
  game, myColor, movableIds, boardRef, onTokenClick,
}) => {
  // Group all tokens by cell (key = "x%-y%")
  type TokenInfo = {
    token: LudoToken;
    color: LudoColor;
    uid: string;
  };

  const groups = useMemo(() => {
    const map = new Map<string, TokenInfo[]>();

    const addToken = (
      token: LudoToken,
      color: LudoColor,
      uid: string,
      slotIdx: number
    ) => {
      if (token.isHome) return; // finished tokens → center (skip)
      const coord = getTokenCoord(token.position, color, slotIdx);
      if (!coord) return;
      const key = `${coord.x.toFixed(1)}-${coord.y.toFixed(1)}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push({ token, color, uid });
    };

    const players = [
      { ps: game.player1, slot: 'player1' },
      { ps: game.player2, slot: 'player2' },
    ];

    players.forEach(({ ps }) => {
      if (!ps) return;
      // Track tokens at yard: assign slot indices to base tokens
      const baseTokens = ps.tokens.filter(t => t.position === TOKEN_BASE_POSITION);
      let baseIdx = 0;
      ps.tokens.forEach(token => {
        const si = token.position === TOKEN_BASE_POSITION ? baseIdx++ : 0;
        addToken(token, ps.color as LudoColor, ps.uid, si);
      });
    });

    return map;
  }, [game.player1, game.player2]);

  const tokenSize = useMemo(() => {
    // Responsive: roughly 70% of one cell
    if (!boardRef.current) return 26;
    const boardPx = boardRef.current.offsetWidth;
    return Math.max(18, Math.floor((boardPx / GRID) * 0.72));
  }, [boardRef.current?.offsetWidth]);

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
      }}
    >
      {Array.from(groups.entries()).map(([key, tokens]) => {
        const [xStr, yStr] = key.split('-');
        const x = parseFloat(xStr);
        const y = parseFloat(yStr);
        const count = tokens.length;

        return (
          <motion.div
            key={key}
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            layout
            transition={{ type: 'spring', stiffness: 380, damping: 22 }}
            style={{
              position: 'absolute',
              left: `${x}%`,
              top: `${y}%`,
              transform: 'translate(-50%, -50%)',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'center',
              gap: count > 2 ? 1 : 0,
              width: tokenSize + 8,
              height: tokenSize + 8,
              pointerEvents: 'auto',
              zIndex: 10,
            }}
          >
            {count === 1 ? (
              (() => {
                const { token, color } = tokens[0];
                const isM = myColor === color && movableIds.includes(token.id);
                return (
                  <TokenPiece
                    color={color}
                    isMovable={isM}
                    size={tokenSize}
                    onClick={isM ? () => onTokenClick(color, token.id) : undefined}
                  />
                );
              })()
            ) : count === 2 ? (
              tokens.map(({ token, color }) => {
                const isM = myColor === color && movableIds.includes(token.id);
                return (
                  <TokenPiece
                    key={`${color}-${token.id}`}
                    color={color}
                    isMovable={isM}
                    size={Math.floor(tokenSize * 0.62)}
                    onClick={isM ? () => onTokenClick(color, token.id) : undefined}
                  />
                );
              })
            ) : (
              // 3+ → group by color with count badge
              (() => {
                const byColor: Record<string, TokenInfo[]> = {};
                tokens.forEach(t => {
                  if (!byColor[t.color]) byColor[t.color] = [];
                  byColor[t.color].push(t);
                });
                return Object.entries(byColor).map(([col, arr]) => {
                  const mv = arr.find(a => movableIds.includes(a.token.id));
                  const isM = myColor === col && !!mv;
                  return (
                    <TokenPiece
                      key={col}
                      color={col as LudoColor}
                      isMovable={isM}
                      size={Math.floor(tokenSize * 0.58)}
                      count={arr.length}
                      onClick={
                        isM && mv
                          ? () => onTokenClick(col as LudoColor, mv.token.id)
                          : undefined
                      }
                    />
                  );
                });
              })()
            )}
          </motion.div>
        );
      })}
    </div>
  );
});

TokenOverlay.displayName = 'TokenOverlay';

// ─── Main Game Screen ─────────────────────────────────────────────────────────
const RealLudoGame: React.FC = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate   = useNavigate();
  const { user, wallet } = useAuth();

  const [game, setGame]           = useState<LudoGame | null>(null);
  const [loading, setLoading]     = useState(true);
  const [rolling, setRolling]     = useState(false);
  const [movingTok, setMovingTok] = useState(false);
  const [errMsg, setErrMsg]       = useState<string | null>(null);
  const [toastMsg, setToastMsg]   = useState<string | null>(null);
  const [showLeave, setShowLeave] = useState(false);
  const [showWin, setShowWin]     = useState(false);
  const [winShown, setWinShown]   = useState(false);
  const [soundOn, setSoundOn]     = useState(true);
  const boardRef = useRef<HTMLDivElement>(null);

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2500);
  }, []);

  // ── Derived ───────────────────────────────────────────────────────────────
  const mySlot: PlayerSlot | null = useMemo(() => {
    if (!game || !user) return null;
    if (game.player1?.uid === user.uid) return 'player1';
    if (game.player2?.uid === user.uid) return 'player2';
    return null;
  }, [game, user]);

  const myColor = useMemo(
    () => (mySlot ? (game?.[mySlot]?.color as LudoColor ?? null) : null),
    [mySlot, game]
  );

  const isMyTurn      = game?.activePlayer === mySlot;
  const myState       = mySlot && game ? game[mySlot] : null;
  const oppSlot       = mySlot === 'player1' ? 'player2' : 'player1';
  const oppState      = game ? game[oppSlot] : null;

  const movableIds: number[] = useMemo(() => {
    if (!isMyTurn || !game?.diceRolled || !game.diceValue || !myState)
      return [];
    return getMovableTokens(myState.tokens, game.diceValue);
  }, [isMyTurn, game?.diceRolled, game?.diceValue, myState]);

  const prize = Math.floor((game?.pot || 0) * 0.9);

  // ── Subscribe ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!gameId) return;
    return subscribeLudoGame(gameId, g => {
      setGame(g);
      setLoading(false);
    });
  }, [gameId]);

  // ── Win modal trigger ─────────────────────────────────────────────────────
  useEffect(() => {
    if (game?.status === 'finished' && !winShown) {
      setWinShown(true);
      setTimeout(() => setShowWin(true), 700);
    }
  }, [game?.status, winShown]);

  // ── Online status ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!gameId || !mySlot) return;
    updatePlayerOnline(gameId, mySlot, true);
    const onVis = () => updatePlayerOnline(gameId!, mySlot!, !document.hidden);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      updatePlayerOnline(gameId!, mySlot!, false);
    };
  }, [gameId, mySlot]);

  // ── Auto skip ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (
      !game || !gameId || !isMyTurn || !game.diceRolled ||
      movingTok || movableIds.length > 0 || game.diceValue === null
    ) return;
    const t = setTimeout(() => {
      skipTurn(gameId, game.activePlayer!).catch(() => {});
    }, 1800);
    return () => clearTimeout(t);
  }, [game?.diceRolled, movableIds.length, isMyTurn, gameId, movingTok]);

  // ── Roll ──────────────────────────────────────────────────────────────────
  const handleRoll = useCallback(async () => {
    if (!gameId || !mySlot || !user || rolling || !isMyTurn ||
        game?.diceRolled || game?.status !== 'playing') return;
    setRolling(true);
    setErrMsg(null);
    try {
      await rollDice(gameId, mySlot, user.uid);
    } catch (e: any) {
      setErrMsg(e.message);
    } finally {
      setTimeout(() => setRolling(false), 700);
    }
  }, [gameId, mySlot, user, rolling, isMyTurn, game?.diceRolled, game?.status]);

  // ── Move token ────────────────────────────────────────────────────────────
  const handleTokenClick = useCallback(async (color: LudoColor, tokenId: number) => {
    if (!gameId || !mySlot || !user || !isMyTurn ||
        !game?.diceRolled || movingTok ||
        color !== myColor || !movableIds.includes(tokenId)) return;

    setMovingTok(true);
    setErrMsg(null);
    try {
      const { captured, won } = await moveTokenOnBoard(
        gameId, mySlot, user.uid, tokenId
      );
      if (captured) showToast('💥 Captured! +Extra turn');
      if (won)      showToast('🏆 All home!');
    } catch (e: any) {
      setErrMsg(e.message);
    } finally {
      setMovingTok(false);
    }
  }, [
    gameId, mySlot, user, isMyTurn, game?.diceRolled,
    movingTok, myColor, movableIds, showToast,
  ]);

  // ── Leave ─────────────────────────────────────────────────────────────────
  const handleLeaveConfirm = useCallback(async () => {
    if (!gameId || !user) return;
    setShowLeave(false);
    await forfeitGame(gameId, user.uid).catch(console.error);
    navigate('/games/RealLudoLobby');
  }, [gameId, user, navigate]);

  // ─────────────────────────────────────────────────────────────────────────
  // LOADING
  // ─────────────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="fixed inset-0 flex items-center justify-center"
      style={{ background: 'linear-gradient(135deg, #070714, #0f172a)' }}>
      <div className="text-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.1, repeat: Infinity, ease: 'linear' }}
          className="text-5xl mb-3"
        >🎲</motion.div>
        <p className="text-slate-500 text-sm">Loading game...</p>
      </div>
    </div>
  );

  if (!game) return (
    <div className="fixed inset-0 flex items-center justify-center"
      style={{ background: 'linear-gradient(135deg, #070714, #0f172a)' }}>
      <div className="text-center">
        <div className="text-5xl mb-3">❌</div>
        <p className="text-white font-bold mb-4">Game not found</p>
        <button
          onClick={() => navigate('/games/RealLudoLobby')}
          className="px-6 py-3 rounded-2xl font-bold text-white"
          style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}
        >
          Back to Lobby
        </button>
      </div>
    </div>
  );

  const canRoll = isMyTurn && !game.diceRolled &&
                  game.status === 'playing' && !rolling;

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 flex flex-col overflow-hidden select-none"
      style={{
        background: 'linear-gradient(160deg, #060612 0%, #0a0a1e 40%, #06101a 100%)',
      }}
    >
      {/* Ambient particles */}
      <ParticleBackground />

      {/* Wooden table texture overlay */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse at 50% 50%, rgba(139,90,43,0.04) 0%, transparent 70%)
          `,
          zIndex: 0,
        }}
      />

      {/* Vignette */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.7) 100%)',
          zIndex: 1,
        }}
      />

      {/* Content */}
      <div
        className="relative flex flex-col w-full h-full"
        style={{ zIndex: 2, maxWidth: 520, margin: '0 auto' }}
      >
        {/* ── TOP HEADER ── */}
        <TopHeader
          gameId={gameId || ''}
          wallet={wallet}
          playerName={myState?.name || user?.name || 'You'}
          isOnline={myState?.isOnline ?? true}
          soundOn={soundOn}
          onSoundToggle={() => setSoundOn(p => !p)}
          prize={prize}
        />

        {/* ── PLAYER PANELS ── */}
        <div className="flex gap-2 px-3 py-2 flex-shrink-0">
          <PlayerPanel
            player={myState as LudoPlayerState | null}
            isMe
            isActive={isMyTurn}
            diceValue={isMyTurn ? game.diceValue : null}
            slot="left"
          />
          <div
            className="flex items-center justify-center px-1 flex-shrink-0"
            style={{
              color: 'rgba(255,255,255,0.15)',
              fontSize: 10,
              fontWeight: 900,
              letterSpacing: '0.05em',
            }}
          >
            VS
          </div>
          <PlayerPanel
            player={oppState as LudoPlayerState | null}
            isMe={false}
            isActive={!isMyTurn && game.status === 'playing'}
            diceValue={!isMyTurn ? game.diceValue : null}
            slot="right"
          />
        </div>

        {/* ── TOAST / ERROR ── */}
        <div className="px-3 flex-shrink-0" style={{ minHeight: 22 }}>
          <AnimatePresence mode="wait">
            {toastMsg ? (
              <motion.p
                key="toast"
                initial={{ opacity: 0, y: -4, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="text-center text-xs font-bold text-amber-400"
              >
                {toastMsg}
              </motion.p>
            ) : errMsg ? (
              <motion.p
                key="err"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center text-xs text-red-400"
              >
                {errMsg}
              </motion.p>
            ) : null}
          </AnimatePresence>
        </div>

        {/* ── BOARD ── */}
        <div
          className="flex-1 flex items-center justify-center px-3 py-1 min-h-0"
        >
          <div
            ref={boardRef}
            className="relative w-full"
            style={{
              aspectRatio: '1 / 1',
              maxHeight: '100%',
              maxWidth: '100%',
              borderRadius: 16,
              overflow: 'hidden',
              boxShadow: `
                0 0 0 2px rgba(255,255,255,0.08),
                0 20px 60px rgba(0,0,0,0.8),
                0 0 80px rgba(124,58,237,0.06)
              `,
            }}
          >
            {/* SVG Board */}
            <LudoBoardSVG />

            {/* Token Overlay */}
            <TokenOverlay
              game={game}
              myColor={myColor}
              movableIds={movableIds}
              boardRef={boardRef}
              onTokenClick={handleTokenClick}
            />
          </div>
        </div>

        {/* ── BOTTOM ACTION BAR ── */}
        <BottomActionBar
          diceValue={game.diceValue}
          isRolling={rolling}
          canRoll={canRoll}
          myColor={myColor || 'red'}
          consecutiveSixes={game.consecutiveSixes}
          status={game.status}
          isMyTurn={isMyTurn}
          movableCount={movableIds.length}
          onRoll={handleRoll}
          onLeave={() => setShowLeave(true)}
          onEmoji={() => showToast('😄 Emojis coming soon!')}
          onChat={() => showToast('💬 Chat coming soon!')}
        />
      </div>

      {/* ── MODALS ── */}
      <WinModal
        show={showWin && game.status === 'finished'}
        won={game.winnerId === user?.uid}
        winnerName={game.winnerName || 'Opponent'}
        prize={prize}
        entryFee={game.entryFee}
      />

      <LeaveModal
        show={showLeave}
        pot={game.pot}
        onConfirm={handleLeaveConfirm}
        onCancel={() => setShowLeave(false)}
      />
    </div>
  );
};

export default RealLudoGame;
