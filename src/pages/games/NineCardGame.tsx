/**
 * NineCardGame.tsx
 * ============================================================
 * Casino-style 9 Card Table — Real-time multiplayer game UI
 * ============================================================
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase/config";
import { useAuth } from "../../context/AuthContext";
import {
  TableDoc,
  NineCard,
  PlayerRole,
  PlayerState,
  ShowdownResult,
  payBoot,
  seeCards,
  playerCall,
  playerPack,
  playerShow,
  fetchMyCards,
  fetchShowdownCards,
  formatAmount,
  canShow,
  getOpponentRole,
  NINE_CARD_COLLECTIONS,
} from "../../firebase/NineCard";

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

interface NineCardGameProps {
  tableId: string;
  playerRole: PlayerRole;
  onLeave: () => void;
}

type ActionState = "idle" | "loading" | "error";

// ─────────────────────────────────────────────
// CARD COMPONENT
// ─────────────────────────────────────────────

const PlayingCard: React.FC<{
  card?: NineCard;
  faceDown?: boolean;
  animate?: boolean;
  size?: "sm" | "md" | "lg";
}> = ({ card, faceDown = false, animate = false, size = "md" }) => {
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    if (animate && !faceDown) {
      const t = setTimeout(() => setFlipped(true), 300);
      return () => clearTimeout(t);
    }
  }, [animate, faceDown]);

  const dims = {
    sm: { width: 52, height: 76, fontSize: 18, pip: 11 },
    md: { width: 72, height: 104, fontSize: 26, pip: 14 },
    lg: { width: 90, height: 130, fontSize: 32, pip: 16 },
  }[size];

  const isRed =
    card?.suit === "♥" || card?.suit === "♦";

  const showFace = !faceDown && (size === "sm" ? true : flipped || !animate);

  return (
    <div
      style={{
        width: dims.width,
        height: dims.height,
        perspective: 600,
        display: "inline-block",
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          position: "relative",
          transformStyle: "preserve-3d",
          transition: "transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
          transform: showFace ? "rotateY(0deg)" : "rotateY(180deg)",
          borderRadius: 8,
        }}
      >
        {/* Front face */}
        <div
          style={{
            position: "absolute",
            width: "100%",
            height: "100%",
            backfaceVisibility: "hidden",
            borderRadius: 8,
            background: "#fff",
            border: "2px solid #ddd",
            boxShadow: "0 4px 16px rgba(0,0,0,0.5), inset 0 0 0 1px #eee",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "4px 5px",
            boxSizing: "border-box",
          }}
        >
          {card && (
            <>
              <div
                style={{
                  fontSize: dims.pip,
                  fontWeight: 800,
                  color: isRed ? "#c41e3a" : "#1a1a1a",
                  lineHeight: 1,
                  fontFamily: "Georgia, serif",
                }}
              >
                {card.value}
                <br />
                {card.suit}
              </div>
              <div
                style={{
                  fontSize: dims.fontSize,
                  fontWeight: 900,
                  color: isRed ? "#c41e3a" : "#1a1a1a",
                  textAlign: "center",
                  lineHeight: 1,
                  fontFamily: "Georgia, serif",
                  textShadow: isRed
                    ? "0 1px 2px rgba(196,30,58,0.2)"
                    : "0 1px 2px rgba(0,0,0,0.2)",
                }}
              >
                {card.suit}
              </div>
              <div
                style={{
                  fontSize: dims.pip,
                  fontWeight: 800,
                  color: isRed ? "#c41e3a" : "#1a1a1a",
                  lineHeight: 1,
                  transform: "rotate(180deg)",
                  fontFamily: "Georgia, serif",
                }}
              >
                {card.value}
                <br />
                {card.suit}
              </div>
            </>
          )}
        </div>

        {/* Back face */}
        <div
          style={{
            position: "absolute",
            width: "100%",
            height: "100%",
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
            borderRadius: 8,
            background: "linear-gradient(135deg, #1a0a2e 0%, #16213e 50%, #0f3460 100%)",
            border: "2px solid #c9a227",
            boxShadow: "0 4px 16px rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: "80%",
              height: "80%",
              border: "2px solid #c9a22766",
              borderRadius: 4,
              backgroundImage: `repeating-linear-gradient(
                45deg,
                transparent,
                transparent 4px,
                rgba(201,162,39,0.08) 4px,
                rgba(201,162,39,0.08) 8px
              )`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: dims.fontSize * 0.6,
            }}
          >
            🃏
          </div>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// PLAYER SEAT COMPONENT
