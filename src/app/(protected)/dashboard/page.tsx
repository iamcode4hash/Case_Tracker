import Link from "next/link";

import { logoutAction } from "@/app/actions";
import { getCurrentUser } from "@/lib/current-user";
import { db, ensureSchema } from "@/lib/db";
import styles from "@/app/ui.module.css";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const current = await getCurrentUser();

  await ensureSchema();
  const sql = db();

  const [
    totalRows,
    byStatusRows,
    byPriorityRows,
    starredRows,
    todayCreatedRows,
    recentAuditRows,
  ] = await Promise.all([
    sql<Array<{ count: string }>>`SELECT COUNT(*)::text AS count FROM cases;`,
    sql<Array<{ status: string; count: string }>>`
      SELECT status, COUNT(*)::text AS count
      FROM cases
      GROUP BY status
      ORDER BY status;
    `,
    sql<Array<{ priority: string; count: string }>>`
      SELECT priority, COUNT(*)::text AS count
      FROM cases
      GROUP BY priority
      ORDER BY priority;
    `,
    sql<Array<{ count: string }>>`SELECT COUNT(*)::text AS count FROM cases WHERE starred = TRUE;`,
    sql<Array<{ count: string }>>`
      SELECT COUNT(*)::text AS count
      FROM cases
      WHERE created_at >= date_trunc('day', NOW());
    `,
    sql<
      Array<{ id: number; case_id: string; actor: string; action: string; created_at: string }>
    >`
      SELECT id, case_id, actor, action, created_at
      FROM case_audits
      ORDER BY created_at DESC
      LIMIT 25;
    `,
  ]);

  const total = Number(totalRows[0]?.count ?? "0");
  const starred = Number(starredRows[0]?.count ?? "0");
  const todayCreated = Number(todayCreatedRows[0]?.count ?? "0");

  const byStatus: Record<string, number> = {};
  for (const r of byStatusRows) byStatus[r.status] = Number(r.count);

  const byPriority: Record<string, number> = {};
  for (const r of byPriorityRows) byPriority[r.priority] = Number(r.count);

  const dtf = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" });
  const isOwner = current?.role === "OWNER";

  return (
    <div className={styles.shell}>
      <div className={styles.container}>
        <header className={styles.header}>
          <div className={styles.brand}>
            <div className={styles.brandMark} />
            <div className={styles.brandText}>
              <div className={styles.title}>Dashboard</div>
              <div className={styles.subtitle}>Overview and recent activity</div>
            </div>
          </div>
          <div className={styles.buttonRow}>
            <Link className={styles.link} href="/dashboard">
              Dashboard
            </Link>
            {isOwner ? (
              <>
                <Link className={styles.link} href="/admin/users">
                  Users
                </Link>
                <Link className={styles.link} href="/admin/categories">
                  Categories
                </Link>
              </>
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

        <div className={styles.statGrid}>
          <section className={styles.card}>
            <div className={styles.statLabel}>Total Cases</div>
            <div className={styles.statValue}>{total}</div>
            <div className={styles.statSub}>All time</div>
          </section>
          <section className={styles.card}>
            <div className={styles.statLabel}>Open</div>
            <div className={styles.statValue}>{byStatus.OPEN ?? 0}</div>
            <div className={styles.statSub}>Needs attention</div>
          </section>
          <section className={styles.card}>
            <div className={styles.statLabel}>Pending</div>
            <div className={styles.statValue}>{byStatus.PENDING ?? 0}</div>
            <div className={styles.statSub}>In progress</div>
          </section>
          <section className={styles.card}>
            <div className={styles.statLabel}>Resolved</div>
            <div className={styles.statValue}>{byStatus.RESOLVED ?? 0}</div>
            <div className={styles.statSub}>Completed</div>
          </section>
        </div>

        <div style={{ height: 14 }} />

        <div className={styles.grid}>
          <section className={styles.card}>
            <div className={styles.cardTitle}>Highlights</div>
            <table className={styles.table}>
              <tbody>
                <tr>
                  <td className={styles.td}>Starred</td>
                  <td className={styles.td}>
                    <span className={styles.pill}>{starred}</span>
                  </td>
                </tr>
                <tr>
                  <td className={styles.td}>Created today</td>
                  <td className={styles.td}>
                    <span className={styles.pill}>{todayCreated}</span>
                  </td>
                </tr>
                <tr>
                  <td className={styles.td}>Urgent</td>
                  <td className={styles.td}>
                    <span className={`${styles.pill} ${styles.pillRed}`}>{byPriority.URGENT ?? 0}</span>
                  </td>
                </tr>
                <tr>
                  <td className={styles.td}>High</td>
                  <td className={styles.td}>
                    <span className={`${styles.pill} ${styles.pillYellow}`}>{byPriority.HIGH ?? 0}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </section>

          <section className={styles.card}>
            <div className={styles.cardTitle}>Recent Activity</div>
            {recentAuditRows.length ? (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th className={styles.th}>Time</th>
                    <th className={styles.th}>Actor</th>
                    <th className={styles.th}>Action</th>
                    <th className={styles.th}>Case</th>
                  </tr>
                </thead>
                <tbody>
                  {recentAuditRows.map((a) => (
                    <tr key={a.id} className={styles.tr}>
                      <td className={styles.td}>{dtf.format(new Date(a.created_at))}</td>
                      <td className={styles.td}>{a.actor}</td>
                      <td className={styles.td}>{a.action}</td>
                      <td className={styles.td}>
                        <Link className={`${styles.link} ${styles.mono}`} href={`/case/${encodeURIComponent(a.case_id)}`}>
                          {a.case_id}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className={styles.hint}>No activity yet</div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
