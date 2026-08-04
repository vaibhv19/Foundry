import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [validationError, setValidationError] = useState('');
  const { register, loading, error, clearError } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationError('');
    clearError();

    if (!name || !email || !password) {
      setValidationError('All fields are required.');
      return;
    }

    try {
      await register(email, name, password);
      navigate('/dashboard');
    } catch (err) {
      // Handled by store error
    }
  };

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(circle at 50% 45%, #0B1C1A 0%, #05080A 100%)',
      padding: '1.5rem',
      paddingBottom: '8vh',
      boxSizing: 'border-box',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400..700;1,400..700&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap');
        
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .register-card {
          animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          box-shadow: 0 35px 70px -15px rgba(0, 0, 0, 0.75), 0 0 50px rgba(197, 168, 128, 0.02);
          border: 1px solid rgba(197, 168, 128, 0.1);
          background-color: rgba(13, 20, 24, 0.82) !important;
          backdrop-filter: blur(20px);
        }
        .register-input {
          transition: border-color 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease;
          font-family: 'Plus Jakarta Sans', sans-serif;
        }
        .register-input::placeholder {
          color: #3A474D !important;
          opacity: 1;
        }
        .register-input:hover {
          border-color: rgba(197, 168, 128, 0.3) !important;
        }
        .register-input:focus {
          border-color: #C5A880 !important;
          box-shadow: 0 0 0 3px rgba(197, 168, 128, 0.12);
          background-color: #070B0D !important;
          outline: none;
        }
        .register-button {
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          font-family: 'Plus Jakarta Sans', sans-serif;
        }
        .register-button:hover:not(:disabled) {
          background-color: #D5BC98 !important;
          transform: translateY(-0.5px);
          box-shadow: 0 4px 15px rgba(197, 168, 128, 0.22);
        }
        .register-button:active:not(:disabled) {
          transform: translateY(0);
        }
        .register-link {
          transition: color 0.15s ease;
          font-family: 'Plus Jakarta Sans', sans-serif;
        }
        .register-link:hover {
          color: #D5BC98 !important;
          text-decoration: underline !important;
        }
      `}</style>

      <div className="register-card" style={{
        width: '100%',
        maxWidth: '400px',
        padding: '2.75rem 2.25rem',
        borderRadius: '12px',
        boxSizing: 'border-box'
      }}>
        {/* Convergent Debate SVG Logo */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '54px',
            height: '54px',
            borderRadius: '50%',
            backgroundColor: '#070B0D',
            border: '1px solid rgba(197, 168, 128, 0.12)',
            boxSizing: 'border-box'
          }}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="32" height="32">
              <defs>
                <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="#E2C9A1" />
                  <stop offset="100%" stop-color="#C5A880" />
                </linearGradient>
              </defs>
              <path d="M34,68 L48,34" stroke="url(#goldGrad)" stroke-width="6.5" stroke-linecap="round" />
              <path d="M66,68 L52,34" stroke="url(#goldGrad)" stroke-width="6.5" stroke-linecap="round" />
              <path d="M50,70 L50,42" stroke="url(#goldGrad)" stroke-width="6.5" stroke-linecap="round" />
              <polygon points="50,16 56,24 50,32 44,24" fill="#C5A880" />
            </svg>
          </div>
        </div>

        <h2 style={{
          fontFamily: "'Lora', serif",
          color: 'var(--base-text)',
          fontSize: '1.65rem',
          fontWeight: '600',
          margin: '0 0 0.5rem 0',
          textAlign: 'center',
          letterSpacing: '-0.01em'
        }}>
          Create Account
        </h2>
        <p style={{
          color: '#8A99AD',
          fontSize: '0.85rem',
          textAlign: 'center',
          margin: '0 0 2rem 0',
          lineHeight: '1.4'
        }}>
          Forge your startup blueprint with AI agents.
        </p>

        {validationError && (
          <div style={{
            padding: '0.75rem 1rem',
            backgroundColor: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.15)',
            borderRadius: '6px',
            color: '#F87171',
            marginBottom: '1.25rem',
            fontSize: '0.85rem',
            lineHeight: '1.4'
          }}>
            {validationError}
          </div>
        )}
        {error && (
          <div style={{
            padding: '0.75rem 1rem',
            backgroundColor: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.15)',
            borderRadius: '6px',
            color: '#F87171',
            marginBottom: '1.25rem',
            fontSize: '0.85rem',
            lineHeight: '1.4'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.45rem', fontSize: '0.8rem', fontWeight: '600', color: '#94A3B8', letterSpacing: '0.02em' }}>
              FULL NAME
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="register-input"
              style={{
                width: '100%',
                padding: '0.85rem 1rem',
                borderRadius: '6px',
                border: '1px solid #1E292B',
                backgroundColor: '#070B0D',
                color: 'var(--base-text)',
                boxSizing: 'border-box',
                fontSize: '0.9rem'
              }}
              placeholder="Alex Smith"
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.45rem', fontSize: '0.8rem', fontWeight: '600', color: '#94A3B8', letterSpacing: '0.02em' }}>
              EMAIL ADDRESS
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="register-input"
              style={{
                width: '100%',
                padding: '0.85rem 1rem',
                borderRadius: '6px',
                border: '1px solid #1E292B',
                backgroundColor: '#070B0D',
                color: 'var(--base-text)',
                boxSizing: 'border-box',
                fontSize: '0.9rem'
              }}
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.45rem', fontSize: '0.8rem', fontWeight: '600', color: '#94A3B8', letterSpacing: '0.02em' }}>
              PASSWORD
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="register-input"
              style={{
                width: '100%',
                padding: '0.85rem 1rem',
                borderRadius: '6px',
                border: '1px solid #1E292B',
                backgroundColor: '#070B0D',
                color: 'var(--base-text)',
                boxSizing: 'border-box',
                fontSize: '0.9rem'
              }}
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="register-button"
            style={{
              width: '100%',
              padding: '0.85rem 1rem',
              backgroundColor: '#C5A880',
              color: '#030608',
              border: 'none',
              borderRadius: '6px',
              fontWeight: '600',
              fontSize: '0.9rem',
              cursor: 'pointer',
              marginTop: '0.35rem'
            }}
          >
            {loading ? 'Registering...' : 'Register'}
          </button>
        </form>

        <p style={{ marginTop: '2rem', textAlign: 'center', fontSize: '0.825rem', color: '#64748B' }}>
          Already have an account?{' '}
          <Link to="/login" className="register-link" style={{ color: '#C5A880', textDecoration: 'none', fontWeight: '600' }}>
            Login here
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
