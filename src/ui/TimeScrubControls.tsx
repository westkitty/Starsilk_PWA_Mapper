/**
 * UI09: Time Scrub Controls.
 * Quick step jumps (+1 day, +30 days, -1 day) for orbital analysis.
 */

import React from "react";
import { SECONDS_PER_DAY } from "../simulation/units";

interface Props {
  onStepTime: (deltaSeconds: number) => void;
}

export const TimeScrubControls: React.FC<Props> = ({ onStepTime }) => {
  return (
    <div style={{ display: "flex", gap: "4px" }}>
      <button className="btn-secondary" style={{ padding: "4px 8px", fontSize: "11px" }} onClick={() => onStepTime(-SECONDS_PER_DAY)}>
        -1d
      </button>
      <button className="btn-secondary" style={{ padding: "4px 8px", fontSize: "11px" }} onClick={() => onStepTime(SECONDS_PER_DAY)}>
        +1d
      </button>
      <button className="btn-secondary" style={{ padding: "4px 8px", fontSize: "11px" }} onClick={() => onStepTime(SECONDS_PER_DAY * 30)}>
        +30d
      </button>
    </div>
  );
};
