import { loginAction } from "@/app/actions";
import styles from "@/app/ui.module.css";

export default function LoginPage(props: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const error = props.searchParams.error === "1";

  return (
    <div className={styles.shell}>
      <div className={styles.container}>
        <header className={styles.header}>
          <div className={styles.brand}>
            <div className={styles.brandMark} />
            <div className={styles.brandText}>
              <div className={styles.title}>Case Tracker</div>
              <div className={styles.subtitle}>Sign in</div>
            </div>
          </div>
          <span className={`${styles.pill} ${styles.pillYellow}`}>Protected</span>
        </header>

        {error ? <div className={styles.notice}>Invalid username or password</div> : null}

        <div className={styles.center}>
          <section className={styles.card} style={{ maxWidth: 520, width: "100%" }}>
            <div className={styles.cardTitle}>Login</div>
            <form action={loginAction} className={styles.form}>
              <label className={styles.label}>
                Username
                <input className={styles.input} name="username" autoFocus required />
              </label>
              <label className={styles.label}>
                Password
                <input className={styles.input} name="password" type="password" required />
              </label>
              <div className={styles.buttonRow}>
                <button className={styles.button} type="submit">
                  Sign in
                </button>
              </div>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}

