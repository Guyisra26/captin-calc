interface ActionWheelProps {
  stake: number;
  captainName: string;
  canDoubleTeamB: boolean;
  canDoubleCaptain: boolean;
  bottomAction: 'pivot' | 'initial' | null;
  pivotStake: number;
  onDoubleTeamB: () => void;
  onDoubleCaptain: () => void;
  onPivot: () => void;
  onInitialDouble: () => void;
  onEndRound: () => void;
}

export default function ActionWheel({
  stake,
  captainName,
  canDoubleTeamB,
  canDoubleCaptain,
  bottomAction,
  pivotStake,
  onDoubleTeamB,
  onDoubleCaptain,
  onPivot,
  onInitialDouble,
  onEndRound,
}: ActionWheelProps) {
  const cx = 190;
  const cy = 190;
  const R = 150;
  const r = 64;

  const pt = (rad: number, aDeg: number) => {
    const t = aDeg * Math.PI / 180;
    return [cx + rad * Math.cos(t), cy + rad * Math.sin(t)] as const;
  };

  const seg = (a0: number, a1: number) => {
    const o0 = pt(R, a0);
    const o1 = pt(R, a1);
    const i1 = pt(r, a1);
    const i0 = pt(r, a0);
    return `M${o0[0]} ${o0[1]} A${R} ${R} 0 0 1 ${o1[0]} ${o1[1]} L${i1[0]} ${i1[1]} A${r} ${r} 0 0 0 ${i0[0]} ${i0[1]} Z`;
  };

  const mid = (R + r) / 2;

  // Right (0°): Captain ×2, center±45 → -45 to 45
  const captainLabelPt = pt(mid, 0);
  // Left (180°): Crew ×2, center±45 → 135 to 225
  const crewLabelPt = pt(mid, 180);
  // Top (270°): End Round, center±45 → 225 to 315
  const endLabelPt = pt(mid, 270);
  // Bottom (90°): pivot/initial/null, center±45 → 45 to 135
  const bottomLabelPt = pt(mid, 90);

  const handleKeyDown = (handler: () => void) => (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handler();
    }
  };

  // Bottom spoke config
  let bottomFill = 'rgba(255,255,255,.03)';
  let bottomStroke = 'rgba(255,255,255,.06)';
  let bottomLabel = '';
  let bottomSub = '';
  let bottomTextFill = 'rgba(237,240,245,.3)';
  let bottomHandler: (() => void) | null = null;

  if (bottomAction === 'pivot') {
    bottomFill = 'rgba(167,139,250,.16)';
    bottomStroke = 'rgba(167,139,250,.5)';
    bottomLabel = 'Pivot';
    bottomSub = `→ ${pivotStake}`;
    bottomTextFill = '#c3b3fb';
    bottomHandler = onPivot;
  } else if (bottomAction === 'initial') {
    bottomFill = 'rgba(167,139,250,.16)';
    bottomStroke = 'rgba(167,139,250,.5)';
    bottomLabel = 'Initial ×2';
    bottomSub = `→ ${stake * 2}`;
    bottomTextFill = '#c3b3fb';
    bottomHandler = onInitialDouble;
  }

  const captainDisabled = !canDoubleCaptain;
  const crewDisabled = !canDoubleTeamB;

  return (
    <svg
      viewBox="0 0 380 380"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block', width: '100%', maxWidth: '320px', margin: '0 auto', touchAction: 'manipulation' }}
      role="img"
      aria-label="Doubling action wheel"
    >
      {/* SVG title: must be first child */}
      <title>{`Action wheel for ${captainName}'s round. Stake: ${stake}`}</title>
      {/* Right spoke — Captain ×2 */}
      <path
        d={seg(-45, 45)}
        fill={captainDisabled ? 'rgba(255,255,255,.04)' : 'rgba(212,179,106,.16)'}
        stroke={captainDisabled ? 'rgba(255,255,255,.08)' : 'rgba(212,179,106,.5)'}
        strokeWidth={1.5}
        role={captainDisabled ? undefined : 'button'}
        tabIndex={captainDisabled ? undefined : 0}
        aria-label={captainDisabled ? undefined : `Captain doubles to ${stake * 2}`}
        aria-disabled={captainDisabled ? true : undefined}
        style={{ cursor: captainDisabled ? 'default' : 'pointer' }}
        onClick={captainDisabled ? undefined : () => onDoubleCaptain()}
        onKeyDown={captainDisabled ? undefined : handleKeyDown(onDoubleCaptain)}
      />
      <g pointerEvents="none">
        <text
          x={captainLabelPt[0]}
          y={captainLabelPt[1] - 7}
          textAnchor="middle"
          fontSize={16}
          fontWeight={500}
          fill={captainDisabled ? 'rgba(237,240,245,.3)' : '#e8cd8d'}
          style={{ fontFamily: 'var(--font-body)' }}
        >
          Captain ×2
        </text>
        <text
          x={captainLabelPt[0]}
          y={captainLabelPt[1] + 7}
          textAnchor="middle"
          fontSize={12}
          fill={captainDisabled ? 'rgba(237,240,245,.3)' : '#e8cd8d'}
          opacity={captainDisabled ? 1 : 0.7}
          style={{ fontFamily: 'var(--font-body)' }}
        >
          {`→ ${stake * 2}`}
        </text>
      </g>

      {/* Left spoke — Crew ×2 */}
      <path
        d={seg(135, 225)}
        fill={crewDisabled ? 'rgba(255,255,255,.04)' : '#232834'}
        stroke={crewDisabled ? 'rgba(255,255,255,.08)' : 'rgba(255,255,255,.16)'}
        strokeWidth={1.5}
        role={crewDisabled ? undefined : 'button'}
        tabIndex={crewDisabled ? undefined : 0}
        aria-label={crewDisabled ? undefined : `Crew doubles to ${stake * 2}`}
        aria-disabled={crewDisabled ? true : undefined}
        style={{ cursor: crewDisabled ? 'default' : 'pointer' }}
        onClick={crewDisabled ? undefined : () => onDoubleTeamB()}
        onKeyDown={crewDisabled ? undefined : handleKeyDown(onDoubleTeamB)}
      />
      <g pointerEvents="none">
        <text
          x={crewLabelPt[0]}
          y={crewLabelPt[1] - 7}
          textAnchor="middle"
          fontSize={16}
          fontWeight={500}
          fill={crewDisabled ? 'rgba(237,240,245,.3)' : '#edf0f5'}
          style={{ fontFamily: 'var(--font-body)' }}
        >
          Crew ×2
        </text>
        <text
          x={crewLabelPt[0]}
          y={crewLabelPt[1] + 7}
          textAnchor="middle"
          fontSize={12}
          fill={crewDisabled ? 'rgba(237,240,245,.3)' : '#edf0f5'}
          opacity={crewDisabled ? 1 : 0.7}
          style={{ fontFamily: 'var(--font-body)' }}
        >
          {`→ ${stake * 2}`}
        </text>
      </g>

      {/* Top spoke — End Round */}
      <path
        d={seg(225, 315)}
        fill="rgba(87,201,138,.14)"
        stroke="rgba(87,201,138,.5)"
        strokeWidth={1.5}
        role="button"
        tabIndex={0}
        aria-label="End round — who won?"
        style={{ cursor: 'pointer' }}
        onClick={onEndRound}
        onKeyDown={handleKeyDown(onEndRound)}
      />
      <g pointerEvents="none">
        <text
          x={endLabelPt[0]}
          y={endLabelPt[1] - 7}
          textAnchor="middle"
          fontSize={16}
          fontWeight={500}
          fill="#7fe0aa"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          End Round
        </text>
        <text
          x={endLabelPt[0]}
          y={endLabelPt[1] + 7}
          textAnchor="middle"
          fontSize={12}
          fill="#7fe0aa"
          opacity={0.7}
          style={{ fontFamily: 'var(--font-body)' }}
        >
          who won?
        </text>
      </g>

      {/* Bottom spoke — Pivot / Initial ×2 / null */}
      <path
        d={seg(45, 135)}
        fill={bottomFill}
        stroke={bottomStroke}
        strokeWidth={1.5}
        role={bottomHandler ? 'button' : undefined}
        tabIndex={bottomHandler ? 0 : undefined}
        aria-label={bottomHandler
          ? (bottomAction === 'pivot' ? `Pivot to ${pivotStake}` : `Initial double to ${stake * 2}`)
          : undefined}
        style={{ cursor: bottomHandler ? 'pointer' : 'default' }}
        onClick={bottomHandler ?? undefined}
        onKeyDown={bottomHandler ? handleKeyDown(bottomHandler) : undefined}
      />
      {bottomLabel && (
        <g pointerEvents="none">
          <text
            x={bottomLabelPt[0]}
            y={bottomLabelPt[1] - 7}
            textAnchor="middle"
            fontSize={16}
            fontWeight={500}
            fill={bottomTextFill}
            style={{ fontFamily: 'var(--font-body)' }}
          >
            {bottomLabel}
          </text>
          <text
            x={bottomLabelPt[0]}
            y={bottomLabelPt[1] + 7}
            textAnchor="middle"
            fontSize={12}
            fill={bottomTextFill}
            opacity={0.7}
            style={{ fontFamily: 'var(--font-body)' }}
          >
            {bottomSub}
          </text>
        </g>
      )}

      {/* Center hub */}
      <circle
        cx={cx}
        cy={cy}
        r={60}
        fill="#13161d"
        stroke="rgba(212,179,106,.3)"
        strokeWidth={1.5}
      />
      <text
        x={cx}
        y={182}
        textAnchor="middle"
        fontSize={11}
        fill="rgba(237,240,245,.4)"
        letterSpacing=".12em"
        pointerEvents="none"
        style={{ fontFamily: 'var(--font-body)' }}
      >
        STAKE
      </text>
      <text
        x={cx}
        y={212}
        textAnchor="middle"
        fontSize={30}
        fontWeight={500}
        fill="#e8cd8d"
        pointerEvents="none"
        style={{ fontFamily: 'var(--font-body)' }}
      >
        {stake}
      </text>

    </svg>
  );
}
