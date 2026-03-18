import Link from "next/link";

import {
  createCategoryAction,
  deleteCategoryAction,
  logoutAction,
  toggleCategoryActiveAction,
  updateCategoryAction,
} from "@/app/actions";
import { getCurrentUser } from "@/lib/current-user";
import { listCategories } from "@/lib/categories";
import styles from "@/app/ui.module.css";

export const dynamic = "force-dynamic";

export default async function CategoriesPage(props: {
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
  const categories = await listCategories({ includeInactive: true });

  return (
    <div className={styles.shell}>
      <div className={styles.container}>
        <header className={styles.header}>
          <div className={styles.brand}>
            <div className={styles.brandMark} />
            <div className={styles.brandText}>
              <div className={styles.title}>Categories</div>
              <div className={styles.subtitle}>Create, rename, disable, delete</div>
            </div>
          </div>
          <div className={styles.buttonRow}>
            <Link className={styles.link} href="/dashboard">
              Dashboard
            </Link>
            <Link className={styles.link} href="/admin/users">
              Users
            </Link>
            <Link className={styles.link} href="/">
              Cases
            </Link>
            <form action={logoutAction}>
              <button className={styles.buttonSecondary} type="submit">
                Lock
              </button>
            </form>
          </div>
        </header>

        {error ? (
          <div className={styles.notice}>
            Action failed. If you tried to delete a category, make sure it has no cases.
          </div>
        ) : null}

        <div className={styles.grid}>
          <section className={styles.card}>
            <div className={styles.cardTitle}>Create Category</div>
            <form action={createCategoryAction} className={styles.form}>
              <label className={styles.label}>
                Label
                <input className={styles.input} name="label" placeholder="e.g. Delivery" required />
              </label>
              <label className={styles.label}>
                Slug (optional)
                <input className={styles.input} name="slug" placeholder="e.g. DELIVERY" />
              </label>
              <label className={styles.label}>
                Sort order (optional)
                <input className={styles.input} name="sortOrder" type="number" />
              </label>
              <div className={styles.buttonRow}>
                <button className={styles.button} type="submit">
                  Create
                </button>
              </div>
            </form>
          </section>

          <section className={styles.card}>
            <div className={styles.cardTitle}>Categories</div>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.th}>Label</th>
                  <th className={styles.th}>Slug</th>
                  <th className={styles.th}>Active</th>
                  <th className={styles.th}>Sort</th>
                  <th className={styles.th}>Manage</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((c) => (
                  <tr key={c.id} className={styles.tr}>
                    <td className={styles.td}>{c.label}</td>
                    <td className={styles.td}>
                      <span className={styles.mono}>{c.slug}</span>
                    </td>
                    <td className={styles.td}>{c.is_active ? "Yes" : "No"}</td>
                    <td className={styles.td}>{c.sort_order}</td>
                    <td className={styles.td}>
                      <div className={styles.cellActions}>
                        <form action={updateCategoryAction} className={styles.cellActionsRow}>
                          <input type="hidden" name="id" value={c.id} />
                          <input className={styles.inputSmall} name="label" defaultValue={c.label} />
                          <button className={styles.buttonTiny} type="submit">
                            Rename
                          </button>
                        </form>

                        <form action={updateCategoryAction} className={styles.cellActionsRow}>
                          <input type="hidden" name="id" value={c.id} />
                          <input className={styles.inputSmall} name="slug" defaultValue={c.slug} />
                          <button className={styles.buttonTiny} type="submit">
                            Update slug
                          </button>
                        </form>

                        <form action={updateCategoryAction} className={styles.cellActionsRow}>
                          <input type="hidden" name="id" value={c.id} />
                          <input className={styles.inputSmall} name="sortOrder" defaultValue={String(c.sort_order)} />
                          <button className={styles.buttonTiny} type="submit">
                            Update sort
                          </button>
                        </form>

                        <form action={toggleCategoryActiveAction}>
                          <input type="hidden" name="id" value={c.id} />
                          <input type="hidden" name="isActive" value={c.is_active ? "0" : "1"} />
                          <button className={styles.buttonTiny} type="submit">
                            {c.is_active ? "Disable" : "Enable"}
                          </button>
                        </form>

                        <form action={deleteCategoryAction}>
                          <input type="hidden" name="id" value={c.id} />
                          <button className={styles.buttonDanger} type="submit">
                            Delete
                          </button>
                        </form>
                      </div>
                    </td>
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

