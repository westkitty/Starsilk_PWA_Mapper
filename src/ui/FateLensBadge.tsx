import React from 'react';
import { Eye, X, GitBranch, Clock } from 'lucide-react';
import { CelestialBody } from '../simulation/types';

interface FateLensBadgeProps {
  selectedBody: CelestialBody | null;
  onClose: () => void;
  branchNames?: { id: string; name: string; color: string }[];
  echoCount?: number;
}

export const FateLensBadge: React.FC<FateLensBadgeProps> = ({
  selectedBody,
  onClose,
  branchNames = [],
  echoCount = 0,
}) => {
  if (!selectedBody) return null;

  return (
    <div className="fate-lens-badge hud-interactive" role="status" aria-label="Fate Lens Active">
      <div className="fate-lens-header">
        <div className="fate-lens-icon-wrap">
          <Eye size={14} className="fate-lens-pulsing-icon" />
        </div>
        <div className="fate-lens-title-group">
          <div className="fate-lens-kicker">CAUSALITY APERTURE</div>
          <div className="fate-lens-name">{selectedBody.name.toUpperCase()}</div>
        </div>
        <button
          className="fate-lens-close-btn"
          onClick={onClose}
          title="Deactivate Fate Lens"
          aria-label="Deactivate Fate Lens"
        >
          <X size={14} />
        </button>
      </div>

      <div className="fate-lens-triad">
        <span className="triad-node triad-then" title="Recent temporal echoes">
          <Clock size={10} />
          <span>THEN</span>
          {echoCount > 0 && <small className="triad-sub">({echoCount})</small>}
        </span>
        <span className="triad-arrow">→</span>
        <span className="triad-node triad-now" title="Authoritative physical state">
          <span className="triad-dot" />
          <span>NOW</span>
        </span>
        <span className="triad-arrow">→</span>
        <span className="triad-node triad-possible" title="Predicted future trajectories">
          <GitBranch size={10} />
          <span>POSSIBLE</span>
        </span>
      </div>

      {branchNames && branchNames.length > 1 && (
        <div className="fate-lens-branches-row">
          <span className="branches-label">FUTURES:</span>
          <div className="branches-pills">
            {branchNames.map((b) => (
              <span key={b.id} className="branch-pill" style={{ borderColor: b.color, color: b.color }}>
                <span className="branch-dot" style={{ backgroundColor: b.color }} />
                {b.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
