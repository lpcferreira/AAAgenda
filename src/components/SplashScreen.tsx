'use client';
import { useEffect, useState } from 'react';
import styles from './SplashScreen.module.css';

interface Calendar {
  id: string;
  summary: string;
  accountEmail: string;
  primary: boolean;
}

interface Props {
  onDone: () => void;
  calendars?: Calendar[];
  userEmail?: string;
  linkedEmails?: string[];
}

/**
 * SplashScreen
 * Fase 1 (0–10s):  foto original da grade do Arnaldo + agendas conectadas
 * Fase 2 (10–11s): crossfade para ícone vetorial + logo
 * Fase 3 (11s+):   fade out e desmonta
 */
export function SplashScreen({ onDone, calendars = [], userEmail, linkedEmails = [] }: Props) {
  const [phase, setPhase] = useState<'photo' | 'icon' | 'out'>('photo');

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('icon'), 10000);
    const t2 = setTimeout(() => setPhase('out'),  11000);
    const t3 = setTimeout(() => onDone(),          11600);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onDone]);

  // Agrupa agendas por conta
  const allEmails = userEmail
    ? [userEmail, ...linkedEmails.filter((e) => e !== userEmail)]
    : linkedEmails;

  const calsByAccount = allEmails.map((email) => ({
    email,
    cals: calendars.filter((c) => c.accountEmail === email || (c.primary && email === userEmail)),
  }));

  return (
    <div className={`${styles.root} ${phase === 'out' ? styles.fadeOut : ''}`}>

      {/* ── Fase 1: foto + agendas ── */}
      <div className={`${styles.layer} ${phase === 'photo' ? styles.visible : styles.hidden}`}>
        <img
          src="/arnaldo-grade.jpg"
          alt="Grade de blocos de Arnaldo Avileis"
          className={styles.photo}
          draggable={false}
        />
        <p className={styles.credit}>grade original de Arnaldo Avileis</p>

        {/* Agendas conectadas */}
        {allEmails.length > 0 && (
          <div className={styles.calendarList}>
            <p className={styles.calLabel}>{allEmails.length} conta{allEmails.length !== 1 ? 's' : ''} conectada{allEmails.length !== 1 ? 's' : ''}</p>
            {allEmails.map((email) => (
              <div key={email} className={styles.accountRow}>
                <div className={styles.accountDot} />
                <span className={styles.accountEmail}>{email}</span>
              </div>
            ))}
            {allEmails.length === 0 && (
              <div className={styles.accountRow}>
                <div className={styles.accountDot} />
                <span className={styles.accountEmail}>{userEmail}</span>
              </div>
            )}
          </div>
        )}

        <button className={styles.skipBtn} onClick={onDone}>
          continuar →
        </button>
      </div>

      {/* ── Fase 2: ícone + logo ── */}
      <div className={`${styles.layer} ${phase === 'icon' ? styles.visible : styles.hidden}`}>
        <svg width="80" height="80" viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <rect width="80" height="80" rx="18" fill="#FAFAF8"/>
          <rect x="8" y="8" width="64" height="64" rx="10" fill="#F3F1EC"/>
          <rect x="16" y="16" width="11" height="11" rx="2.5" fill="#F5C842"/>
          <rect x="30" y="16" width="11" height="11" rx="2.5" fill="#7FC8A9"/>
          <rect x="44" y="16" width="11" height="11" rx="2.5" fill="#F5C842"/>
          <rect x="58" y="16" width="11" height="11" rx="2.5" fill="#E8A0BF"/>
          <rect x="16" y="30" width="11" height="11" rx="2.5" fill="#7FC8A9"/>
          <rect x="30" y="30" width="11" height="11" rx="2.5" fill="#F5C842"/>
          <rect x="44" y="30" width="11" height="11" rx="2.5" fill="#E8A0BF"/>
          <rect x="58" y="30" width="11" height="11" rx="2.5" fill="#E07060"/>
          <rect x="16" y="44" width="11" height="11" rx="2.5" fill="#7BA7D4"/>
          <rect x="30" y="44" width="11" height="11" rx="2.5" fill="#D4C4A8"/>
          <rect x="44" y="44" width="11" height="11" rx="2.5" fill="#7FC8A9"/>
          <rect x="58" y="44" width="11" height="11" rx="2.5" fill="#F5C842"/>
          <rect x="16" y="58" width="11" height="11" rx="2.5" fill="#E07060"/>
          <rect x="30" y="58" width="11" height="11" rx="2.5" fill="#7FC8A9"/>
          <rect x="44" y="58" width="11" height="11" rx="2.5" fill="#7BA7D4"/>
          <rect x="58" y="58" width="11" height="11" rx="2.5" fill="#D4C4A8"/>
        </svg>
        <div className={styles.logoText}>AA<span>A</span>genda</div>
      </div>

    </div>
  );
}