// ─────────────────────────────────────────────

const PlayerSeat: React.FC<{
  player: PlayerState | null;
  cards: NineCard[];
  showCards: boolean;
  isMe: boolean;
  isActive: boolean;
  role: PlayerRole;
  showdownResult?: ShowdownResult | null;
  myUid: string;
}> = ({ player, cards, showCards, isMe, isActive, role, showdownResult, myUid }) => {
  const isWinner =
    showdownResult?.winnerId === player?.uid;
  const isLoser =
    showdownResult && showdownResult.winnerId && showdownResult.winnerId !== player?.uid;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
        position: "relative",
      }}
    >
      {/* Winner/Loser glow */}
      {isWinner && (
        <div
          style={{
            position: "absolute",
            inset: -20,
            borderRadius: 20,
            background: "radial-gradient(ellipse, rgba(201,162,39,0.25) 0%, transparent 70%)",
            animation: "pulse 1s ease-in-out infinite",
            pointerEvents: "none",
          }}
        />
      )}

      {/* Cards */}
      <div style={{ display: "flex", gap: 8, position: "relative" }}>
        {player ? (
          cards.length > 0 && showCards ? (
            cards.map((card, i) => (
              <PlayingCard
                key={card.id}
                card={card}
                faceDown={false}
                animate={true}
                size="md"
              />
            ))
          ) : (
            [0, 1].map((i) => (
              <PlayingCard key={i} faceDown size="md" />
            ))
          )
        ) : (
          <div
            style={{
              width: 72,
              height: 104,
              border: "2px dashed #2a3a2a",
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#333",
              fontSize: 11,
              letterSpacing: 1,
            }}
          >
            EMPTY
          </div>
        )}
      </div>

      {/* Player info */}
      <div
        style={{
          background: isActive
            ? "linear-gradient(135deg, #0d2a0d, #162816)"
            : "#0a100a",
          border: `1px solid ${isActive ? "#c9a227" : "#1e2e1e"}`,
          borderRadius: 8,
          padding: "8px 16px",
          minWidth: 160,
          textAlign: "center",
          position: "relative",
          boxShadow: isActive
            ? "0 0 20px rgba(201,162,39,0.3)"
            : "none",
          transition: "all 0.3s ease",
        }}
      >
        {isActive && (
          <div
            style={{
              position: "absolute",
              top: -1,
              left: "50%",
              transform: "translateX(-50%)",
              background: "#c9a227",
              color: "#0a0a0a",
              fontSize: 9,
              fontWeight: 800,
              letterSpacing: 1.5,
              padding: "2px 8px",
              borderRadius: "0 0 4px 4px",
              fontFamily: "Courier New, monospace",
            }}
          >
            YOUR TURN
          </div>
        )}

        <div
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: isMe ? "#c9a227" : "#f5e6c8",
            letterSpacing: 0.5,
          }}
        >
          {player ? player.displayName : "Waiting..."}
          {isMe && " (YOU)"}
        </div>

        {player && (
          <>
            <div
              style={{
                display: "inline-block",
                marginTop: 4,
                padding: "2px 8px",
                borderRadius: 3,
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: 1.2,
                color:
                  player.status === "blind" ? "#ffaa00" : "#00ff88",
                border: `1px solid ${
                  player.status === "blind" ? "#ffaa0044" : "#00ff8844"
                }`,
                background:
                  player.status === "blind"
                    ? "#ffaa0011"
                    : "#00ff8811",
                fontFamily: "Courier New, monospace",
              }}
            >
              {player.status === "blind" ? "BLIND" : "SEEN CARDS"}
            </div>

            {player.hasFolded && (
              <div
                style={{
                  marginTop: 4,
                  fontSize: 10,
                  color: "#ff4444",
                  fontWeight: 700,
                  letterSpacing: 1,
                }}
              >
                FOLDED
              </div>
            )}

            {player.lastAction && !player.hasFolded && (
              <div
                style={{
                  marginTop: 4,
                  fontSize: 10,
                  color: "#888",
                  fontFamily: "Courier New, monospace",
                }}
              >
                Last: {player.lastAction.toUpperCase()}
              </div>
            )}

            <div
              style={{
                marginTop: 6,
                fontSize: 12,
                color: "#c9a227",
                fontWeight: 700,
              }}
            >
              Bet: {formatAmount(player.totalBet)}
            </div>
          </>
        )}

        {isWinner && (
          <div
            style={{
              marginTop: 6,
              fontSize: 13,
              color: "#c9a227",
              fontWeight: 800,
              letterSpacing: 1,
              animation: "pulse 0.8s ease-in-out infinite",
            }}
          >
            🏆 WINNER!
          </div>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// ACTION BUTTONS
// ─────────────────────────────────────────────

const ActionButtons: React.FC<{
  table: TableDoc;
  myRole: PlayerRole;
  myPlayer: PlayerState;
  myCards: NineCard[];
  onAction: (action: string) => Promise<void>;
  actionState: ActionState;
  actionError: string;
}> = ({ table, myRole, myPlayer, myCards, onAction, actionState, actionError }) => {
  const isMyTurn = table.turnOf === myRole;
  const showEnabled = canShow(myPlayer, table.currentCallAmount);
  const hasSeenCards = myPlayer.status === "seen";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 12,
      }}
    >
      {actionError && (
        <div
          style={{
            background: "#1a0a0a",
            border: "1px solid #ff444444",
            borderRadius: 6,
            padding: "8px 16px",
            color: "#ff6666",
            fontSize: 12,
            fontFamily: "Courier New, monospace",
            maxWidth: 320,
            textAlign: "center",
          }}
        >
          {actionError}
        </div>
      )}

      {/* Boot payment phase */}
      {table.phase === "boot" && !myPlayer.hasPaid && (
        <div style={{ textAlign: "center" }}>
          <p style={{ color: "#888", fontSize: 13, margin: "0 0 12px" }}>
            Pay boot to start the game
          </p>
          <ActionBtn
            label={`PAY BOOT — ${formatAmount(table.bootAmount)}`}
            color="#c9a227"
            bg="#1a1200"
            onClick={() => onAction("boot")}
            loading={actionState === "loading"}
          />
        </div>
      )}

      {table.phase === "boot" && myPlayer.hasPaid && (
        <div
          style={{
            color: "#00ff88",
            fontSize: 13,
            fontFamily: "Courier New, monospace",
            letterSpacing: 1,
          }}
        >
          ✓ Boot paid — Waiting for opponent...
        </div>
      )}

      {/* Playing phase */}
      {table.phase === "playing" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "center" }}>
          {/* See cards button — only if blind */}
          {!hasSeenCards && (
            <ActionBtn
              label="👁 SEE MY CARDS"
              color="#ff9900"
              bg="#1a0f00"
              onClick={() => onAction("see")}
              loading={actionState === "loading"}
            />
          )}

          {/* Turn-based actions */}
          <div style={{ display: "flex", gap: 10 }}>
            <ActionBtn
              label={`CALL — ${formatAmount(table.currentCallAmount)}`}
              color="#4488ff"
              bg="#001022"
              onClick={() => onAction("call")}
              loading={actionState === "loading"}
              disabled={!isMyTurn}
            />
            {hasSeenCards && (
              <ActionBtn
                label="SHOW"
                color="#c9a227"
                bg="#120e00"
                onClick={() => onAction("show")}
                loading={actionState === "loading"}
                disabled={!isMyTurn || !showEnabled}
              />
            )}
            <ActionBtn
              label="PACK / FOLD"
              color="#ff4444"
              bg="#1a0000"
              onClick={() => onAction("pack")}
              loading={actionState === "loading"}
              disabled={!isMyTurn}
            />
          </div>

          {!isMyTurn && (
            <p
              style={{
                color: "#555",
                fontSize: 12,
                fontFamily: "Courier New, monospace",
                margin: 0,
                letterSpacing: 1,
              }}
            >
              Opponent's turn...
            </p>
          )}
        </div>
      )}

      {/* Showdown / Finished */}
      {(table.phase === "showdown" || table.phase === "finished") && (
        <div
          style={{
            background: "#0a0a0a",
            border: "1px solid #c9a22744",
            borderRadius: 8,
            padding: "16px 24px",
            textAlign: "center",
          }}
        >
          {table.winReason && (
            <p
              style={{
                color: "#c9a227",
                fontSize: 13,
                margin: "0 0 8px",
                fontFamily: "Courier New, monospace",
              }}
            >
              {table.winReason}
            </p>
          )}
          <p style={{ color: "#555", fontSize: 11, margin: 0 }}>
            Admin will reset the table for next round
          </p>
        </div>
      )}
    </div>
  );
};

