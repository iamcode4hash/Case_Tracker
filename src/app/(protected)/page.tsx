import Link from "next/link";

import { createCaseAction, goToCaseAction, logoutAction } from "@/app/actions";
import { listRecentCases } from "@/lib/cases";
import styles from "@/app/ui.module.css";

export const dynamic = "force-dynamic";

export default async function Home() {
  let recentCases: Awaited<ReturnType<typeof listRecentCases>> = [];
  let dbError: string | null = null;

  try {
    recentCases = await listRecentCases(20);
  } catch (e) {
    dbError = e instanceof Error ? e.message : "Database error";
  }

  const hasPassword = Boolean(process.env.APP_PASSWORD);

  return (
    <div className={styles.shell}>
      <div className={styles.container}>
        <header className={styles.header}>
          <div>
            <div className={styles.title}>Case Tracker</div>
            <div className={styles.subtitle}>
              Write a note to generate a Case ID, then use the Case ID to track it later
            </div>
          </div>
          {hasPassword ? (
            <form action={logoutAction}>
              <button className={styles.buttonSecondary} type="submit">
                Lock
              </button>
            </form>
          ) : (
            <div className={styles.subtitle}>Vercel-ready</div>
          )}
        </header>

        {dbError ? (
          <div className={styles.notice}>
            Database is not set or cannot connect:{" "}
            <span className={styles.mono}>{dbError}</span>
          </div>
        ) : null}

        <div className={styles.grid}>
          <section className={styles.card}>
            <div className={styles.cardTitle}>Create New Case</div>
            <form action={createCaseAction} className={styles.form}>
              <div className={styles.row2}>
                <label className={styles.label}>
                  Member Name (optional)
                  <input
                    className={styles.input}
                    name="memberName"
                    placeholder="e.g. Rahim"
                  />
                </label>
                <label className={styles.label}>
                  Contact/WhatsApp (optional)
                  <input
                    className={styles.input}
                    name="memberContact"
                    placeholder="e.g. +8801XXXXXXXXX"
                  />
                </label>
              </div>

              <label className={styles.label}>
                Subject
                <input
                  className={styles.input}
                  name="subject"
                  required
                  placeholder="Complaint subject"
                />
              </label>

              <label className={styles.label}>
                Note (initial)
                <textarea
                  className={styles.textarea}
                  name="note"
                  required
                  placeholder="Complaint details / your notes"
                />
              </label>

              <div className={styles.buttonRow}>
                <button className={styles.button} type="submit">
                  Generate Case ID
                </button>
                <div className={styles.hint}>
                  After submitting, it will open the case page automatically
                </div>
              </div>
            </form>
          </section>

          <section className={styles.card}>
            <div className={styles.cardTitle}>Find by Case ID</div>
            <form action={goToCaseAction} className={styles.form}>
              <label className={styles.label}>
                Case ID
                <input
                  className={styles.input}
                  name="caseId"
                  placeholder="e.g. CS-20260318-1A2B3C"
                />
              </label>
              <div className={styles.buttonRow}>
                <button className={styles.buttonSecondary} type="submit">
                  Open Case
                </button>
                <div className={styles.hint}>
                  Give this Case ID to the customer
                </div>
              </div>
            </form>

            <div style={{ height: 14 }} />

            <div className={styles.cardTitle}>Recent Cases</div>
            {recentCases.length ? (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th className={styles.th}>Case</th>
                    <th className={styles.th}>Status</th>
                    <th className={styles.th}>Subject</th>
                  </tr>
                </thead>
                <tbody>
                  {recentCases.map((c) => (
                    <tr key={c.case_id}>
                      <td className={styles.td}>
                        <Link
                          className={`${styles.link} ${styles.mono}`}
                          href={`/case/${encodeURIComponent(c.case_id)}`}
                        >
                          {c.case_id}
                        </Link>
                      </td>
                      <td className={styles.td}>
                        <span className={styles.pill}>{c.status}</span>
                      </td>
                      <td className={styles.td}>{c.subject}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className={styles.hint}>
                {dbError
                  ? "Once the database is set up, recent cases will show here"
                  : "No cases yet"}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
