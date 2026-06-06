import React, {
  useEffect, useState, useCallback, useMemo,
  useRef, memo,
} from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../../context/AuthContext';
import {
  LudoGame, LudoToken, LudoPlayerState, PlayerSlot,
  subscribeLudoGame, rollDice, moveTokenOnBoard,
  skipTurn, updatePlayerOnline, forfeitGame,
  getMovableTokens, getAbsolutePosition,
  TOKEN_BASE_POSITION, TOKEN_HOME_POSITION, SAFE_POSITIONS,
} from '../../../firebase/RealLudo';
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

interface TokenInfo {
  token: LudoToken;
  color: LudoColor;
  uid: string;
}

// Small offset for stacked tokens in same cell
const STACK_OFFSETS = [
  { dx: 0,    dy: 0    },
  { dx: 1.5,  dy: -1.5 },
  { dx: -1.5, dy: 1.5  },
  { dx: 1.5,  dy: 1.5  },
];

const TokenOverlay: React.FC<TokenOverlayProps> = memo(({
  game, myColor, movableIds, boardRef, onTokenClick,
}) => {
  const [boardSize, setBoardSize] = useState(0);

  // Track board size for responsive token sizing
  useEffect(() => {
    if (!boardRef.current) return;
    const obs = new ResizeObserver(entries => {
      setBoardSize(entries[0].contentRect.width);
    });
    obs.observe(boardRef.current);
    setBoardSize(boardRef.current.offsetWidth);
    return () => obs.disconnect();
  }, [boardRef]);

  // Token size = ~68% of one cell
  const tokenSize = useMemo(() => {
    if (!boardSize) return 24;
    return Math.max(16, Math.floor((boardSize / 15) * 0.7));
  }, [boardSize]);

  // Build list of all visible tokens with their SVG coords
  const tokenList = useMemo(() => {
    const result: Array<{
      key: string;
      info: TokenInfo;
      coord: { x: number; y: number };
      baseSlotIdx: number;
    }> = [];

    const processPlayer = (ps: LudoPlayerState | null) => {
      if (!ps) return;
      let baseIdx = 0;
      ps.tokens.forEach(token => {
        if (token.isHome) return; // don't render finished tokens
        const slotIdx = token.position === TOKEN_BASE_POSITION ? baseIdx++ : 0;
        const coord = getTokenCoord(token.position, ps.color as LudoColor, slotIdx);
        if (!coord) return;
        result.push({
          key:         `${ps.color}-${token.id}`,
          info:        { token, color: ps.color as LudoColor, uid: ps.uid },
          coord,
          baseSlotIdx: slotIdx,
        });
      });
    };

    processPlayer(game.player1);
    processPlayer(game.player2);
    return result;
  }, [game.player1, game.player2]);

  // Group tokens that share the same cell (within 0.5% tolerance)
  const groups = useMemo(() => {
    const map = new Map<string, typeof tokenList>();
    tokenList.forEach(t => {
      // Round to nearest cell center to group properly
      const gx = Math.round(t.coord.x / CELL) * CELL;
      const gy = Math.round(t.coord.y / CELL) * CELL;
      const key = `${gx.toFixed(2)}-${gy.toFixed(2)}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    });
    return map;
  }, [tokenList]);

  return (
    <div
      style={{
        position:      'absolute',
        inset:         0,
        pointerEvents: 'none',
      }}
    >
      {tokenList.map(({ key, info, coord }) => {
        // Find group for this token to apply stack offset
        const gx = Math.round(coord.x / CELL) * CELL;
        const gy = Math.round(coord.y / CELL) * CELL;
        const groupKey = `${gx.toFixed(2)}-${gy.toFixed(2)}`;
        const group    = groups.get(groupKey) || [];
        const posInGrp = group.findIndex(g => g.key === key);
        const offset   = STACK_OFFSETS[posInGrp] ?? STACK_OFFSETS[0];

        // Actual position with small offset for stacked tokens
        const finalX = coord.x + (group.length > 1 ? offset.dx * 0.3 : 0);
        const finalY = coord.y + (group.length > 1 ? offset.dy * 0.3 : 0);

        const isMovable = myColor === info.color &&
                          movableIds.includes(info.token.id);

        return (
          <motion.div
            key={key}
            // Animate position changes smoothly
            animate={{
              left: `${finalX}%`,
              top:  `${finalY}%`,
            }}
            initial={false}
            transition={{
              type:      'spring',
              stiffness: 320,
              damping:   28,
              mass:      0.8,
            }}
            layout={false}
            style={{
              position:       'absolute',
              transform:      'translate(-50%, -50%)',
              pointerEvents:  'auto',
              zIndex:         isMovable ? 20 : 10,
              willChange:     'left, top',
            }}
          >
            <TokenPiece
              color={info.color}
              isMovable={isMovable}
              size={tokenSize}
              onClick={isMovable ? () => onTokenClick(info.color, info.token.id) : undefined}
            />
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
          animate={{ rotate: 180 }}
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
