/**
 * NineCardLobby.tsx
 * ============================================================
 * Admin Lobby + Player Join UI for "9 Card Table"
 *
 * Admin: Create / manage tables.
 * Player: Browse & join available tables.
 * ============================================================
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  where,
} from "firebase/firestore";
import { db } from "../../firebase/config"; // src/firebase/config.ts
import { useAuth } from "../../context/AuthContext"; // AuthContext hook
import {
  TableDoc,
  TableStatus,
  createTable,
  adminUpdateTable,
  adminStartGame,
  adminEndGame,
  deleteTable,
  joinTable,
  formatAmount,
  NINE_CARD_COLLECTIONS,
} from "../../firebase/NineCardb";

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

interface LobbyProps {
  onJoinTable: (tableId: string, role: "player1" | "player2") => void;
}

// ─────────────────────────────────────────────
// STATUS BADGE
// ─────────────────────────────────────────────

const StatusBadge: React.FC<{ status: TableStatus }> = ({ status }) => {
  const config: Record<TableStatus, { label: string; color: string }> = {
    open: { label: "OPEN", color: "#00ff88" },
    locked: { label: "LOCKED", color: "#ff9900" },
    disabled: { label: "DISABLED", color: "#ff4444" },
    in_game: { label: "IN GAME", color: "#4488ff" },
  };
  const { label, color } = config[status];
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 10px",
        borderRadius: 4,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: 1.2,
        color,
        border: `1px solid ${color}`,
        background: `${color}18`,
        fontFamily: "'Courier New', monospace",
      }}
    >
      {label}
    </span>
  );
};

// ─────────────────────────────────────────────
// ADMIN CREATE TABLE MODAL
// ─────────────────────────────────────────────

const CreateTableModal: React.FC<{
  onClose: () => void;
  onCreated: (id: string) => void;
  adminUid: string;
}> = ({ onClose, onCreated, adminUid }) => {
  const [name, setName] = useState("");
  const [boot, setBoot] = useState("100");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCreate = async () => {
    if (!name.trim()) return setError("Table name required");
    const bootNum = parseInt(boot);
    if (isNaN(bootNum) || bootNum < 1) return setError("Invalid boot amount");

    setLoading(true);
    setError("");
    try {
      const id = await createTable(adminUid, name, bootNum);
      onCreated(id);
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to create table");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <h2 style={modalTitleStyle}>Create New Table</h2>
        {error && <p style={errorStyle}>{error}</p>}
        <label style={labelStyle}>Table Name</label>
        <input
          style={inputStyle}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. High Roller Table"
          maxLength={40}
        />
        <label style={labelStyle}>Boot Amount (₹)</label>
        <input
          style={inputStyle}
          type="number"
          value={boot}
          onChange={(e) => setBoot(e.target.value)}
          placeholder="100"
          min={1}
        />
        <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
          <button
            style={{ ...btnStyle, background: "#1a3a1a", color: "#00ff88", flex: 1 }}
            onClick={handleCreate}
            disabled={loading}
          >
            {loading ? "Creating..." : "CREATE TABLE"}
          </button>
          <button
            style={{ ...btnStyle, background: "#2a1a1a", color: "#ff6666", flex: 1 }}
            onClick={onClose}
          >
            CANCEL
          </button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// ADMIN TABLE ROW CONTROLS
// ─────────────────────────────────────────────

const AdminTableControls: React.FC<{ table: TableDoc }> = ({ table }) => {
  const [loading, setLoading] = useState<string | null>(null);

  const act = async (label: string, fn: () => Promise<void>) => {
    setLoading(label);
    try {
      await fn();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(null);
    }
  };

  const controlBtn = (label: string, fn: () => Promise<void>, color = "#888") => (
    <button
      key={label}
      onClick={() => act(label, fn)}
      disabled={loading !== null}
      style={{
        ...smallBtnStyle,
        color,
        border: `1px solid ${color}44`,
        opacity: loading === label ? 0.5 : 1,
      }}
    >
      {loading === label ? "..." : label}
    </button>
  );

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
      {table.status !== "open" &&
        controlBtn("ENABLE", () => adminUpdateTable(table.id, { status: "open" }), "#00ff88")}
      {table.status === "open" &&
        controlBtn("DISABLE", () => adminUpdateTable(table.id, { status: "disabled" }), "#ff4444")}
      {table.status !== "locked" &&
        controlBtn("LOCK", () => adminUpdateTable(table.id, { status: "locked" }), "#ff9900")}
      {table.status === "locked" &&
        controlBtn("UNLOCK", () => adminUpdateTable(table.id, { status: "open" }), "#00ff88")}
      {table.phase === "waiting" &&
        controlBtn("START", () => adminStartGame(table.id), "#4488ff")}
      {table.phase !== "waiting" && table.phase !== "finished" &&
        controlBtn("END GAME", () => adminEndGame(table.id), "#ff9900")}
      {controlBtn("DELETE", () => deleteTable(table.id), "#ff2222")}
    </div>
  );
};

// ─────────────────────────────────────────────
// SINGLE TABLE CARD — LOBBY
// ─────────────────────────────────────────────

const TableCard: React.FC<{
  table: TableDoc;
  isAdminUser: boolean;
  currentUid: string;
  onJoin: (tableId: string, role: "player1" | "player2") => void;
}> = ({ table, isAdminUser, currentUid, onJoin }) => {
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState("");

  const activePlayers = [table.player1, table.player2].filter(Boolean).length;
  const alreadyJoined =
    table.player1?.uid === currentUid || table.player2?.uid === currentUid;
  const canJoin =
    table.status === "open" &&
    table.phase === "waiting" &&
    activePlayers < 2 &&
    !alreadyJoined;

  const { firebaseUser: joinUser } = useAuth(); // AuthContext from handleJoin scope
  const handleJoin = async () => {
    if (!joinUser) return;
    setJoining(true);
    setJoinError("");
    try {
      const result = await joinTable(
        table.id,
        currentUid,
        joinUser.displayName ?? joinUser.email?.split("@")[0] ?? "Player"
      );
      if (result.success) {
        onJoin(table.id, result.role);
      } else {
        setJoinError(result.error ?? "Could not join");
      }
    } catch (e: unknown) {
      setJoinError(e instanceof Error ? e.message : "Failed to join");
    } finally {
      setJoining(false);
    }
  };

  return (
    <div style={tableCardStyle}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#f5e6c8", letterSpacing: 0.5 }}>
            {table.name}
          </div>
          <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>
            ID: {table.id.slice(0, 8)}…
          </div>
        </div>
        <StatusBadge status={table.status} />
      </div>

      {/* Stats */}
      <div style={statsRowStyle}>
        <div style={statItemStyle}>
          <span style={statLabelStyle}>BOOT</span>
          <span style={statValueStyle}>{formatAmount(table.bootAmount)}</span>
        </div>
        <div style={statItemStyle}>
          <span style={statLabelStyle}>PLAYERS</span>
          <span style={statValueStyle}>{activePlayers}/2</span>
        </div>
        <div style={statItemStyle}>
          <span style={statLabelStyle}>ROUND</span>
          <span style={statValueStyle}>{table.roundNumber}</span>
        </div>
        <div style={statItemStyle}>
          <span style={statLabelStyle}>POT</span>
          <span style={statValueStyle}>{formatAmount(table.pot)}</span>
        </div>
      </div>

      {/* Players */}
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        {(["player1", "player2"] as const).map((role) => {
          const p = table[role];
          return (
            <div key={role} style={playerSlotStyle(!!p)}>
              {p ? (
                <>
                  <span style={{ fontSize: 13, color: "#f5e6c8" }}>{p.displayName}</span>
                  <span
                    style={{
                      fontSize: 10,
                      color: p.status === "blind" ? "#ffaa00" : "#00ff88",
                      marginLeft: 6,
                    }}
                  >
                    {p.status.toUpperCase()}
                  </span>
                </>
              ) : (
                <span style={{ fontSize: 12, color: "#444" }}>EMPTY SEAT</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Action */}
      {joinError && <p style={{ ...errorStyle, marginTop: 8 }}>{joinError}</p>}

      {!isAdminUser && (
        <div style={{ marginTop: 12 }}>
          {alreadyJoined ? (
            <button
              style={{ ...btnStyle, background: "#0a2a1a", color: "#00ff88", width: "100%" }}
              onClick={() => {
                const role = table.player1?.uid === currentUid ? "player1" : "player2";
                onJoin(table.id, role);
              }}
            >
              REJOIN TABLE →
            </button>
          ) : canJoin ? (
            <button
              style={{ ...btnStyle, background: "#0a1a2a", color: "#4488ff", width: "100%" }}
              onClick={handleJoin}
              disabled={joining}
            >
              {joining ? "JOINING..." : `JOIN — ${formatAmount(table.bootAmount)} BOOT`}
            </button>
          ) : (
            <button style={{ ...btnStyle, background: "#1a1a1a", color: "#444", width: "100%", cursor: "not-allowed" }} disabled>
              {table.phase !== "waiting" ? "GAME IN PROGRESS" : "TABLE FULL"}
            </button>
          )}
        </div>
      )}

      {/* Admin Controls */}
      {isAdminUser && <AdminTableControls table={table} />}
    </div>
  );
};

// ─────────────────────────────────────────────
// MAIN LOBBY COMPONENT
// ─────────────────────────────────────────────

const NineCardLobby: React.FC<LobbyProps> = ({ onJoinTable }) => {
  const { firebaseUser, isAdmin: isAdminUser } = useAuth(); // AuthContext se uid + admin status
  const [tables, setTables] = useState<TableDoc[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "open" | "in_game">("all");

  const uid = firebaseUser?.uid ?? "";

  // Real-time tables listener
  useEffect(() => {
    const q = query(
      collection(db, NINE_CARD_COLLECTIONS.TABLES),
      where("status", "!=", "disabled"),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => d.data() as TableDoc);
      setTables(data);
      setLoading(false);
    });

    return unsub;
  }, []);

  const filteredTables = tables.filter((t) => {
    if (filter === "open") return t.status === "open";
    if (filter === "in_game") return t.status === "in_game";
    return true;
  });

  return (
    <div style={lobbyContainer}>
      {/* Background felt texture */}
      <div style={feltOverlay} />

      {/* Header */}
      <div style={headerStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={logoStyle}>🃏</div>
          <div>
            <h1 style={titleStyle}>9 CARD TABLE</h1>
            <p style={subtitleStyle}>Premium Card Room</p>
          </div>
        </div>
        {isAdminUser && (
          <button
            style={{ ...btnStyle, background: "#1a3a1a", color: "#00ff88", padding: "10px 24px" }}
            onClick={() => setShowCreateModal(true)}
          >
            + CREATE TABLE
          </button>
        )}
      </div>

      {/* Admin badge */}
      {isAdminUser && (
        <div style={adminBannerStyle}>
          ⚙️ Admin Mode — You can create and manage tables
        </div>
      )}

      {/* Filters */}
      <div style={filterRowStyle}>
        {(["all", "open", "in_game"] as const).map((f) => (
          <button
            key={f}
            style={{
              ...filterBtnStyle,
              background: filter === f ? "#c9a227" : "transparent",
              color: filter === f ? "#0a0a0a" : "#c9a227",
            }}
            onClick={() => setFilter(f)}
          >
            {f === "all" ? "ALL TABLES" : f === "open" ? "OPEN" : "LIVE GAMES"}
          </button>
        ))}
        <span style={{ marginLeft: "auto", color: "#555", fontSize: 13 }}>
          {filteredTables.length} table{filteredTables.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Table Grid */}
      {loading ? (
        <div style={loadingStyle}>
          <div style={spinnerStyle} />
          <p style={{ color: "#555", marginTop: 16 }}>Loading tables...</p>
        </div>
      ) : filteredTables.length === 0 ? (
        <div style={emptyStyle}>
          <div style={{ fontSize: 48 }}>🃏</div>
          <p style={{ color: "#555", marginTop: 12 }}>
            {isAdminUser ? "No tables yet. Create one above." : "No tables available. Check back soon."}
          </p>
        </div>
      ) : (
        <div style={gridStyle}>
          {filteredTables.map((table) => (
            <TableCard
              key={table.id}
              table={table}
              isAdminUser={isAdminUser}
              currentUid={uid}
              onJoin={onJoinTable}
            />
          ))}
        </div>
      )}

      {/* Footer */}
      <div style={footerStyle}>
        <span>9 Card Table • Premium Gaming</span>
        <span style={{ color: "#333" }}>|</span>
        <span>Play Responsibly</span>
      </div>

      {/* Modals */}
      {showCreateModal && isAdminUser && (
        <CreateTableModal
          adminUid={uid}
          onClose={() => setShowCreateModal(false)}
          onCreated={(id) => console.log("Created table:", id)}
        />
      )}
    </div>
  );
};

export default NineCardLobby;

// ─────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────

const lobbyContainer: React.CSSProperties = {
  minHeight: "100vh",
  background: "#050c05",
  position: "relative",
  overflowX: "hidden",
  fontFamily: "'Georgia', 'Times New Roman', serif",
};

const feltOverlay: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  backgroundImage: `
    radial-gradient(ellipse at 20% 20%, #0a1f0a 0%, transparent 60%),
    radial-gradient(ellipse at 80% 80%, #0a1a0a 0%, transparent 60%),
    repeating-linear-gradient(
      45deg,
      transparent,
      transparent 2px,
      rgba(0,80,0,0.03) 2px,
      rgba(0,80,0,0.03) 4px
    )
  `,
  pointerEvents: "none",
  zIndex: 0,
};

const headerStyle: React.CSSProperties = {
  position: "relative",
  zIndex: 1,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "32px 40px 24px",
  borderBottom: "1px solid #1a2a1a",
};

const logoStyle: React.CSSProperties = {
  fontSize: 40,
  filter: "drop-shadow(0 0 12px #c9a22755)",
};

const titleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 28,
  fontWeight: 700,
  color: "#c9a227",
  letterSpacing: 4,
  textShadow: "0 0 20px #c9a22744",
};

const subtitleStyle: React.CSSProperties = {
  margin: "4px 0 0",
  fontSize: 12,
  color: "#555",
  letterSpacing: 2,
};

const adminBannerStyle: React.CSSProperties = {
  position: "relative",
  zIndex: 1,
  background: "#0a1a0a",
  borderBottom: "1px solid #00ff8833",
  padding: "8px 40px",
  fontSize: 13,
  color: "#00ff88",
  letterSpacing: 0.5,
};

const filterRowStyle: React.CSSProperties = {
  position: "relative",
  zIndex: 1,
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "16px 40px",
  borderBottom: "1px solid #111",
};

const filterBtnStyle: React.CSSProperties = {
  padding: "6px 16px",
  border: "1px solid #c9a22744",
  borderRadius: 20,
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: 1.5,
  cursor: "pointer",
  fontFamily: "'Courier New', monospace",
  transition: "all 0.2s",
};

const gridStyle: React.CSSProperties = {
  position: "relative",
  zIndex: 1,
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
  gap: 20,
  padding: "28px 40px",
};

const tableCardStyle: React.CSSProperties = {
  background: "linear-gradient(145deg, #0d1a0d, #0a120a)",
  border: "1px solid #1e3a1e",
  borderRadius: 12,
  padding: 20,
  transition: "border-color 0.2s, box-shadow 0.2s",
  boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
};

const statsRowStyle: React.CSSProperties = {
  display: "flex",
  gap: 0,
  marginTop: 16,
  borderRadius: 8,
  overflow: "hidden",
  border: "1px solid #1e3a1e",
};

const statItemStyle: React.CSSProperties = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  padding: "8px 4px",
  borderRight: "1px solid #1e3a1e",
  background: "#0a100a",
};

