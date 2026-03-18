import Link from "next/link";

import { addNoteAction, logoutAction, updateCaseMetaAction } from "@/app/actions";
import { getCaseById, listNotes } from "@/lib/cases";
import styles from "@/app/ui.module.css";

export const dynamic = "force-dynamic";

function statusPillClass(status: string) {
  if (status === "OPEN") return `${styles.pill} ${styles.pillBlue}`;
  if (status === "PENDING") return `${styles.pill} ${styles.pillYellow}`;
  if (status === "RESOLVED") return `${styles.pill} ${styles.pillGreen}`;
  return styles.pill;
}

function priorityPillClass(priority: string) {
  if (priority === "URGENT") return `${styles.pill} ${styles.pillRed}`;
  if (priority === "HIGH") return `${styles.pill} ${styles.pillYellow}`;
  if (priority === "LOW") return `${styles.pill} ${styles.pillBlue}`;
  return styles.pill;
}

export default async function CasePage(props: {
  params: { caseId: string } | Promise<{ caseId: string }>;
  searchParams:
    | Record<string, string | string[] | undefined>
    | Promise<Record<string, string | string[] | undefined>>;
}) {
  const { caseId: rawCaseId } = await props.params;
  const searchParams = await props.searchParams;

  const caseId = decodeURIComponent(rawCaseId).trim().toUpperCase();
  const created = searchParams.created === "1";

  const row = await getCaseById(caseId);

  if (!row) {
    return (
      <div className={styles.shell}>
        <div className={styles.container}>
          <header className={styles.header}>
            <div className={styles.brand}>
              <div className={styles.brandMark} />
              <div className={styles.brandText}>
                <div className={styles.title}>Case Not Found</div>
                <div className={styles.subtitle}>
                  No case found for: <span className={styles.mono}>{caseId}</span>
                </div>
              </div>
            </div>
            <Link className={styles.link} href="/">
              Home
            </Link>
          </header>
        </div>
      </div>
    );
  }

  const notes = await listNotes(caseId);

  const dtf = new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const hasPassword = Boolean(process.env.APP_PASSWORD);

  return (
    <div className={styles.shell}>
      <div className={styles.container}>
        <header className={styles.header}>
          <div className={styles.brand}>
            <div className={styles.brandMark} />
            <div className={styles.brandText}>
              <div className={styles.title}>
                Case <span className={styles.mono}>{row.case_id}</span>
              </div>
              <div className={styles.subtitle}>
                Created {dtf.format(new Date(row.created_at))}
              </div>
            </div>
          </div>
          <div className={styles.buttonRow}>
            {hasPassword ? (
              <form action={logoutAction}>
                <button className={styles.buttonSecondary} type="submit">
                  Lock
                </button>
              </form>
            ) : null}
            <Link className={styles.link} href="/">
              Back
            </Link>
          </div>
        </header>

        {created ? (
          <div className={styles.notice}>
            Case created. Give this Case ID to the customer/member:{" "}
            <span className={styles.mono}>{row.case_id}</span>
          </div>
        ) : null}

        <div className={styles.split}>
          <section className={styles.card}>
            <div className={styles.cardTitle}>Details</div>
            <table className={styles.table}>
              <tbody>
                <tr>
                  <td className={styles.td}>Status</td>
                  <td className={styles.td}>
                    <span className={statusPillClass(row.status)}>{row.status}</span>
                  </td>
                </tr>
                <tr>
                  <td className={styles.td}>Priority</td>
                  <td className={styles.td}>
                    <span className={priorityPillClass(row.priority)}>{row.priority}</span>
                  </td>
                </tr>
                <tr>
                  <td className={styles.td}>Category</td>
                  <td className={styles.td}>
                    <span className={styles.pill}>{row.category}</span>
                  </td>
                </tr>
                <tr>
                  <td className={styles.td}>Subject</td>
                  <td className={styles.td}>{row.subject}</td>
                </tr>
                <tr>
                  <td className={styles.td}>Member Name</td>
                  <td className={styles.td}>{row.member_name ?? "-"}</td>
                </tr>
                <tr>
                  <td className={styles.td}>Contact</td>
                  <td className={styles.td}>{row.member_contact ?? "-"}</td>
                </tr>
                <tr>
                  <td className={styles.td}>Updated</td>
                  <td className={styles.td}>
                    {dtf.format(new Date(row.updated_at))}
                  </td>
                </tr>
              </tbody>
            </table>

            <div style={{ height: 14 }} />

            <div className={styles.cardTitle}>Update</div>
            <form className={styles.form} action={updateCaseMetaAction}>
              <input type="hidden" name="caseId" value={row.case_id} />
              <div className={styles.row2}>
                <label className={styles.label}>
                  Status
                  <select
                    className={styles.select}
                    name="status"
                    defaultValue={row.status}
                  >
                    <option value="OPEN">OPEN</option>
                    <option value="PENDING">PENDING</option>
                    <option value="RESOLVED">RESOLVED</option>
                  </select>
                </label>
                <label className={styles.label}>
                  Priority
                  <select
                    className={styles.select}
                    name="priority"
                    defaultValue={row.priority}
                  >
                    <option value="LOW">LOW</option>
                    <option value="NORMAL">NORMAL</option>
                    <option value="HIGH">HIGH</option>
                    <option value="URGENT">URGENT</option>
                  </select>
                </label>
              </div>

              <label className={styles.label}>
                Category
                <select
                  className={styles.select}
                  name="category"
                  defaultValue={row.category}
                >
                  <option value="GENERAL">GENERAL</option>
                  <option value="BILLING">BILLING</option>
                  <option value="TECHNICAL">TECHNICAL</option>
                  <option value="ACCOUNT">ACCOUNT</option>
                  <option value="OTHER">OTHER</option>
                </select>
              </label>
              <div className={styles.buttonRow}>
                <button className={styles.buttonSecondary} type="submit">
                  Save
                </button>
              </div>
            </form>
          </section>

          <section className={styles.card}>
            <div className={styles.cardTitle}>Notes</div>
            <form className={styles.form} action={addNoteAction}>
              <input type="hidden" name="caseId" value={row.case_id} />
              <label className={styles.label}>
                Add Note
                <textarea
                  className={styles.textarea}
                  name="note"
                  required
                  placeholder="New update / follow-up note"
                />
              </label>
              <div className={styles.buttonRow}>
                <button className={styles.button} type="submit">
                  Add
                </button>
              </div>
            </form>

            <div style={{ height: 12 }} />

            {notes.length ? (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th className={styles.th}>Time</th>
                    <th className={styles.th}>Note</th>
                  </tr>
                </thead>
                <tbody>
                  {notes.map((n) => (
                    <tr key={n.id} className={styles.tr}>
                      <td className={styles.td}>
                        {dtf.format(new Date(n.created_at))}
                      </td>
                      <td className={styles.td}>{n.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className={styles.hint}>No notes yet</div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
