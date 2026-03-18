import { createUserAction, logoutAction } from "@/app/actions";
import { getCurrentUser } from "@/lib/current-user";
import { listUsers } from "@/lib/users";
import styles from "@/app/ui.module.css";

export const dynamic = "force-dynamic";

export default async function UsersPage(props: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const current = await getCurrentUser();
  if (!current || current.role !== "OWNER") {
    return (
      <div className={styles.shell}>
        <div className={styles.container}>
          <header className={styles.header}>
            <div className={styles.brand}>
              <div className={styles.brandMark} />
              <div className={styles.brandText}>
                <div className={styles.title}>Admin</div>
                <div className={styles.subtitle}>Access denied</div>
              </div>
            </div>
          </header>
        </div>
      </div>
    );
  }

  const error = props.searchParams.error === "1";
  const users = await listUsers();

  return (
    <div className={styles.shell}>
      <div className={styles.container}>
        <header className={styles.header}>
          <div className={styles.brand}>
            <div className={styles.brandMark} />
            <div className={styles.brandText}>
              <div className={styles.title}>Users</div>
              <div className={styles.subtitle}>Manage team access</div>
            </div>
          </div>
          <div className={styles.buttonRow}>
            <form action={logoutAction}>
              <button className={styles.buttonSecondary} type="submit">
                Lock
              </button>
            </form>
          </div>
        </header>

        {error ? <div className={styles.notice}>Invalid input</div> : null}

        <div className={styles.grid}>
          <section className={styles.card}>
            <div className={styles.cardTitle}>Create User</div>
            <form action={createUserAction} className={styles.form}>
              <label className={styles.label}>
                Username
                <input className={styles.input} name="username" required />
              </label>
              <label className={styles.label}>
                Password
                <input className={styles.input} name="password" type="password" required />
              </label>
              <label className={styles.label}>
                Role
                <select className={styles.select} name="role" defaultValue="AGENT">
                  <option value="OWNER">OWNER</option>
                  <option value="AGENT">AGENT</option>
                  <option value="VIEWER">VIEWER</option>
                </select>
              </label>
              <div className={styles.buttonRow}>
                <button className={styles.button} type="submit">
                  Create
                </button>
              </div>
            </form>
          </section>

          <section className={styles.card}>
            <div className={styles.cardTitle}>Users</div>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.th}>Username</th>
                  <th className={styles.th}>Role</th>
                  <th className={styles.th}>Active</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className={styles.tr}>
                    <td className={styles.td}>{u.username}</td>
                    <td className={styles.td}>
                      <span className={styles.pill}>{u.role}</span>
                    </td>
                    <td className={styles.td}>{u.is_active ? "Yes" : "No"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>
      </div>
    </div>
  );
}