const statLabelStyle: React.CSSProperties = {
  fontSize: 9,
  color: "#444",
  letterSpacing: 1.5,
  fontFamily: "'Courier New', monospace",
};

const statValueStyle: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 700,
  color: "#c9a227",
  marginTop: 2,
};

const playerSlotStyle = (occupied: boolean): React.CSSProperties => ({
  flex: 1,
  padding: "8px 12px",
  borderRadius: 6,
  background: occupied ? "#0a1a0a" : "#080808",
  border: `1px solid ${occupied ? "#1e3a1e" : "#111"}`,
  display: "flex",
  alignItems: "center",
});

const btnStyle: React.CSSProperties = {
  padding: "10px 20px",
  border: "none",
  borderRadius: 6,
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: 1.5,
  cursor: "pointer",
  fontFamily: "'Courier New', monospace",
  transition: "opacity 0.2s",
};

const smallBtnStyle: React.CSSProperties = {
  padding: "4px 10px",
  background: "transparent",
  borderRadius: 4,
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: 1,
  cursor: "pointer",
  fontFamily: "'Courier New', monospace",
};

const loadingStyle: React.CSSProperties = {
  position: "relative",
  zIndex: 1,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  padding: "80px 40px",
};

const spinnerStyle: React.CSSProperties = {
  width: 40,
  height: 40,
  border: "3px solid #1a2a1a",
  borderTopColor: "#c9a227",
  borderRadius: "50%",
  animation: "spin 1s linear infinite",
};

