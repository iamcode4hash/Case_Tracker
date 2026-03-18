import Link from "next/link";

import { unlockAction } from "@/app/actions";
import styles from "@/app/ui.module.css";

export default function UnlockPage(props: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const error = props.searchParams.error === "1";

  return (
    <div className={styles.shell}>
      <div className={styles.container}>
        <header className={styles.header}>
          <div>
            <div className={styles.title}>Case Tracker</div>
            <div className={styles.subtitle}>Access required</div>
          </div>
          <Link className={styles.link} href="https://vercel.com">
            Vercel
          </Link>
        </header>

        {error ? (
          <div className={styles.notice}>Wrong password</div>
        ) : null}

        <section className={styles.card} style={{ maxWidth: 520 }}>
          <div className={styles.cardTitle}>Unlock</div>
          <form action={unlockAction} className={styles.form}>
            <label className={styles.label}>
              Password
              <input
                className={styles.input}
                name="password"
                type="password"
                autoFocus
                required
              />
            </label>
            <div className={styles.buttonRow}>
              <button className={styles.button} type="submit">
                Enter
              </button>
              <div className={styles.hint}>
                This screen appears when <span className={styles.mono}>APP_PASSWORD</span> is set in your environment variables
              </div>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
