export function UserMenu() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: "50%",
          background: "var(--navy-800)",
          color: "#fff",
          fontSize: 11,
          fontWeight: 700,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        AS
      </div>
      <div style={{ fontSize: 12 }}>
        <div style={{ fontWeight: 600 }}>A. Sharma</div>
        <div style={{ color: "var(--ink-faint)", fontSize: 10.5 }}>Safety Reviewer</div>
      </div>
    </div>
  );
}
