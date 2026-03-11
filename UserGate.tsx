/**
 * UserGate.tsx
 *
 * Shows a welcome / nickname screen on the very first visit.
 * After the user chooses a name, a unique ID is stored in localStorage.
 * On every subsequent visit the gate is bypassed automatically.
 *
 * Usage: wrap <App /> with <UserGate> in main.tsx / index.tsx
 *
 *   import UserGate from './components/UserGate';
 *   <UserGate><App /></UserGate>
 */

import React, { useState, useEffect, ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';

const STORAGE_KEY_ID   = 'planoaprovado_user_id';
const STORAGE_KEY_NAME = 'planoaprovado_user_name';

// Generates a short, collision-resistant unique ID
function generateUserId(name: string): string {
  const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20) || 'user';
  const rand = Math.random().toString(36).slice(2, 8);
  return `${slug}_${rand}`;
}

interface Props {
  children: ReactNode;
}

export default function UserGate({ children }: Props) {
  const [ready, setReady] = useState(false);   // has localStorage been checked?
  const [show,  setShow]  = useState(false);   // show the gate screen?
  const [name,  setName]  = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const existingId = localStorage.getItem(STORAGE_KEY_ID);
    if (existingId) {
      setReady(true);   // already identified → skip gate
    } else {
      setShow(true);    // first visit → show gate
      setReady(true);
    }
  }, []);

  const handleEnter = () => {
    const trimmed = name.trim();
    if (!trimmed) { setError('Por favor, insira um apelido para continuar.'); return; }
    if (trimmed.length < 2) { setError('O apelido deve ter ao menos 2 caracteres.'); return; }

    setLoading(true);
    const uid = generateUserId(trimmed);
    localStorage.setItem(STORAGE_KEY_ID, uid);
    localStorage.setItem(STORAGE_KEY_NAME, trimmed);

    // Brief pause so the animation feels intentional
    setTimeout(() => { setShow(false); }, 400);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleEnter();
  };

  if (!ready) return null;

  return (
    <>
      {/* Always render children so the app loads behind the gate */}
      <div style={{ visibility: show ? 'hidden' : 'visible' }}>
        {children}
      </div>

      <AnimatePresence>
        {show && (
          <motion.div
            key="gate"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.35 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 9999,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
              padding: '1.5rem',
            }}
          >
            {/* Decorative blurred circles */}
            <div style={{
              position: 'absolute', width: 500, height: 500,
              borderRadius: '50%', top: '-100px', left: '-100px',
              background: 'radial-gradient(circle, rgba(37,99,235,0.15) 0%, transparent 70%)',
              pointerEvents: 'none',
            }} />
            <div style={{
              position: 'absolute', width: 400, height: 400,
              borderRadius: '50%', bottom: '-80px', right: '-80px',
              background: 'radial-gradient(circle, rgba(16,185,129,0.12) 0%, transparent 70%)',
              pointerEvents: 'none',
            }} />

            <motion.div
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              style={{
                background: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '1.75rem',
                padding: '3rem 2.5rem',
                width: '100%', maxWidth: '420px',
                boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
                position: 'relative',
              }}
            >
              {/* Logo */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem', justifyContent: 'center' }}>
                <div style={{
                  width: 44, height: 44, borderRadius: '50%',
                  background: 'linear-gradient(135deg, #2563ebcc, #2563eb)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 4px 14px rgba(37,99,235,0.4)',
                }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M12 3L2 8l10 5 10-5-10-5z" fill="white" fillOpacity="0.95"/>
                    <path d="M6 11v5c0 1.66 2.69 3 6 3s6-1.34 6-3v-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    <line x1="2" y1="8" x2="2" y2="14" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
                    <circle cx="2" cy="14" r="1" fill="white" fillOpacity="0.8"/>
                  </svg>
                </div>
                <span style={{ fontSize: '1.4rem', fontWeight: 900, color: '#f1f5f9', letterSpacing: '-0.03em' }}>
                  Plano<span style={{ color: '#2563eb' }}>Aprovado</span>
                </span>
              </div>

              {/* Heading */}
              <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <h1 style={{ color: '#f1f5f9', fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem', lineHeight: 1.2 }}>
                  Bem-vindo! 👋
                </h1>
                <p style={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: 1.6 }}>
                  Escolha um apelido para identificar seus dados.<br />
                  <span style={{ color: '#475569', fontSize: '0.8rem' }}>Nenhum cadastro necessário — só abre e usa.</span>
                </p>
              </div>

              {/* Input */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>
                  Seu apelido
                </label>
                <input
                  autoFocus
                  type="text"
                  value={name}
                  onChange={e => { setName(e.target.value); setError(''); }}
                  onKeyDown={handleKey}
                  placeholder="Ex: João, Mari, Dev42..."
                  maxLength={30}
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    padding: '0.875rem 1rem',
                    background: '#0f172a', border: `1px solid ${error ? '#ef4444' : '#334155'}`,
                    borderRadius: '0.875rem', color: '#f1f5f9',
                    fontSize: '1rem', fontWeight: 600, outline: 'none',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={e => { if (!error) e.target.style.borderColor = '#2563eb'; }}
                  onBlur={e => { if (!error) e.target.style.borderColor = '#334155'; }}
                />
                {error && (
                  <p style={{ color: '#ef4444', fontSize: '0.78rem', marginTop: '0.4rem', fontWeight: 600 }}>
                    {error}
                  </p>
                )}
              </div>

              {/* CTA */}
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleEnter}
                disabled={loading}
                style={{
                  width: '100%', padding: '0.875rem',
                  background: loading ? '#1e40af' : '#2563eb',
                  color: 'white', border: 'none', borderRadius: '0.875rem',
                  fontSize: '1rem', fontWeight: 800, cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(37,99,235,0.4)',
                  transition: 'background 0.2s, opacity 0.2s',
                  letterSpacing: '-0.01em',
                }}
              >
                {loading ? 'Entrando...' : 'Entrar no Plano Aprovado →'}
              </motion.button>

              {/* Footer note */}
              <p style={{ color: '#475569', fontSize: '0.72rem', textAlign: 'center', marginTop: '1.25rem', lineHeight: 1.5 }}>
                Seus dados ficam salvos neste navegador.<br />
                Use o mesmo apelido em outro dispositivo para acessar tudo de novo.
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
