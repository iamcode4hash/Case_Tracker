"use client";

import { useState } from "react";

import styles from "@/app/ui.module.css";

export default function CreateCaseModal(props: {
  createCaseAction: (formData: FormData) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button className={styles.button} type="button" onClick={() => setOpen(true)}>
        New Case
      </button>
      {open ? (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true">
          <section className={`${styles.card} ${styles.modalCard}`}>
            <div className={styles.modalHeader}>
              <div>
                <div className={styles.cardTitleTight}>Create New Case</div>
                <div className={styles.subtitle}>Fill details and generate a Case ID</div>
              </div>
              <button className={styles.buttonSecondary} type="button" onClick={() => setOpen(false)}>
                Close
              </button>
            </div>

            <form action={props.createCaseAction} className={styles.form}>
              <div className={styles.row2}>
                <label className={styles.label}>
                  Member Name (optional)
                  <input className={styles.input} name="memberName" placeholder="e.g. Rahim" />
                </label>
                <label className={styles.label}>
                  Contact/WhatsApp (optional)
                  <input className={styles.input} name="memberContact" placeholder="e.g. +8801XXXXXXXXX" />
                </label>
              </div>

              <label className={styles.label}>
                Subject
                <input className={styles.input} name="subject" required placeholder="Complaint subject" />
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
                <textarea className={styles.textarea} name="note" required placeholder="Complaint details / your notes" />
              </label>

              <div className={styles.buttonRow}>
                <button className={styles.button} type="submit">
                  Generate Case ID
                </button>
                <span className={styles.hint}>After submitting, it will open the case page automatically</span>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </>
  );
}

