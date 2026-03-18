import Link from "next/link";

import {
  bulkUpdateAction,
  createCaseAction,
  goToCaseAction,
  logoutAction,
  quickStatusAction,
  toggleStarAction,
} from "@/app/actions";
import { getCurrentUser } from "@/lib/current-user";
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
  const current = await getCurrentUser();
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
  const dtf = new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });

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

  const isOwner = current?.role === "OWNER";

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
          <div className={styles.buttonRow}>
            <Link className={styles.link} href="/dashboard">
              Dashboard
            </Link>
            {isOwner ? (
              <Link className={styles.link} href="/admin/users">
                Admin
              </Link>
            ) : null}
            <Link className={styles.link} href="/">
              Cases
            </Link>
            {current ? <span className={styles.pill}>{current.username}</span> : null}
            <form action={logoutAction}>
              <button className={styles.buttonSecondary} type="submit">
                Lock
              </button>
            </form>
          </div>
        </header>

        {dbError ? (
          <div className={styles.notice}>
            Database is not set or cannot connect:{" "}
            <span className={styles.mono}>{dbError}</span>
          </div>
        ) : null}

        <div className={styles.gridMain}>
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

              <details className={styles.details}>
                <summary className={styles.detailsSummary}>Advanced filters</summary>
                <div className={styles.detailsBody}>
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
                </div>
              </details>

              <div className={styles.buttonRow}>
                <button className={styles.buttonSecondary} type="submit">
                  Apply
                </button>
                <Link className={styles.link} href="/">
                  Reset
                </Link>
              </div>
            </form>

            <div className={styles.hint}>
              Use filters above to narrow down results, then manage cases in the table below.
            </div>
          </section>

          <section className={`${styles.card} ${styles.fullWidth}`}>
            <div className={styles.cardHeaderRow}>
              <div className={styles.cardTitleTight}>Cases</div>
              <div className={styles.buttonRow}>
                <span className={styles.pill}>{cases.length}</span>
              </div>
            </div>

            <details className={styles.details}>
              <summary className={styles.detailsSummary}>Bulk actions</summary>
              <div className={styles.detailsBody}>
                <form id="bulkForm" action={bulkUpdateAction} className={styles.form}>
                  <div className={styles.row2}>
                    <label className={styles.label}>
                      Bulk Status
                      <select className={styles.select} name="bulkStatus" defaultValue="">
                        <option value="">No change</option>
                        <option value="OPEN">OPEN</option>
                        <option value="PENDING">PENDING</option>
                        <option value="RESOLVED">RESOLVED</option>
                      </select>
                    </label>
                    <label className={styles.label}>
                      Bulk Priority
                      <select className={styles.select} name="bulkPriority" defaultValue="">
                        <option value="">No change</option>
                        <option value="LOW">LOW</option>
                        <option value="NORMAL">NORMAL</option>
                        <option value="HIGH">HIGH</option>
                        <option value="URGENT">URGENT</option>
                      </select>
                    </label>
                  </div>
                  <label className={styles.label}>
                    Bulk Category
                    <select className={styles.select} name="bulkCategory" defaultValue="">
                      <option value="">No change</option>
                      <option value="GENERAL">GENERAL</option>
                      <option value="BILLING">BILLING</option>
                      <option value="TECHNICAL">TECHNICAL</option>
                      <option value="ACCOUNT">ACCOUNT</option>
                      <option value="OTHER">OTHER</option>
                    </select>
                  </label>
                  <div className={styles.buttonRow}>
                    <button className={styles.buttonSecondary} type="submit">
                      Apply to selected
                    </button>
                    <span className={styles.hint}>Select cases using the checkbox column</span>
                  </div>
                </form>
              </div>
            </details>

            <div className={styles.divider} />

            {cases.length ? (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th className={styles.th}></th>
                    <th className={styles.th}>Star</th>
                    <th className={styles.th}>Case</th>
                    <th className={styles.th}>Status</th>
                    <th className={styles.th}>Priority</th>
                    <th className={styles.th}>Category</th>
                    <th className={styles.th}>Subject</th>
                    <th className={styles.th}>Created</th>
                    <th className={styles.th}>Updated</th>
                    <th className={styles.th}>By</th>
                    <th className={styles.th}>Quick</th>
                  </tr>
                </thead>
                <tbody>
                  {cases.map((c) => (
                    <tr key={c.case_id} className={styles.tr}>
                      <td className={styles.td}>
                        <input type="checkbox" name="caseIds" value={c.case_id} form="bulkForm" />
                      </td>
                      <td className={styles.td}>
                        <form action={toggleStarAction}>
                          <input type="hidden" name="caseId" value={c.case_id} />
                          <input type="hidden" name="starred" value={c.starred ? "0" : "1"} />
                          <button className={styles.iconButton} type="submit" title="Star">
                            {c.starred ? "★" : "☆"}
                          </button>
                        </form>
                      </td>
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
                      <td className={styles.td}>{dtf.format(new Date(c.created_at))}</td>
                      <td className={styles.td}>{dtf.format(new Date(c.updated_at))}</td>
                      <td className={styles.td}>{c.last_actor ?? "-"}</td>
                      <td className={styles.td}>
                        <div className={styles.buttonRow}>
                          <form action={quickStatusAction}>
                            <input type="hidden" name="caseId" value={c.case_id} />
                            <input type="hidden" name="status" value="PENDING" />
                            <button className={styles.buttonTiny} type="submit">
                              Pending
                            </button>
                          </form>
                          <form action={quickStatusAction}>
                            <input type="hidden" name="caseId" value={c.case_id} />
                            <input type="hidden" name="status" value="RESOLVED" />
                            <button className={styles.buttonTiny} type="submit">
                              Resolve
                            </button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className={styles.hint}>
                {dbError ? "Once the database is set up, cases will show here" : "No cases yet"}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
