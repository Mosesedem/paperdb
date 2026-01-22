/**
 * UserButton component for PaperDB React
 * Displays current user avatar with dropdown menu
 */
import React, { useState, useRef, useEffect } from "react";
import { useAuth } from "../hooks/use-auth";

export interface UserButtonProps {
  /** Custom styling */
  className?: string;
  /** Position of dropdown */
  dropdownPosition?: "bottom-left" | "bottom-right";
  /** Custom menu items */
  menuItems?: Array<{
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  }>;
  /** Custom styles */
  styles?: {
    button?: React.CSSProperties;
    avatar?: React.CSSProperties;
    dropdown?: React.CSSProperties;
    menuItem?: React.CSSProperties;
    signOutButton?: React.CSSProperties;
  };
  /** URL to redirect after sign out */
  afterSignOutUrl?: string;
}

const defaultStyles: UserButtonProps["styles"] = {
  button: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    padding: "0.25rem",
    background: "none",
    border: "none",
    cursor: "pointer",
    borderRadius: "9999px",
  },
  avatar: {
    width: "36px",
    height: "36px",
    borderRadius: "9999px",
    backgroundColor: "#e2e8f0",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "0.875rem",
    fontWeight: 500,
    color: "#64748b",
    overflow: "hidden",
  },
  dropdown: {
    position: "absolute",
    top: "100%",
    right: 0,
    marginTop: "0.5rem",
    minWidth: "200px",
    backgroundColor: "white",
    borderRadius: "0.5rem",
    boxShadow:
      "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
    border: "1px solid #e2e8f0",
    overflow: "hidden",
    zIndex: 50,
  },
  menuItem: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    width: "100%",
    padding: "0.75rem 1rem",
    fontSize: "0.875rem",
    color: "#374151",
    background: "none",
    border: "none",
    cursor: "pointer",
    textAlign: "left",
  },
  signOutButton: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    width: "100%",
    padding: "0.75rem 1rem",
    fontSize: "0.875rem",
    color: "#dc2626",
    background: "none",
    border: "none",
    borderTop: "1px solid #e2e8f0",
    cursor: "pointer",
    textAlign: "left",
  },
};

export function UserButton({
  className,
  dropdownPosition = "bottom-right",
  menuItems = [],
  styles = {},
  afterSignOutUrl,
}: UserButtonProps) {
  const { user, signOut } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const mergedStyles = {
    ...defaultStyles,
    ...styles,
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    if (afterSignOutUrl && typeof window !== "undefined") {
      window.location.href = afterSignOutUrl;
    }
  };

  if (!user) return null;

  const initials = user.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : user.email[0].toUpperCase();

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ position: "relative", display: "inline-block" }}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={mergedStyles.button}
        aria-label="User menu"
        aria-expanded={isOpen}
      >
        <div style={mergedStyles.avatar}>
          {user.avatar ? (
            <img
              src={user.avatar}
              alt={user.name || user.email}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            initials
          )}
        </div>
      </button>

      {isOpen && (
        <div
          style={{
            ...mergedStyles.dropdown,
            ...(dropdownPosition === "bottom-left"
              ? { left: 0, right: "auto" }
              : {}),
          }}
        >
          <div
            style={{
              padding: "0.75rem 1rem",
              borderBottom: "1px solid #e2e8f0",
            }}
          >
            <p style={{ fontWeight: 500, fontSize: "0.875rem", margin: 0 }}>
              {user.name || "User"}
            </p>
            <p style={{ fontSize: "0.75rem", color: "#64748b", margin: 0 }}>
              {user.email}
            </p>
          </div>

          {menuItems.map((item, index) => (
            <button
              key={index}
              onClick={() => {
                item.onClick();
                setIsOpen(false);
              }}
              style={mergedStyles.menuItem}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#f8fafc";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              {item.icon}
              {item.label}
            </button>
          ))}

          <button
            onClick={handleSignOut}
            style={mergedStyles.signOutButton}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#fef2f2";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
