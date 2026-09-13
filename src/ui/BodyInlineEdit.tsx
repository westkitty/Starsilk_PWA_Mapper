/**
 * UI13: Body Quick-Edit Color & Name Inline Form.
 */

import React, { useState } from "react";
import { CelestialBody } from "../simulation/types";

interface Props {
  body: CelestialBody;
  onUpdateBody: (id: string, patch: Partial<CelestialBody>) => void;
}

export const BodyInlineEdit: React.FC<Props> = ({ body, onUpdateBody }) => {
  const [name, setName] = useState(body.name);
  const [color, setColor] = useState(body.color);

  return (
    <div style={{ display: "flex", gap: "8px", alignItems: "center", marginTop: "8px" }}>
      <input
        type="color"
        value={color}
        onChange={(e) => {
          setColor(e.target.value);
          onUpdateBody(body.id, { color: e.target.value });
        }}
        style={{ width: "24px", height: "24px", padding: 0, border: "none", cursor: "pointer", background: "none" }}
      />
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={() => onUpdateBody(body.id, { name })}
        style={{
          background: "#0f172a",
          border: "1px solid #334155",
          color: "#f8fafc",
          padding: "3px 8px",
          borderRadius: "4px",
          fontSize: "12px",
          flex: 1
        }}
      />
    </div>
  );
};
