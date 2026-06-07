/**
 * NineCard.tsx
 * ============================================================
 * Main Game Table UI — Casino-style 9 Card Table
 *
 * Features:
 * - Real-time Firestore sync
 * - Blind / Seen mode display
 * - Call / Pack / Show / See Cards actions
 * - Card flip animations
 * - Pot counter animation
 * - Winner reveal overlay
 * - Mobile + Desktop responsive
 * ============================================================
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase/config"; // src/firebase/config.ts
import { useAuth } from "../context/AuthContext"; // AuthContext hook
import {
  TableDoc,
  PlayerRole,
  PlayerState,
  Card,
  ShowdownResult,
  seeCards,
  playerCall,
  playerPack,
  playerShow,
  fetchMyCards,
  dealRound,
  getPlayerByUid,
  getOpponentRole,
  formatAmount,
  canShow,
  NINE_CARD_COLLECTIONS,
} from "./NineCard";

// ─────────────────────────────────────────────
// CSS KEYFRAMES (injected once)
// ─────────────────────────────────────────────

const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Courier+Prime:wght@400;700&display=swap');

  @keyframes dealCard {
    0% { opacity: 0; transform: translateY(-60px) rotateY(90deg) scale(0.8); }
    100% { opacity: 1; transform: translateY(0) rotateY(0deg) scale(1); }
  }
  @keyframes flipCard {
    0% { transform: rotateY(0deg); }
    50% { transform: rotateY(90deg); }
    100% { transform: rotateY(0deg); }
  }
  @keyframes pulseGlow {
    0%, 100% { box-shadow: 0 0 12px #c9a22744; }
    50% { box-shadow: 0 0 28px #c9a227bb, 0 0 50px #c9a22744; }
  }
  @keyframes potPop {
    0% { transform: scale(1); }
    50% { transform: scale(1.15); }
    100% { transform: scale(1); }
  }
  @keyframes winnerReveal {
    0% { opacity: 0; transform: scale(0.7) translateY(20px); }
    60% { transform: scale(1.05) translateY(-4px); }
    100% { opacity: 1; transform: scale(1) translateY(0); }
  }
  @keyframes chipFloat {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-6px); }
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  @keyframes activePulse {
    0%, 100% { border-color: #c9a22766; }
    50% { border-color: #c9a227ff; box-shadow: 0 0 20px #c9a22755; }
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes slideUp {
    from { opacity: 0; transform: translateY(16px); }
    to { opacity: 1; transform: translateY(0); }
  }

  * { box-sizing: border-box; }

  .card-deal { animation: dealCard 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
  .card-flip { animation: flipCard 0.6s ease forwards; }
  .active-turn { animation: activePulse 1.5s ease-in-out infinite; }
  .pot-pop { animation: potPop 0.4s ease; }
  .winner-reveal { animation: winnerReveal 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
  .chip-float { animation: chipFloat 2s ease-in-out infinite; }
  .fade-in { animation: fadeIn 0.4s ease forwards; }
  .slide-up { animation: slideUp 0.4s ease forwards; }

  button:hover:not(:disabled) { opacity: 0.85; }
  button:active:not(:disabled) { transform: scale(0.97); }
  button:disabled { cursor: not-allowed; opacity: 0.4; }
`;

function injectStyles() {
  if (document.getElementById("nine-card-styles")) return;
  const style = document.createElement("style");
  style.id = "nine-card-styles";
  style.textContent = GLOBAL_CSS;
  document.head.appendChild(style);
}

// ─────────────────────────────────────────────
// CARD COMPONENT
// ─────────────────────────────────────────────

const CARD_COLORS: Record<string, string> = {
  "♠": "#e8e8e8",
  "♣": "#e8e8e8",
  "♥": "#ff4444",
  "♦": "#ff4444",
};

const PlayingCard: React.FC<{
  card?: Card;
  faceDown?: boolean;
  size?: "sm" | "md" | "lg";
  animated?: boolean;
  animDelay?: number;
}> = ({ card, faceDown = false, size = "md", animated = false, animDelay = 0 }) => {
  const dims = { sm: [52, 76], md: [70, 100], lg: [90, 130] }[size];
  const [w, h] = dims;
  const fontSize = size === "lg" ? 22 : size === "md" ? 16 : 12;

  const baseStyle: React.CSSProperties = {
    width: w,
    height: h,
    borderRadius: 8,
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    padding: size === "lg" ? "8px 10px" : "5px 7px",
    userSelect: "none",
    flexShrink: 0,
    position: "relative",
    animationDelay: `${animDelay}ms`,
    transition: "transform 0.2s",
  };

  if (faceDown || !card) {
    return (
      <div
        className={animated ? "card-deal" : ""}
        style={{
          ...baseStyle,
          background: "linear-gradient(135deg, #1a2a4a 0%, #0d1a30 50%, #1a2a4a 100%)",
          border: "1px solid #2a4a6a",
          backgroundImage: `
            linear-gradient(135deg, #1a2a4a 0%, #0d1a30 50%, #1a2a4a 100%),
            repeating-linear-gradient(
              45deg, transparent, transparent 4px,
              rgba(255,255,255,0.02) 4px, rgba(255,255,255,0.02) 8px
            )
          `,
          boxShadow: "0 4px 12px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <div style={{ fontSize: size === "lg" ? 28 : 18, opacity: 0.3 }}>🂠</div>
      </div>
    );
  }

  const color = CARD_COLORS[card.suit] ?? "#e8e8e8";
  const isRed = card.suit === "♥" || card.suit === "♦";

  return (
    <div
      className={animated ? "card-deal" : ""}
      style={{
        ...baseStyle,
        background: "linear-gradient(145deg, #fefefe, #f0ece0)",
        border: "1px solid #ccc",
        boxShadow: "0 6px 18px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.9)",
        animationDelay: `${animDelay}ms`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
        <span style={{ fontSize: fontSize, fontWeight: 900, color, lineHeight: 1, fontFamily: "'Playfair Display', serif" }}>
          {card.value}
        </span>
        <span style={{ fontSize: fontSize - 2, color, lineHeight: 1 }}>{card.suit}</span>
      </div>

      {/* Center pip */}
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
        <span style={{
          fontSize: size === "lg" ? 32 : size === "md" ? 22 : 16,
          color,
          filter: isRed ? "drop-shadow(0 0 4px rgba(255,68,68,0.3))" : undefined,
        }}>
          {card.suit}
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 2, transform: "rotate(180deg)" }}>
        <span style={{ fontSize: fontSize, fontWeight: 900, color, lineHeight: 1, fontFamily: "'Playfair Display', serif" }}>
          {card.value}
        </span>
        <span style={{ fontSize: fontSize - 2, color, lineHeight: 1 }}>{card.suit}</span>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// PLAYER PANEL