const ActionBtn: React.FC<{
  label: string;
  color: string;
  bg: string;
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
}> = ({ label, color, bg, onClick, loading, disabled }) => (
  <button
    onClick={onClick}
    disabled={loading || disabled}
    style={{
      padding: "12px 20px",
      background: disabled ? "#111" : bg,
      border: `1px solid ${disabled ? "#222" : color + "66"}`,
      borderRadius: 6,
      color: disabled ? "#333" : color,
      fontSize: 11,
      fontWeight: 800,
      letterSpacing: 1.5,
      cursor: disabled || loading ? "not-allowed" : "pointer",
      fontFamily: "Courier New, monospace",
      opacity: loading ? 0.6 : 1,
      transition: "all 0.2s",
      boxShadow: disabled ? "none" : `0 0 12px ${color}22`,
      whiteSpace: "nowrap",
    }}
  >
    {loading ? "..." : label}
  </button>
);

// ─────────────────────────────────────────────
// POT DISPLAY
// ─────────────────────────────────────────────

const PotDisplay: React.FC<{
  pot: number;
  callAmount: number;
  round: number;
}> = ({ pot, callAmount, round }) => (
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 4,
    }}
  >
    <div
      style={{
        background: "radial-gradient(ellipse, #1a1200 0%, #0a0800 100%)",
        border: "2px solid #c9a22766",
        borderRadius: 40,
        padding: "10px 32px",
        textAlign: "center",
        boxShadow: "0 0 30px rgba(201,162,39,0.2), inset 0 0 20px rgba(201,162,39,0.05)",
      }}
    >
      <div
        style={{
          fontSize: 10,
          color: "#666",
          letterSpacing: 2,
          fontFamily: "Courier New, monospace",
        }}
      >
        POT
      </div>
      <div
        style={{
          fontSize: 28,
          fontWeight: 800,
          color: "#c9a227",
          letterSpacing: 1,
          fontFamily: "Georgia, serif",
          textShadow: "0 0 20px rgba(201,162,39,0.6)",
        }}
      >
        {formatAmount(pot)}
      </div>
    </div>

    <div style={{ display: "flex", gap: 16 }}>
      <div
        style={{
          fontSize: 11,
          color: "#4488ff",
          fontFamily: "Courier New, monospace",
          letterSpacing: 1,
        }}
      >
        CALL: {formatAmount(callAmount)}
      </div>
      <div
        style={{
          fontSize: 11,
          color: "#555",
          fontFamily: "Courier New, monospace",
          letterSpacing: 1,
        }}
      >
        ROUND #{round}
      </div>
    </div>
  </div>
);

