"use client";

import { useEffect } from "react";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log to your error reporting service here
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          backgroundColor: "#0a0e27",
          color: "#f0f0f0",
          fontFamily: "system-ui, sans-serif",
          display: "flex",
          minHeight: "100dvh",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ textAlign: "center", maxWidth: "480px", padding: "2rem" }}>
          <p
            style={{
              fontSize: "0.75rem",
              letterSpacing: "0.15em",
              color: "#ef4444",
              textTransform: "uppercase",
              marginBottom: "1rem",
            }}
          >
            System Error
          </p>
          <h1
            style={{
              fontSize: "1.5rem",
              fontWeight: 700,
              color: "#f0f0f0",
              marginBottom: "0.75rem",
            }}
          >
            Something went wrong
          </h1>
          <p
            style={{
              fontSize: "0.875rem",
              color: "#a0a0a0",
              marginBottom: "2rem",
              lineHeight: 1.6,
            }}
          >
            {error.message || "An unexpected error occurred."}
            {error.digest && (
              <span style={{ display: "block", marginTop: "0.5rem", fontFamily: "monospace", fontSize: "0.75rem" }}>
                ID: {error.digest}
              </span>
            )}
          </p>
          <button
            onClick={reset}
            style={{
              padding: "0.625rem 1.5rem",
              backgroundColor: "transparent",
              border: "1px solid #00d9ff",
              borderRadius: "0.375rem",
              color: "#00d9ff",
              fontSize: "0.875rem",
              cursor: "pointer",
              transition: "background-color 0.2s",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = "rgba(0, 217, 255, 0.1)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = "transparent")
            }
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
