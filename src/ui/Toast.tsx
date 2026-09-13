/**
 * UI03: Toast Notification System.
 * Ephemeral floating notifications for system actions.
 */

import React, { useEffect, useState } from "react";
import { eventBus } from "../core/event-bus";

export interface ToastMessage {
  id: string;
  message: string;
  type: "info" | "success" | "warn" | "error";
  durationMs: number;
}

export const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    return eventBus.on("toast:notify", (payload) => {
      const id = Math.random().toString(36).substring(2, 9);
      const newToast: ToastMessage = {
        id,
        message: payload.message,
        type: payload.type || "info",
        durationMs: payload.durationMs || 3000,
      };

      setToasts((prev) => [...prev, newToast]);

      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, newToast.durationMs);
    });
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div style={{
      position: "fixed",
      bottom: "72px",
      right: "20px",
      display: "flex",
      flexDirection: "column",
      gap: "8px",
      zIndex: 9999,
      pointerEvents: "none",
    }}>
      {toasts.map((t) => {
        const borderColors = {
          info: "#38bdf8",
          success: "#10b981",
          warn: "#f59e0b",
          error: "#ef4444",
        };
        return (
          <div
            key={t.id}
            style={{
              background: "#0b1329",
              border: `1px solid ${borderColors[t.type]}`,
              borderLeft: `4px solid ${borderColors[t.type]}`,
              color: "#f8fafc",
              padding: "10px 16px",
              borderRadius: "6px",
              fontSize: "12px",
              fontWeight: 500,
              boxShadow: "0 8px 24px rgba(0,0,0,0.6)",
              pointerEvents: "auto",
              maxWidth: "320px",
            }}
          >
            {t.message}
          </div>
        );
      })}
    </div>
  );
};