// ─────────────────────────────────────────────

const PlayerPanel: React.FC<{
  player: PlayerState;
  cards: Card[];
  isMe: boolean;
  isActive: boolean;
  showCards: boolean;
  position: "top" | "bottom";
}> = ({ player, cards, isMe, isActive, showCards, position }) => {
  const isBottom = position === "bottom";

  return (
    <div
      className={isActive ? "active-turn" : ""}
      style={{
        background: "linear-gradient(145deg, #0a160a, #060e06)",
        border: `2px solid ${isActive ? "#c9a227" : "#1a2a1a"}`,
        borderRadius: 16,
        padding: "16px 20px",
        display: "flex",
        flexDirection: isBottom ? "row" : "row-reverse",
        alignItems: "center",
        gap: 16,
        position: "relative",
        transition: "border-color 0.3s",
        minWidth: 0,
      }}
    >
      {/* Avatar */}
      <div style={{
        width: 48,
        height: 48,
        borderRadius: "50%",
        background: "linear-gradient(135deg, #1a3a1a, #0a1a0a)",
        border: `2px solid ${isActive ? "#c9a227" : "#2a3a2a"}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 20,
        flexShrink: 0,
      }}>
        {isMe ? "😎" : "🤵"}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: "#f5e6c8", fontFamily: "'Playfair Display', serif" }}>
            {player.displayName}
          </span>
          {isMe && (
            <span style={{ fontSize: 10, color: "#888", letterSpacing: 1 }}>(YOU)</span>
          )}
          {isActive && (
            <span style={{
              fontSize: 9,
              background: "#c9a227",
              color: "#0a0a0a",
              padding: "1px 7px",
              borderRadius: 20,
              fontWeight: 700,
              letterSpacing: 1.5,
              fontFamily: "'Courier Prime', monospace",
            }}>
              YOUR TURN
            </span>
          )}
        </div>

        {/* Status */}
        <div style={{ display: "flex", gap: 8, marginTop: 4, alignItems: "center" }}>
          <span style={{
            fontSize: 11,
            fontWeight: 700,
            color: player.status === "blind" ? "#ff9900" : "#00ff88",
            background: player.status === "blind" ? "#ff990015" : "#00ff8815",
            border: `1px solid ${player.status === "blind" ? "#ff990033" : "#00ff8833"}`,
            padding: "1px 8px",
            borderRadius: 4,
            letterSpacing: 1.5,
            fontFamily: "'Courier Prime', monospace",
          }}>
            {player.status === "blind" ? "BLIND" : "SEEN"}
          </span>
          {player.hasFolded && (
            <span style={{
              fontSize: 11,
              color: "#ff4444",
              fontWeight: 700,
              letterSpacing: 1,
              fontFamily: "'Courier Prime', monospace",
            }}>
              PACKED
            </span>
          )}
        </div>

        {/* Bet info */}
        <div style={{ fontSize: 12, color: "#555", marginTop: 4 }}>
          Bet: <span style={{ color: "#c9a227" }}>{formatAmount(player.totalBet)}</span>
          {player.lastAction && (
            <span style={{ marginLeft: 8, color: "#444" }}>
              Last: <span style={{ color: "#888" }}>{player.lastAction.toUpperCase()}</span>
            </span>
          )}
        </div>
      </div>

      {/* Cards */}
      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
        {showCards && cards.length === 2 ? (
          cards.map((card, i) => (
            <PlayingCard
              key={card.id}
              card={card}
              size="md"
              animated
              animDelay={i * 200}
            />
          ))
        ) : (
          <>
            <PlayingCard faceDown size="md" animated animDelay={0} />
            <PlayingCard faceDown size="md" animated animDelay={200} />
          </>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// ACTION BUTTONS
// ─────────────────────────────────────────────

const ActionButtons: React.FC<{
  player: PlayerState;
  callAmount: number;
  onSeeCards: () => void;
  onCall: () => void;
  onPack: () => void;
  onShow: () => void;
  loading: string | null;
}> = ({ player, callAmount, onSeeCards, onCall, onPack, onShow, loading }) => {
  const isBlind = player.status === "blind";
  const showEnabled = canShow(player, callAmount);

  const btn = (
    label: string,
    handler: () => void,
    color: string,
    bg: string,
    disabled = false,
    key?: string
  ) => (
    <button
      key={key ?? label}
      onClick={handler}
      disabled={disabled || loading !== null}
      style={{
        flex: 1,
        padding: "12px 8px",
        background: bg,
        border: `1px solid ${color}44`,
        borderRadius: 8,
        color,
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: 1.5,
        cursor: "pointer",
        fontFamily: "'Courier Prime', monospace",
        minWidth: 80,
        transition: "all 0.2s",
        opacity: (disabled || loading !== null) ? 0.4 : 1,
      }}
    >
      {loading === label ? "..." : label}
    </button>
  );

  return (
    <div style={{
      background: "linear-gradient(145deg, #080f08, #050c05)",
      border: "1px solid #1a2a1a",
      borderRadius: 12,
      padding: "16px 20px",
    }}>
      <div style={{ fontSize: 11, color: "#444", letterSpacing: 2, marginBottom: 10, fontFamily: "'Courier Prime', monospace" }}>
        YOUR ACTIONS — CALL: {formatAmount(callAmount)}
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {isBlind &&
          btn("SEE CARDS", onSeeCards, "#4488ff", "#0a1a2a")}
        {btn("CALL " + formatAmount(callAmount), onCall, "#00ff88", "#0a2a1a")}
        {btn("PACK", onPack, "#ff4444", "#2a0a0a")}
        {btn("SHOW", onShow, "#c9a227", "#1a140a", !showEnabled)}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// WINNER OVERLAY
// ─────────────────────────────────────────────

const WinnerOverlay: React.FC<{
  table: TableDoc;
  myUid: string;
  onPlayAgain: () => void;
  onLeave: () => void;
}> = ({ table, myUid, onPlayAgain, onLeave }) => {
  const isWinner = table.winner === myUid;
  const isDraw = !table.winner && table.phase === "showdown";
  const showdown = table.showdownResult;

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.88)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 999,
      fontFamily: "'Playfair Display', serif",
    }}>
      <div
        className="winner-reveal"
        style={{
          background: "linear-gradient(145deg, #0d1a0d, #080f08)",
          border: `2px solid ${isDraw ? "#888" : isWinner ? "#c9a227" : "#ff4444"}`,
          borderRadius: 20,
          padding: "40px 48px",
          textAlign: "center",
          maxWidth: 480,
          width: "90%",
          boxShadow: `0 0 60px ${isWinner ? "#c9a22733" : "#ff444422"}`,
        }}
      >
        {/* Result icon */}
        <div style={{ fontSize: 64, marginBottom: 16 }}>
          {isDraw ? "🤝" : isWinner ? "🏆" : "💔"}
        </div>

        <h2 style={{
          margin: "0 0 8px",
          fontSize: 32,
          color: isDraw ? "#888" : isWinner ? "#c9a227" : "#ff4444",
          textShadow: `0 0 20px ${isWinner ? "#c9a22755" : isDraw ? "#88888855" : "#ff444455"}`,
          letterSpacing: 2,
        }}>
          {isDraw ? "IT'S A DRAW" : isWinner ? "YOU WIN!" : "YOU LOSE"}
        </h2>

        <p style={{ color: "#888", fontSize: 14, marginBottom: 24, letterSpacing: 0.5 }}>
          {table.winReason}
        </p>

        {/* Pot */}
        {(isWinner || isDraw) && (
          <div className="chip-float" style={{
            display: "inline-block",
            background: "#1a1400",
            border: "1px solid #c9a22744",
            borderRadius: 12,
            padding: "12px 28px",
            marginBottom: 24,
          }}>
            <div style={{ fontSize: 11, color: "#666", letterSpacing: 2 }}>
              {isDraw ? "REFUND" : "WINNINGS"}
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, color: "#c9a227" }}>
              {formatAmount(isDraw ? Math.floor(table.pot / 2) : table.pot)}
            </div>
          </div>
        )}

        {/* Showdown cards */}
        {showdown && (
          <div style={{
            display: "flex",
            gap: 24,
            justifyContent: "center",
            marginBottom: 28,
            flexWrap: "wrap",
          }}>
            {(["player1", "player2"] as const).map((role) => {
              const hand = showdown[`${role}Hand` as keyof ShowdownResult] as ReturnType<typeof import("./NineCard")["evaluateHand"]> | undefined;
              const isWinnerRole = showdown.winnerId === table[role]?.uid;
              if (!hand) return null;
              return (
                <div key={role} style={{
                  background: isWinnerRole ? "#0a1a0a" : "#0a0808",
                  border: `1px solid ${isWinnerRole ? "#c9a227" : "#333"}`,
                  borderRadius: 10,
                  padding: "12px 16px",
                  minWidth: 140,
                }}>
                  <div style={{ fontSize: 11, color: "#555", marginBottom: 8, letterSpacing: 1 }}>
                    {table[role]?.displayName ?? role.toUpperCase()}
                    {isWinnerRole && (
                      <span style={{ color: "#c9a227", marginLeft: 6 }}>★ WINNER</span>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 6, justifyContent: "center", marginBottom: 8 }}>
                    {hand.cards.map((card) => (
                      <PlayingCard key={card.id} card={card} size="sm" />
                    ))}
                  </div>
                  <div style={{ fontSize: 12, color: "#c9a227", fontWeight: 700 }}>
                    Value: {hand.value}
                  </div>
                  <div style={{ fontSize: 10, color: "#555", marginTop: 2 }}>
                    {hand.label}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Buttons */}
        <div style={{ display: "flex", gap: 12 }}>
          <button
            onClick={onPlayAgain}
            style={{
              flex: 1, padding: "12px", background: "#0a1a0a",
              border: "1px solid #00ff8844", borderRadius: 8,
              color: "#00ff88", fontSize: 13, fontWeight: 700,
              letterSpacing: 1.5, cursor: "pointer", fontFamily: "'Courier Prime', monospace",
            }}
          >
            PLAY AGAIN
          </button>
          <button
            onClick={onLeave}
            style={{
              flex: 1, padding: "12px", background: "#0a0808",
              border: "1px solid #ff444433", borderRadius: 8,
              color: "#ff4444", fontSize: 13, fontWeight: 700,
              letterSpacing: 1.5, cursor: "pointer", fontFamily: "'Courier Prime', monospace",
            }}
          >
            LEAVE TABLE
          </button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// MATCH HISTORY PANEL
// ─────────────────────────────────────────────

const MatchHistory: React.FC<{ table: TableDoc }> = ({ table }) => {
  if (table.matchHistory.length === 0) return null;

  return (
    <div style={{
      background: "#060c06",
      border: "1px solid #111",
      borderRadius: 10,
      padding: "12px 16px",
      maxHeight: 160,
      overflowY: "auto",
    }}>
      <div style={{ fontSize: 10, color: "#333", letterSpacing: 2, marginBottom: 8, fontFamily: "'Courier Prime', monospace" }}>
        MATCH HISTORY
      </div>
      {[...table.matchHistory].reverse().map((entry, i) => (
        <div key={i} style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 12,
          color: "#555",
          padding: "4px 0",
          borderBottom: "1px solid #0f0f0f",
        }}>
          <span>Rd {entry.round} — <span style={{ color: "#c9a22788" }}>{entry.winnerName}</span></span>
          <span style={{ color: "#c9a22766" }}>{formatAmount(entry.potAmount)}</span>
        </div>
      ))}
    </div>
  );
};

// ─────────────────────────────────────────────
// MAIN GAME TABLE
// ─────────────────────────────────────────────

interface NineCardProps {
  tableId: string;
  initialRole: PlayerRole;
  onLeave: () => void;
}

const NineCard: React.FC<NineCardProps> = ({ tableId, initialRole, onLeave }) => {
  const [table, setTable] = useState<TableDoc | null>(null);
  const [myCards, setMyCards] = useState<Card[]>([]);
  const [hasSeenCards, setHasSeenCards] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [potPop, setPotPop] = useState(false);
  const [tableLoaded, setTableLoaded] = useState(false);

  const { firebaseUser, user } = useAuth(); // AuthContext — uid + displayName
  const uid = firebaseUser?.uid ?? "";
  const myRole = useRef<PlayerRole>(initialRole);

  // Inject global CSS once
  useEffect(() => { injectStyles(); }, []);

  // Determine my role from table state
  useEffect(() => {
    if (!table) return;
    const found = [table.player1, table.player2].find((p) => p?.uid === uid);
    if (found) myRole.current = found.role;
  }, [table, uid]);

  // Real-time table sync
  useEffect(() => {
    const ref = doc(db, NINE_CARD_COLLECTIONS.TABLES, tableId);
    const unsub = onSnapshot(ref, (snap) => {
      if (!snap.exists()) return;
      const data = snap.data() as TableDoc;

      // Pot animation
      setTable((prev) => {
        if (prev && data.pot !== prev.pot) {
          setPotPop(true);
          setTimeout(() => setPotPop(false), 500);
        }
        return data;
      });

      setTableLoaded(true);
    });
    return unsub;
  }, [tableId]);

  // Deal cards when game starts
  useEffect(() => {
    if (!table) return;
    if (table.phase === "playing" && table.roundNumber > 0) {
      // Only deal if deck doesn't exist yet (first player to detect this)
      dealRound(tableId).catch(() => {/* Already dealt */});
    }
  }, [table?.phase, table?.roundNumber]);

  const handleSeeCards = useCallback(async () => {
    if (!table || !uid) return;
    setLoading("SEE CARDS");
    setError("");
    try {
      await seeCards(tableId, uid, myRole.current);
      const cards = await fetchMyCards(tableId, myRole.current);
      setMyCards(cards);
      setHasSeenCards(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to see cards");
    } finally {
      setLoading(null);
    }
  }, [table, uid, tableId]);

  const handleCall = useCallback(async () => {
    if (!table || !uid) return;
    setLoading("CALL " + formatAmount(table.currentCallAmount));
    setError("");
    try {
      // TODO: await deductFromWallet(uid, table.currentCallAmount); ← YOUR Wallet.ts
      await playerCall(tableId, uid, myRole.current);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to call");
    } finally {
      setLoading(null);
    }
  }, [table, uid, tableId]);

  const handlePack = useCallback(async () => {
    if (!table || !uid) return;
    if (!window.confirm("Are you sure you want to Pack/Fold?")) return;
    setLoading("PACK");
    setError("");
    try {
      await playerPack(tableId, uid, myRole.current);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to pack");
    } finally {
      setLoading(null);
    }
  }, [table, uid, tableId]);

  const handleShow = useCallback(async () => {
    if (!table || !uid) return;
    setLoading("SHOW");
    setError("");
    try {
      await playerShow(tableId, uid, myRole.current);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to show");
    } finally {
      setLoading(null);
    }
  }, [table, uid, tableId]);

  // ── Render ──────────────────────────────

  if (!tableLoaded) {
    return (
      <div style={{ ...tableContainer, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 48, height: 48, border: "3px solid #1a2a1a", borderTopColor: "#c9a227", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto" }} />
          <p style={{ color: "#555", marginTop: 20, letterSpacing: 2, fontSize: 13 }}>LOADING TABLE...</p>
        </div>
      </div>
    );
  }

  if (!table) return null;

  const me = table[myRole.current];
  const opponentRole = getOpponentRole(myRole.current);
  const opponent = table[opponentRole];
  const isMyTurn = table.turnOf === myRole.current && !me?.hasFolded;
  const gameActive = table.phase === "playing";
  const gameFinished = table.phase === "finished" || table.phase === "showdown";

  return (
    <div style={tableContainer}>
      {/* Felt background */}
      <div style={feltBackground} />

      {/* Table edge glow */}
      <div style={tableEdgeGlow} />

      {/* Inner layout */}
      <div style={innerLayout}>

        {/* === TOP — Opponent === */}
        {opponent && (
          <PlayerPanel
            player={opponent}
            cards={[]}
            isMe={false}
            isActive={table.turnOf === opponentRole}
            showCards={false}
            position="top"
          />
        )}

        {!opponent && (
          <div style={waitingSlotStyle}>
            <div style={{ fontSize: 11, color: "#333", letterSpacing: 2 }}>WAITING FOR OPPONENT</div>
          </div>
        )}

        {/* === CENTER — Table felt === */}
        <div style={centerTable}>
          {/* Table oval */}
          <div style={ovalFelt}>

            {/* Table name */}
            <div style={{ fontSize: 11, color: "#2a4a2a", letterSpacing: 3, marginBottom: 8 }}>
              {table.name.toUpperCase()}
            </div>

            {/* Pot */}
            <div
              className={potPop ? "pot-pop" : ""}
              style={{
                background: "linear-gradient(145deg, #1a1200, #120d00)",
                border: "1px solid #c9a22744",
                borderRadius: 12,
                padding: "8px 28px",
                textAlign: "center",
                marginBottom: 16,
              }}
            >
              <div style={{ fontSize: 10, color: "#554a00", letterSpacing: 2, fontFamily: "'Courier Prime', monospace" }}>
                POT
              </div>
              <div style={{ fontSize: 26, fontWeight: 700, color: "#c9a227", fontFamily: "'Playfair Display', serif" }}>
                {formatAmount(table.pot)}
              </div>
            </div>

            {/* Call amount */}
            <div style={{
              fontSize: 12,
              color: "#3a5a3a",
              letterSpacing: 1,
              fontFamily: "'Courier Prime', monospace",
              marginBottom: 8,
            }}>
              CALL: {formatAmount(table.currentCallAmount)}
            </div>

            {/* Round */}
            <div style={{ fontSize: 11, color: "#1a2a1a", letterSpacing: 2 }}>
              ROUND {table.roundNumber}
            </div>

            {/* Phase status */}
            {table.phase === "waiting" && (
              <div style={{ marginTop: 12, fontSize: 12, color: "#3a5a3a", letterSpacing: 2 }}>
                WAITING FOR PLAYERS...
              </div>
            )}
            {table.phase === "boot" && (
              <div style={{ marginTop: 12, fontSize: 12, color: "#c9a227", letterSpacing: 2 }}>
                PAY BOOT TO START
              </div>
            )}
          </div>
        </div>

        {/* === BOTTOM — Me === */}
        {me ? (
          <>
            <PlayerPanel
              player={me}
              cards={hasSeenCards ? myCards : []}
              isMe={true}
              isActive={isMyTurn}
              showCards={hasSeenCards}
              position="bottom"
            />

            {/* Action buttons — only when it's my turn */}
            {gameActive && isMyTurn && (
              <div className="slide-up">
                {error && (
                  <div style={{ color: "#ff4444", fontSize: 12, marginBottom: 8, textAlign: "center" }}>
                    {error}
                  </div>
                )}
                <ActionButtons
                  player={me}
                  callAmount={table.currentCallAmount}
                  onSeeCards={handleSeeCards}
                  onCall={handleCall}
                  onPack={handlePack}
                  onShow={handleShow}
                  loading={loading}
                />
              </div>
            )}

            {gameActive && !isMyTurn && opponent && (
              <div style={{
                textAlign: "center",
                fontSize: 12,
                color: "#2a4a2a",
                letterSpacing: 2,
                padding: "12px 0",
                fontFamily: "'Courier Prime', monospace",
              }}>
                WAITING FOR {opponent.displayName.toUpperCase()}...
              </div>
            )}
          </>
        ) : (
          <div style={waitingSlotStyle}>
            <div style={{ fontSize: 11, color: "#333", letterSpacing: 2 }}>JOINING TABLE...</div>
          </div>
        )}

        {/* Match History */}
        <MatchHistory table={table} />

      </div>{/* end innerLayout */}

      {/* Winner overlay */}
      {gameFinished && (
        <WinnerOverlay
          table={table}
          myUid={uid}
          onPlayAgain={() => window.location.reload()}
          onLeave={onLeave}
        />
      )}

    </div>
  );
};

export default NineCard;

// ─────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────

const tableContainer: React.CSSProperties = {
  minHeight: "100vh",
  background: "#020602",
  position: "relative",
  overflow: "hidden",
  fontFamily: "'Georgia', 'Times New Roman', serif",
  display: "flex",
  flexDirection: "column",
};

const feltBackground: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: `
    radial-gradient(ellipse at 50% 50%, #0a1f0a 0%, #030903 70%, #020602 100%)
  `,
  backgroundImage: `
    radial-gradient(ellipse at 50% 50%, #0a1f0a 0%, #030903 70%, #020602 100%),
    repeating-linear-gradient(
      60deg, transparent, transparent 3px,
      rgba(0,100,0,0.015) 3px, rgba(0,100,0,0.015) 6px
    )
  `,
  pointerEvents: "none",
  zIndex: 0,
};

const tableEdgeGlow: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "transparent",
  boxShadow: "inset 0 0 80px rgba(201,162,39,0.04), inset 0 0 200px rgba(0,0,0,0.6)",
  pointerEvents: "none",
  zIndex: 1,
};

const innerLayout: React.CSSProperties = {
  position: "relative",
  zIndex: 2,
  flex: 1,
  display: "flex",
  flexDirection: "column",
  gap: 12,
  padding: "16px 16px 24px",
  maxWidth: 680,
  width: "100%",
  margin: "0 auto",
};

const centerTable: React.CSSProperties = {
  flex: 1,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 160,
};

const ovalFelt: React.CSSProperties = {
  width: "100%",
  maxWidth: 400,
  background: "linear-gradient(145deg, #0d1f0d, #091509, #0d1f0d)",
  border: "3px solid #1a3a1a",
  borderRadius: 100,
  padding: "24px 32px",
  textAlign: "center",
  boxShadow: `
    0 0 0 1px #0a1a0a,
    0 0 40px rgba(0,0,0,0.8),
    inset 0 2px 4px rgba(255,255,255,0.02),
    inset 0 0 60px rgba(0,0,0,0.5)
  `,
};

const waitingSlotStyle: React.CSSProperties = {
  background: "linear-gradient(145deg, #080e08, #050a05)",
  border: "1px dashed #111",
  borderRadius: 16,
  padding: "24px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 96,
};
