import Link from "next/link";

import { addNoteAction, logoutAction, updateStatusAction } from "@/app/actions";
import { getCaseById, listNotes } from "@/lib/cases";
import styles from "@/app/ui.module.css";

export const dynamic = "force-dynamic";

export default async function CasePage(props: {
  params: { caseId: string };
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const { caseId: rawCaseId } = props.params;
  const searchParams = props.searchParams;

  const caseId = decodeURIComponent(rawCaseId).trim().toUpperCase();
  const created = searchParams.created === "1";

  const row = await getCaseById(caseId);

  if (!row) {
    return (
      <div className={styles.shell}>
        <div className={styles.container}>
          <header className={styles.header}>
            <div>
              <div className={styles.title}>Case Not Found</div>
              <div className={styles.subtitle}>
                এই কেস আইডি পাওয়া যায়নি:{" "}
                <span className={styles.mono}>{caseId}</span>
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
          <div>
            <div className={styles.title}>
              Case: <span className={styles.mono}>{row.case_id}</span>
            </div>
            <div className={styles.subtitle}>
              Created: {dtf.format(new Date(row.created_at))}
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
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
            কেস তৈরি হয়েছে। এই কেস আইডি কাস্টমার/মেম্বারকে দিন:{" "}
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
                    <span className={styles.pill}>{row.status}</span>
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

            <div className={styles.cardTitle}>Update Status</div>
            <form className={styles.form} action={updateStatusAction}>
              <input type="hidden" name="caseId" value={row.case_id} />
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
                  placeholder="নতুন আপডেট/ফলোআপ নোট"
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
                    <tr key={n.id}>
                      <td className={styles.td}>
                        {dtf.format(new Date(n.created_at))}
                      </td>
                      <td className={styles.td}>{n.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className={styles.hint}>এখনও কোনো নোট নেই</div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

