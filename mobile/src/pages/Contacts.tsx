import { useAuthStore } from "../auth/store";
import { useElder } from "../api/queries";

export default function Contacts() {
  const elderId = useAuthStore((s) => s.elderId ?? "");
  const { data: elder, isLoading } = useElder(elderId);

  if (isLoading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: 48 }}>
        <div className="spinner spinner-dark" />
      </div>
    );
  }

  const emergencyContacts = elder?.emergencyContacts ?? [];
  const careCircle = elder?.careCircle ?? [];

  return (
    <div style={{ padding: "16px" }}>
      <h2
        style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 20,
          fontWeight: 700,
          color: "var(--text-primary)",
          marginBottom: 16,
        }}
      >
        Care Circle
      </h2>

      {/* Emergency contacts */}
      {emergencyContacts.length > 0 && (
        <>
          <h3
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: "var(--text-secondary)",
              textTransform: "uppercase",
              letterSpacing: 0.5,
              marginBottom: 10,
            }}
          >
            Emergency Contacts
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
            {emergencyContacts.map((c, i) => (
              <ContactCard
                key={i}
                name={c.name}
                subtitle={`${c.relationship} · Priority ${c.priority}`}
                phone={c.phone}
                highlight={c.priority === 1}
              />
            ))}
          </div>
        </>
      )}

      {/* Care circle members */}
      {careCircle.length > 0 && (
        <>
          <h3
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: "var(--text-secondary)",
              textTransform: "uppercase",
              letterSpacing: 0.5,
              marginBottom: 10,
            }}
          >
            Care Team
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {careCircle.map((m) => (
              <ContactCard
                key={m.id}
                name={m.user?.displayName ?? m.userId}
                subtitle={`${m.relationship.replace(/_/g, " ")} · ${m.permissionLevel}`}
                phone={undefined}
                highlight={false}
              />
            ))}
          </div>
        </>
      )}

      {emergencyContacts.length === 0 && careCircle.length === 0 && (
        <div style={{ textAlign: "center", padding: 40, color: "var(--text-secondary)" }}>
          No contacts found.
        </div>
      )}
    </div>
  );
}

function ContactCard({
  name,
  subtitle,
  phone,
  highlight,
}: {
  name: string;
  subtitle: string;
  phone: string | undefined;
  highlight: boolean;
}) {
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 14,
        padding: "16px",
        boxShadow: "var(--shadow-sm)",
        border: highlight ? "2px solid var(--primary)" : "1px solid #e5e7eb",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
      }}
    >
      <div style={{ flex: 1 }}>
        <div
          style={{
            fontSize: 16,
            fontWeight: 700,
            color: "var(--text-primary)",
            marginBottom: 2,
          }}
        >
          {name}
        </div>
        <div style={{ fontSize: 13, color: "var(--text-secondary)", textTransform: "capitalize" }}>
          {subtitle}
        </div>
      </div>

      {phone && (
        <a
          href={`tel:${phone}`}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 48,
            height: 48,
            background: "var(--primary)",
            borderRadius: "50%",
            color: "#fff",
            flexShrink: 0,
          }}
          aria-label={`Call ${name}`}
        >
          <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
        </a>
      )}
    </div>
  );
}