// ─────────────────────────────────────────────
// MATCH HISTORY
// ─────────────────────────────────────────────

const MatchHistory: React.FC<{ table: TableDoc }> = ({ table }) => {
  if (table.matchHistory.length === 0) return null;

  return (
    <div
      style={{
        background: "#050a05",
        border: "1px solid #0f1f0f",
        borderRadius: 8,
        padding: "12px 16px",
        maxHeight: 140,
        overflowY: "auto",
      }}
    >
      <div
        style={{
          fontSize: 10,
          color: "#444",
          letterSpacing: 2,
          fontFamily: "Courier New, monospace",
          marginBottom: 8,
        }}
      >
        MATCH HISTORY
      </div>
      {[...table.matchHistory].reverse().map((h, i) => (
        <div
          key={i}
          style={{
            fontSize: 11,
            color: "#555",
            fontFamily: "Courier New, monospace",
            padding: "4px 0",
            borderBottom: "1px solid #0f1f0f",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <span>
            R{h.round} — {h.winnerName}
          </span>
          <span style={{ color: "#c9a22788" }}>{formatAmount(h.potAmount)}</span>
        </div>
      ))}
    </div>
  );
};

// ─────────────────────────────────────────────
// MAIN GAME COMPONENT
// ─────────────────────────────────────────────

const NineCardGame: React.FC<NineCardGameProps> = ({
  tableId,
  playerRole,
  onLeave,
}) => {
  const { firebaseUser } = useAuth();
  const uid = firebaseUser?.uid ?? "";

  const [table, setTable] = useState<TableDoc | null>(null);
  const [myCards, setMyCards] = useState<NineCard[]>([]);
  const [showdownCards, setShowdownCards] = useState<{
    player1Cards: NineCard[];
    player2Cards: NineCard[];
  } | null>(null);
  const [cardsVisible, setCardsVisible] = useState(false);
  const [actionState, setActionState] = useState<ActionState>("idle");
  const [actionError, setActionError] = useState("");
  const [loading, setLoading] = useState(true);

  const opponentRole = getOpponentRole(playerRole);
  const myPlayer = table?.[playerRole] ?? null;
  const opponentPlayer = table?.[opponentRole] ?? null;

  // ── Real-time table listener ──
  useEffect(() => {
    const ref = doc(db, NINE_CARD_COLLECTIONS.TABLES, tableId);
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        setTable(snap.data() as TableDoc);
      }
      setLoading(false);
    });
    return unsub;
  }, [tableId]);

  // ── Fetch my cards when playing ──
  useEffect(() => {
    if (table?.phase === "playing" || table?.phase === "showdown" || table?.phase === "finished") {
      fetchMyCards(tableId, playerRole).then((cards) => {
        if (cards.length > 0) setMyCards(cards);
      });
    }
  }, [table?.phase, tableId, playerRole]);

  // ── Fetch showdown cards on reveal ──
  useEffect(() => {
    if (table?.phase === "showdown" || table?.phase === "finished") {
      fetchShowdownCards(tableId).then((data) => {
        if (data) setShowdownCards(data);
      });
    }
  }, [table?.phase, tableId]);

  // ── Determine card visibility ──
  const opponentShowdownCards =
    showdownCards?.[opponentRole === "player1" ? "player1Cards" : "player2Cards"] ?? [];

  // ── Handle actions ──
  const handleAction = useCallback(
    async (action: string) => {
      if (!table || !myPlayer) return;
      setActionState("loading");
      setActionError("");

      try {
        switch (action) {
          case "boot":
            await payBoot(tableId, uid, playerRole);
            break;
          case "see":
            await seeCards(tableId, uid, playerRole);
            setCardsVisible(true);
            await fetchMyCards(tableId, playerRole).then((c) => {
              if (c.length > 0) setMyCards(c);
            });
            break;
          case "call":
            await playerCall(tableId, uid, playerRole);
            break;
          case "pack":
            await playerPack(tableId, uid, playerRole);
            break;
          case "show":
            await playerShow(tableId, uid, playerRole);
            break;
        }
        setActionState("idle");
      } catch (e: unknown) {
        setActionState("error");
        setActionError(
          e instanceof Error ? e.message : "Action failed. Please try again."
        );
        setTimeout(() => {
          setActionState("idle");
          setActionError("");
        }, 3000);
      }
    },
    [table, myPlayer, tableId, uid, playerRole]
  );

  // ── Loading ──
  if (loading || !table) {
    return (
      <div style={loadingScreen}>
        <div style={spinner} />
        <p style={{ color: "#555", marginTop: 20, fontFamily: "Courier New, monospace" }}>
          Connecting to table...
        </p>
      </div>
    );
  }

  const isShowdown =
    table.phase === "showdown" || table.phase === "finished";
  const showMyCards =
    cardsVisible || myPlayer?.status === "seen" || isShowdown;
  const showOpponentCards = isShowdown;

  return (
    <div style={gameContainer}>
      {/* CSS animations */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes dealIn {
          from { opacity: 0; transform: translateY(-40px) scale(0.8); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes chipFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
      `}</style>

      {/* Felt background */}
      <div style={feltBg} />

      {/* Header bar */}
      <div style={headerBar}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 22, filter: "drop-shadow(0 0 8px #c9a22788)" }}>🃏</span>
          <span style={{ color: "#c9a227", fontWeight: 800, fontSize: 16, letterSpacing: 3 }}>
            9 CARD TABLE
          </span>
          <span
            style={{
              fontSize: 11,
              color: "#444",
              fontFamily: "Courier New, monospace",
              marginLeft: 8,
            }}
          >
            {table.name} • ID: {tableId.slice(0, 6)}…
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span
            style={{
              fontSize: 11,
              color:
                table.phase === "playing"
                  ? "#00ff88"
                  : table.phase === "showdown" || table.phase === "finished"
                  ? "#c9a227"
                  : "#888",
              fontFamily: "Courier New, monospace",
              letterSpacing: 1,
            }}
          >
            ● {table.phase.toUpperCase()}
          </span>
          <button
            onClick={onLeave}
            style={{
              background: "transparent",
              border: "1px solid #ff444444",
              borderRadius: 4,
              color: "#ff4444",
              fontSize: 11,
              padding: "4px 12px",
              cursor: "pointer",
              fontFamily: "Courier New, monospace",
              letterSpacing: 1,
            }}
          >
            LEAVE
          </button>
        </div>
      </div>

      {/* Table layout */}
      <div style={tableLayout}>

        {/* Opponent seat (top) */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            padding: "20px 0 0",
          }}
        >
          <PlayerSeat
            player={opponentPlayer}
            cards={opponentShowdownCards}
            showCards={showOpponentCards}
            isMe={false}
            isActive={table.turnOf === opponentRole && table.phase === "playing"}
            role={opponentRole}
            showdownResult={table.showdownResult}
            myUid={uid}
          />
        </div>

        {/* Center table felt + pot */}
        <div style={centerFelt}>
          {/* Table oval */}
          <div style={tableOval}>
            {/* Inner felt */}
            <div style={innerFelt}>
              <PotDisplay
                pot={table.pot}
                callAmount={table.currentCallAmount}
                round={table.roundNumber}
              />

              {/* Phase indicator */}
              {table.phase === "waiting" && (
                <p
                  style={{
                    color: "#444",
                    fontSize: 12,
                    fontFamily: "Courier New, monospace",
                    marginTop: 12,
                    letterSpacing: 1,
                  }}
                >
                  Waiting for players...
                </p>
              )}

              {/* Showdown result */}
              {table.showdownResult && isShowdown && (
                <div
                  style={{
                    marginTop: 12,
                    padding: "10px 20px",
                    background: "#0a0800",
                    border: "1px solid #c9a22733",
                    borderRadius: 8,
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: 11, color: "#c9a227", fontFamily: "Courier New, monospace", letterSpacing: 1 }}>
                    SHOWDOWN
                  </div>
                  <div style={{ fontSize: 12, color: "#888", marginTop: 4 }}>
                    {table.winReason}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* My seat (bottom) */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 16,
            paddingBottom: 24,
          }}
        >
          <PlayerSeat
            player={myPlayer}
            cards={myCards}
            showCards={showMyCards}
            isMe={true}
            isActive={table.turnOf === playerRole && table.phase === "playing"}
            role={playerRole}
            showdownResult={table.showdownResult}
            myUid={uid}
          />

          {/* Action buttons */}
          {myPlayer && (
            <ActionButtons
              table={table}
              myRole={playerRole}
              myPlayer={myPlayer}
              myCards={myCards}
              onAction={handleAction}
              actionState={actionState}
              actionError={actionError}
            />
          )}
        </div>
      </div>

      {/* Match history sidebar */}
      <div style={historyPanel}>
        <MatchHistory table={table} />
      </div>
    </div>
  );
};

export default NineCardGame;

// ─────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────

const gameContainer: React.CSSProperties = {
  minHeight: "100vh",
  background: "#030a03",
  position: "relative",
  overflowX: "hidden",
  fontFamily: "Georgia, 'Times New Roman', serif",
  display: "flex",
  flexDirection: "column",
};

const feltBg: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  backgroundImage: `
    radial-gradient(ellipse at 50% 50%, #061206 0%, #020602 60%, #010401 100%),
    repeating-linear-gradient(
      45deg,
      transparent, transparent 3px,
      rgba(0,60,0,0.04) 3px, rgba(0,60,0,0.04) 6px
    )
  `,
  pointerEvents: "none",
  zIndex: 0,
};

const headerBar: React.CSSProperties = {
  position: "relative",
  zIndex: 2,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "12px 24px",
  borderBottom: "1px solid #0f1f0f",
  background: "rgba(5,10,5,0.9)",
  backdropFilter: "blur(8px)",
};

const tableLayout: React.CSSProperties = {
  position: "relative",
  zIndex: 1,
  flex: 1,
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
  maxWidth: 680,
  margin: "0 auto",
  width: "100%",
  padding: "0 16px",
  minHeight: "calc(100vh - 56px)",
};

const centerFelt: React.CSSProperties = {
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  padding: "8px 0",
};

const tableOval: React.CSSProperties = {
  width: "100%",
  maxWidth: 520,
  aspectRatio: "2.2 / 1",
  borderRadius: "50%",
  background: "radial-gradient(ellipse at 50% 40%, #0a1f0a 0%, #061206 60%, #030d03 100%)",
  border: "6px solid #1a3a1a",
  boxShadow: `
    0 0 0 2px #0a1a0a,
    0 0 60px rgba(0,0,0,0.8),
    inset 0 4px 20px rgba(0,0,0,0.6),
    inset 0 0 60px rgba(0,50,0,0.2)
  `,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  position: "relative",
};

const innerFelt: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 8,
  padding: "0 40px",
};

const historyPanel: React.CSSProperties = {
  position: "fixed",
  right: 16,
  bottom: 16,
  width: 240,
  zIndex: 3,
};

const loadingScreen: React.CSSProperties = {
  minHeight: "100vh",
  background: "#030a03",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
};

const spinner: React.CSSProperties = {
  width: 40,
  height: 40,
  border: "3px solid #1a2a1a",
  borderTopColor: "#c9a227",
  borderRadius: "50%",
  animation: "spin 1s linear infinite",
};
