interface ActionBoardProps {
  stake: number;
  captainName: string;
  canDoubleTeamB: boolean;
  canDoubleCaptain: boolean;
  bottomAction: "pivot" | "initial" | null;
  pivotStake: number;
  onDoubleTeamB: () => void;
  onDoubleCaptain: () => void;
  onPivot: () => void;
  onInitialDouble: () => void;
  onEndRound: () => void;
}

const subtitleStyle = { fontSize: "0.75rem", fontWeight: 500 } as const;
const colStyle = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: "0.125rem",
} as const;

export default function ActionBoard({
  stake,
  canDoubleTeamB,
  canDoubleCaptain,
  bottomAction,
  pivotStake,
  onDoubleTeamB,
  onDoubleCaptain,
  onPivot,
  onInitialDouble,
  onEndRound,
}: ActionBoardProps) {
  return (
    <div className="space-y-2" style={{ touchAction: "manipulation" }}>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          className="btn btn-captain"
          style={{ minHeight: "64px", ...colStyle }}
          disabled={!canDoubleCaptain}
          onClick={onDoubleCaptain}
        >
          <span>Captain ×2</span>
          <span style={subtitleStyle}>{`→ ${stake * 2}`}</span>
        </button>
        <button
          type="button"
          className="btn btn-teamb"
          style={{ minHeight: "64px", ...colStyle }}
          disabled={!canDoubleTeamB}
          onClick={onDoubleTeamB}
        >
          <span>Crew ×2</span>
          <span style={subtitleStyle}>{`→ ${stake * 2}`}</span>
        </button>
      </div>

      {bottomAction && (
        <button
          type="button"
          className="btn btn-pivot w-full"
          style={{ minHeight: "56px" }}
          onClick={bottomAction === "pivot" ? onPivot : onInitialDouble}
        >
          {bottomAction === "pivot"
            ? `Pivot → ${pivotStake}`
            : `Initial ×2 → ${stake * 2}`}
        </button>
      )}

      <button
        type="button"
        className="btn btn-success w-full"
        style={{ minHeight: "56px" }}
        onClick={onEndRound}
      >
        End Round
      </button>
    </div>
  );
}
