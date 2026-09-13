/**
 * UI06: Typeahead Body Search Bar.
 */

import React, { useState } from "react";
import { CelestialBody } from "../simulation/types";

interface Props {
  bodies: CelestialBody[];
  onSelectBody: (id: string) => void;
}

export const BodySearchBar: React.FC<Props> = ({ bodies, onSelectBody }) => {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const matches = query.trim()
    ? bodies.filter((b) => b.name.toLowerCase().includes(query.toLowerCase())).slice(0, 6)
    : [];

  return (
    <div style={{ position: "relative" }}>
      <input
        type="text"
        placeholder="Find body..."
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        style={{
          background: "#0f172a",
          border: "1px solid #334155",
          color: "#e2e8f0",
          padding: "4px 10px",
          borderRadius: "4px",
          fontSize: "12px",
          width: "140px",
        }}
      />
      {isOpen && matches.length > 0 && (
        <div style={{
          position: "absolute",
          top: "100%",
          left: 0,
          right: 0,
          background: "#0b1329",
          border: "1px solid #38bdf8",
          borderRadius: "4px",
          marginTop: "4px",
          zIndex: 1000,
          boxShadow: "0 8px 16px rgba(0,0,0,0.5)",
        }}>
          {matches.map((b) => (
            <div
              key={b.id}
              onClick={() => {
                onSelectBody(b.id);
                setQuery("");
                setIsOpen(false);
              }}
              style={{
                padding: "6px 10px",
                fontSize: "12px",
                cursor: "pointer",
                borderBottom: "1px solid #1e293b",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: b.color }} />
              <span style={{ color: "#f8fafc" }}>{b.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
