import Link from "next/link";

import { createCaseAction, goToCaseAction, logoutAction } from "@/app/actions";
import {
  listCases,
  type CaseCategory,
  type CasePriority,
  type CaseStatus,
} from "@/lib/cases";
import styles from "@/app/ui.module.css";

export const dynamic = "force-dynamic";

function parseStatus(value: string | undefined): CaseStatus | "ALL" {
  const v = (value ?? "").trim().toUpperCase();
  if (v === "OPEN" || v === "PENDING" || v === "RESOLVED") return v;
  return "ALL";
}

function parseCategory(value: string | undefined): CaseCategory | "ALL" {
  const v = (value ?? "").trim().toUpperCase();
  if (v === "GENERAL" || v === "BILLING" || v === "TECHNICAL" || v === "ACCOUNT" || v === "OTHER") {
    return v;
  }
  return "ALL";
}

function parsePriority(value: string | undefined): CasePriority | "ALL" {
  const v = (value ?? "").trim().toUpperCase();
  if (v === "LOW" || v === "NORMAL" || v === "HIGH" || v === "URGENT") return v;
  return "ALL";
}

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

export default async function Home(props: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const q = typeof props.searchParams.q === "string" ? props.searchParams.q : "";
  const status = parseStatus(typeof props.searchParams.status === "string" ? props.searchParams.status : undefined);
  const category = parseCategory(
    typeof props.searchParams.category === "string" ? props.searchParams.category : undefined,
  );
  const priority = parsePriority(
    typeof props.searchParams.priority === "string" ? props.searchParams.priority : undefined,
  );

  let cases: Awaited<ReturnType<typeof listCases>> = [];
  let dbError: string | null = null;

  try {
    cases = await listCases({
      limit: 50,
      q,
      status,
      category,
      priority,
    });
  } catch (e) {
    dbError = e instanceof Error ? e.message : "Database error";
  }

  const hasPassword = Boolean(process.env.APP_PASSWORD);

  return (
    <div className={styles.shell}>
      <div className={styles.container}>
        <header className={styles.header}>
          <div className={styles.brand}>
            <div className={styles.brandMark} />
            <div className={styles.brandText}>
              <div className={styles.title}>Case Tracker</div>
              <div className={styles.subtitle}>
                Create a case, share the Case ID, and track updates in one place
              </div>
            </div>
          </div>
          {hasPassword ? (
            <form action={logoutAction}>
              <button className={styles.buttonSecondary} type="submit">
                Lock
              </button>
            </form>
          ) : (
            <span className={`${styles.pill} ${styles.pillYellow}`}>Public</span>
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

              <div className={styles.row2}>
                <label className={styles.label}>
                  Category
                  <select className={styles.select} name="category" defaultValue="GENERAL">
                    <option value="GENERAL">GENERAL</option>
                    <option value="BILLING">BILLING</option>
                    <option value="TECHNICAL">TECHNICAL</option>
                    <option value="ACCOUNT">ACCOUNT</option>
                    <option value="OTHER">OTHER</option>
                  </select>
                </label>
                <label className={styles.label}>
                  Priority
                  <select className={styles.select} name="priority" defaultValue="NORMAL">
                    <option value="LOW">LOW</option>
                    <option value="NORMAL">NORMAL</option>
                    <option value="HIGH">HIGH</option>
                    <option value="URGENT">URGENT</option>
                  </select>
                </label>
              </div>

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
            <div className={styles.cardTitle}>Find & Filter</div>
            <form action={goToCaseAction} className={styles.form}>
              <label className={styles.label}>
                Open Case by ID
                <input
                  className={styles.input}
                  name="caseId"
                  placeholder="CS-20260318-1A2B3C"
                />
              </label>
              <div className={styles.buttonRow}>
                <button className={styles.buttonSecondary} type="submit">
                  Open
                </button>
              </div>
            </form>

            <div style={{ height: 10 }} />

            <form className={styles.form} method="get">
              <label className={styles.label}>
                Search (Case ID / Subject / Member / Contact)
                <input
                  className={styles.input}
                  name="q"
                  defaultValue={q}
                  placeholder="Type keywords..."
                />
              </label>

              <div className={styles.row2}>
                <label className={styles.label}>
                  Status
                  <select className={styles.select} name="status" defaultValue={status}>
                    <option value="ALL">ALL</option>
                    <option value="OPEN">OPEN</option>
                    <option value="PENDING">PENDING</option>
                    <option value="RESOLVED">RESOLVED</option>
                  </select>
                </label>
                <label className={styles.label}>
                  Category
                  <select className={styles.select} name="category" defaultValue={category}>
                    <option value="ALL">ALL</option>
                    <option value="GENERAL">GENERAL</option>
                    <option value="BILLING">BILLING</option>
                    <option value="TECHNICAL">TECHNICAL</option>
                    <option value="ACCOUNT">ACCOUNT</option>
                    <option value="OTHER">OTHER</option>
                  </select>
                </label>
              </div>

              <label className={styles.label}>
                Priority
                <select className={styles.select} name="priority" defaultValue={priority}>
                  <option value="ALL">ALL</option>
                  <option value="LOW">LOW</option>
                  <option value="NORMAL">NORMAL</option>
                  <option value="HIGH">HIGH</option>
                  <option value="URGENT">URGENT</option>
                </select>
              </label>

              <div className={styles.buttonRow}>
                <button className={styles.buttonSecondary} type="submit">
                  Apply
                </button>
                <Link className={styles.link} href="/">
                  Reset
                </Link>
              </div>
            </form>

            <div style={{ height: 14 }} />

            <div className={styles.cardTitle}>Cases</div>
            {cases.length ? (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th className={styles.th}>Case</th>
                    <th className={styles.th}>Status</th>
                    <th className={styles.th}>Priority</th>
                    <th className={styles.th}>Category</th>
                    <th className={styles.th}>Subject</th>
                  </tr>
                </thead>
                <tbody>
                  {cases.map((c) => (
                    <tr key={c.case_id} className={styles.tr}>
                      <td className={styles.td}>
                        <Link
                          className={`${styles.link} ${styles.mono}`}
                          href={`/case/${encodeURIComponent(c.case_id)}`}
                        >
                          {c.case_id}
                        </Link>
                      </td>
                      <td className={styles.td}>
                        <span className={statusPillClass(c.status)}>{c.status}</span>
                      </td>
                      <td className={styles.td}>
                        <span className={priorityPillClass(c.priority)}>{c.priority}</span>
                      </td>
                      <td className={styles.td}>
                        <span className={styles.pill}>{c.category}</span>
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
