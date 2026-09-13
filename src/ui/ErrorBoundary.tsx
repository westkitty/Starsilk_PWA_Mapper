/**
 * BACK11: Error Boundary & Crash Recovery UI.
 * Catches WebGL context losses or runtime UI errors and offers non-destructive recovery.
 */

import { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error caught by ErrorBoundary:", error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetState = () => {
    localStorage.clear();
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "#05070d",
          color: "#e2e8f0",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          zIndex: 99999,
          fontFamily: "monospace"
        }}>
          <h2 style={{ color: "#f87171", marginBottom: "12px" }}>Simulation Anomaly Detected</h2>
          <p style={{ maxWidth: "600px", textAlign: "center", marginBottom: "20px", color: "#94a3b8" }}>
            The 3D runtime encountered an unexpected state. Your project data remains safe in storage.
          </p>
          <div style={{
            background: "#0f172a",
            padding: "16px",
            borderRadius: "8px",
            maxWidth: "700px",
            overflowX: "auto",
            marginBottom: "24px",
            border: "1px solid #1e293b",
            fontSize: "12px",
            color: "#cbd5e1"
          }}>
            {this.state.error?.message || "Unknown error"}
          </div>
          <div style={{ display: "flex", gap: "12px" }}>
            <button
              onClick={this.handleReload}
              style={{
                background: "#0284c7",
                color: "#fff",
                border: "none",
                padding: "8px 18px",
                borderRadius: "6px",
                cursor: "pointer",
                fontWeight: "bold"
              }}
            >
              Reload Application
            </button>
            <button
              onClick={this.handleResetState}
              style={{
                background: "#334155",
                color: "#f87171",
                border: "1px solid #475569",
                padding: "8px 18px",
                borderRadius: "6px",
                cursor: "pointer"
              }}
            >
              Reset Cached Session
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
