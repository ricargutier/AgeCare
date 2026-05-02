import { useElders, useAuditLog } from "../api/queries";
import type { Elder } from "../../../shared/contracts/types";

export function AdminPanel() {
  const eldersQuery = useElders();
  const auditQuery = useAuditLog();

  return (
    <div className="page-wrapper">
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 28, marginBottom: 6 }}>Admin Panel</h1>
        <p style={{ color: "var(--text-secondary)" }}>System administration overview.</p>
      </div>

      {/* Elders table */}
      <section aria-labelledby="elders-heading" style={{ marginBottom: 32 }}>
        <h2 id="elders-heading" style={{ fontSize: 20, marginBottom: 16 }}>
          All Elders
        </h2>
        {eldersQuery.isLoading ? (
          <div className="loading-state">
            <div className="spinner spinner-dark" />
          </div>
        ) : eldersQuery.isError ? (
          <div className="error-state">Failed to load elders.</div>
        ) : !eldersQuery.data || eldersQuery.data.length === 0 ? (
          <div className="empty-state">
            <h3>No elders found</h3>
          </div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: "auto" }}>
            <table className="table" aria-label="Elders list">
              <thead>
                <tr>
                  <th scope="col">ID</th>
                  <th scope="col">User ID</th>
                  <th scope="col">Date of Birth</th>
                  <th scope="col">Conditions</th>
                  <th scope="col">Emergency Contacts</th>
                </tr>
              </thead>
              <tbody>
                {eldersQuery.data.map((elder: Elder) => (
                  <tr key={elder.id}>
                    <td style={{ fontFamily: "monospace", fontSize: 12 }}>
                      {elder.id.slice(0, 12)}…
                    </td>
                    <td style={{ fontFamily: "monospace", fontSize: 12 }}>
                      {elder.userId.slice(0, 12)}…
                    </td>
                    <td>{elder.dob}</td>
                    <td style={{ fontSize: 13 }}>
                      {elder.conditions.length > 0
                        ? elder.conditions.join(", ")
                        : "—"}
                    </td>
                    <td>{elder.emergencyContacts.length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Audit log */}
      <section aria-labelledby="audit-heading">
        <h2 id="audit-heading" style={{ fontSize: 20, marginBottom: 16 }}>
          Audit Log
        </h2>
        {auditQuery.isLoading ? (
          <div className="loading-state">
            <div className="spinner spinner-dark" />
          </div>
        ) : auditQuery.isError ? (
          <div className="error-state">Failed to load audit log.</div>
        ) : !auditQuery.data || auditQuery.data.length === 0 ? (
          <div className="empty-state">
            <h3>No audit entries</h3>
            <p>The audit log is empty.</p>
          </div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: "auto" }}>
            <table className="table" aria-label="Audit log">
              <thead>
                <tr>
                  <th scope="col">Timestamp</th>
                  <th scope="col">Actor</th>
                  <th scope="col">Action</th>
                  <th scope="col">Target Type</th>
                  <th scope="col">Target ID</th>
                </tr>
              </thead>
              <tbody>
                {auditQuery.data.map((entry) => (
                  <tr key={entry.id}>
                    <td style={{ fontSize: 12, color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
                      {new Date(entry.ts).toLocaleString()}
                    </td>
                    <td style={{ fontFamily: "monospace", fontSize: 12 }}>
                      {entry.actorUserId.slice(0, 12)}…
                    </td>
                    <td style={{ fontWeight: 600 }}>{entry.action}</td>
                    <td style={{ textTransform: "capitalize" }}>{entry.targetType}</td>
                    <td style={{ fontFamily: "monospace", fontSize: 12 }}>
                      {entry.targetId.slice(0, 12)}…
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