const emptyStyle: React.CSSProperties = {
  position: "relative",
  zIndex: 1,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  padding: "80px 40px",
};

const footerStyle: React.CSSProperties = {
  position: "relative",
  zIndex: 1,
  display: "flex",
  justifyContent: "center",
  gap: 16,
  padding: "24px 40px",
  borderTop: "1px solid #0f1a0f",
  color: "#333",
  fontSize: 12,
  letterSpacing: 1,
};

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.85)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
};

const modalStyle: React.CSSProperties = {
  background: "#0a120a",
  border: "1px solid #1e3a1e",
  borderRadius: 12,
  padding: 32,
  width: "100%",
  maxWidth: 420,
  boxShadow: "0 20px 60px rgba(0,0,0,0.8)",
};

const modalTitleStyle: React.CSSProperties = {
  margin: "0 0 20px",
  fontSize: 20,
  fontWeight: 700,
  color: "#c9a227",
  letterSpacing: 2,
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  color: "#555",
  letterSpacing: 1.5,
  marginBottom: 6,
  marginTop: 16,
  fontFamily: "'Courier New', monospace",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 14px",
  background: "#050c05",
  border: "1px solid #1e3a1e",
  borderRadius: 6,
  color: "#f5e6c8",
  fontSize: 14,
  boxSizing: "border-box",
  outline: "none",
  fontFamily: "'Georgia', serif",
};

const errorStyle: React.CSSProperties = {
  color: "#ff4444",
  fontSize: 12,
  margin: "4px 0",
};
