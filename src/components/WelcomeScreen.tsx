import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface WelcomeScreenProps {
  onConfirm: (name: string, userId: string) => void;
}

export default function WelcomeScreen({ onConfirm }: WelcomeScreenProps) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function generateUserId(displayName: string): string {
    const slug = displayName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '_')
      .slice(0, 32);
    const rand = Math.random().toString(36).slice(2, 8);
    return `${slug}_${rand}`;
  }

  function handleSubmit() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Digite seu nome ou apelido para continuar.');
      return;
    }
    if (trimmed.length < 2) {
      setError('Use pelo menos 2 caracteres.');
      return;
    }
    setLoading(true);
    const userId = generateUserId(trimmed);
    localStorage.setItem('planoaprovado_user_id', userId);
    localStorage.setItem('planoaprovado_user_name', trimmed);
    setTimeout(() => onConfirm(trimmed, userId), 600);
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0b0f1a 0%, #111827 50%, #0d1321 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'Georgia', 'Times New Roman', serif",
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Background grid */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.04,
        backgroundImage: 'linear-gradient(#e2e8f0 1px, transparent 1px), linear-gradient(90deg, #e2e8f0 1px, transparent 1px)',
        backgroundSize: '48px 48px',
      }} />

      {/* Glow blobs */}
      <div style={{
        position: 'absolute', top: '15%', left: '10%',
        width: 400, height: 400,
        background: 'radial-gradient(circle, #2563eb22 0%, transparent 70%)',
        borderRadius: '50%', filter: 'blur(40px)',
      }} />
      <div style={{
        position: 'absolute', bottom: '10%', right: '8%',
        width: 350, height: 350,
        background: 'radial-gradient(circle, #7c3aed18 0%, transparent 70%)',
        borderRadius: '50%', filter: 'blur(40px)',
      }} />

      <motion.div
        initial={{ opacity: 0, y: 32, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 480,
          padding: '0 24px',
        }}
      >
        {/* Card */}
        <div style={{
          background: 'rgba(17, 24, 39, 0.85)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 24,
          padding: '52px 44px',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06)',
        }}>

          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.5 }}
            style={{ textAlign: 'center', marginBottom: 40 }}
          >
            <div style={{
              width: 60, height: 60,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #2563ebcc, #2563eb)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px',
              boxShadow: '0 8px 32px #2563eb40',
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path d="M12 3L2 8l10 5 10-5-10-5z" fill="white" fillOpacity="0.95"/>
                <path d="M6 11v5c0 1.66 2.69 3 6 3s6-1.34 6-3v-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                <line x1="2" y1="8" x2="2" y2="14" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
                <circle cx="2" cy="14" r="1" fill="white" fillOpacity="0.8"/>
              </svg>
            </div>

            <h1 style={{
              fontSize: 28, fontWeight: 900, letterSpacing: '-0.03em',
              color: '#f1f5f9', margin: '0 0 8px',
              fontFamily: "'Georgia', serif",
            }}>
              Plano<span style={{ color: '#2563eb' }}>Aprovado</span>
            </h1>
            <p style={{
              fontSize: 14, color: '#64748b', margin: 0,
              fontFamily: 'system-ui, sans-serif',
              fontWeight: 400,
            }}>
              Sua plataforma de organização de estudos
            </p>
          </motion.div>

          {/* Divider */}
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            style={{
              height: 1,
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)',
              marginBottom: 36,
            }}
          />

          {/* Form */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            <p style={{
              fontSize: 13, fontWeight: 700, letterSpacing: '0.1em',
              color: '#475569', textTransform: 'uppercase',
              fontFamily: 'system-ui, sans-serif',
              marginBottom: 12,
            }}>
              Como você quer ser chamado?
            </p>

            <input
              type="text"
              value={name}
              onChange={e => { setName(e.target.value); setError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              placeholder="Seu nome ou apelido..."
              autoFocus
              maxLength={40}
              style={{
                width: '100%',
                padding: '14px 18px',
                background: 'rgba(255,255,255,0.04)',
                border: `1px solid ${error ? '#ef4444' : 'rgba(255,255,255,0.1)'}`,
                borderRadius: 12,
                fontSize: 16,
                color: '#f1f5f9',
                outline: 'none',
                fontFamily: 'system-ui, sans-serif',
                boxSizing: 'border-box',
                transition: 'border-color 0.2s, box-shadow 0.2s',
                boxShadow: error ? '0 0 0 3px #ef444420' : 'none',
              }}
              onFocus={e => {
                if (!error) e.target.style.borderColor = '#2563eb';
                e.target.style.boxShadow = error ? '0 0 0 3px #ef444420' : '0 0 0 3px #2563eb20';
              }}
              onBlur={e => {
                if (!error) e.target.style.borderColor = 'rgba(255,255,255,0.1)';
                e.target.style.boxShadow = 'none';
              }}
            />

            <AnimatePresence>
              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  style={{
                    fontSize: 12, color: '#ef4444',
                    marginTop: 8, fontFamily: 'system-ui, sans-serif',
                  }}
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            <motion.button
              onClick={handleSubmit}
              disabled={loading}
              whileHover={{ scale: loading ? 1 : 1.02 }}
              whileTap={{ scale: loading ? 1 : 0.98 }}
              style={{
                width: '100%',
                marginTop: 20,
                padding: '15px',
                background: loading
                  ? 'rgba(37,99,235,0.5)'
                  : 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                border: 'none',
                borderRadius: 12,
                fontSize: 15,
                fontWeight: 700,
                color: 'white',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontFamily: 'system-ui, sans-serif',
                letterSpacing: '0.02em',
                boxShadow: loading ? 'none' : '0 8px 24px #2563eb40',
                transition: 'background 0.2s, box-shadow 0.2s',
              }}
            >
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" style={{ animation: 'spin 0.8s linear infinite' }}>
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                  </svg>
                  Entrando...
                </span>
              ) : 'Entrar no PlanoAprovado →'}
            </motion.button>

            <p style={{
              textAlign: 'center', marginTop: 20,
              fontSize: 12, color: '#334155',
              fontFamily: 'system-ui, sans-serif',
              lineHeight: 1.6,
            }}>
              Seus dados ficam salvos no seu navegador.<br />
              Nenhum cadastro necessário.
            </p>
          </motion.div>
        </div>
      </motion.div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        input::placeholder { color: #475569; }
      `}</style>
    </div>
  );
}
