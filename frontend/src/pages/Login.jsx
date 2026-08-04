import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [validationError, setValidationError] = useState('');
  const { login, loading, error, clearError } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationError('');
    clearError();

    if (!email || !password) {
      setValidationError('All fields are required.');
      return;
    }

    try {
      await login(email, password);
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
      background: 'radial-gradient(circle at center, #1E293B 0%, #090D1A 100%)',
      padding: '1.5rem',
      boxSizing: 'border-box'
    }}>
      {/* Scoped styles for premium transitions and hover effects */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .login-card {
          animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 40px rgba(0, 242, 254, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.06);
          background-color: rgba(30, 41, 59, 0.65) !important;
          backdrop-filter: blur(12px);
        }
        .login-input {
          transition: border-color 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease;
        }
        .login-input:focus {
          border-color: var(--accent-blueprint) !important;
          box-shadow: 0 0 0 3px rgba(0, 242, 254, 0.12);
          background-color: #090D1A !important;
          outline: none;
        }
        .login-button {
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .login-button:hover:not(:disabled) {
          background-color: #ff3366 !important;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(255, 8, 68, 0.25);
        }
        .login-button:active:not(:disabled) {
          transform: translateY(0);
        }
        .login-link {
          transition: color 0.2s ease;
        }
        .login-link:hover {
          color: var(--accent-blueprint) !important;
        }
      `}</style>

      <div className="login-card" style={{
        width: '100%',
        maxWidth: '420px',
        padding: '2.5rem 2rem',
        borderRadius: '12px',
        boxSizing: 'border-box'
      }}>
        {/* Abstract Glowing Forge Logo SVG */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.25rem' }}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="48" height="48">
            <defs>
              <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#4facfe" />
                <stop offset="100%" stop-color="#00f2fe" />
              </linearGradient>
            </defs>
            <rect x="10" y="10" width="80" height="80" rx="16" fill="#0F172A" stroke="rgba(255,255,255,0.05)" stroke-width="2" />
            <path d="M25,65 L75,65 L70,72 L30,72 Z" fill="url(#logoGrad)" />
            <path d="M35,48 L65,48 L72,56 C72,58 68,60 62,60 L38,60 C32,60 28,58 28,56 Z" fill="#1E293B" stroke="url(#logoGrad)" stroke-width="1.5" />
            <path d="M40,30 L60,30 C64,30 68,32 72,35 L60,42 L40,42 Z" fill="url(#logoGrad)" />
          </svg>
        </div>

        <h2 style={{
          fontFamily: 'var(--font-serif)',
          color: 'var(--base-text)',
          fontSize: '1.75rem',
          margin: '0 0 0.25rem 0',
          textAlign: 'center',
          letterSpacing: '-0.02em'
        }}>
          Sign in to Foundry
        </h2>
        <p style={{
          color: '#64748B',
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
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
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
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
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
            <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: '500', color: '#94A3B8' }}>
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="login-input"
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                borderRadius: '6px',
                border: '1px solid #334155',
                backgroundColor: '#0F172A',
                color: 'var(--base-text)',
                boxSizing: 'border-box',
                fontSize: '0.9rem'
              }}
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: '500', color: '#94A3B8' }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="login-input"
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                borderRadius: '6px',
                border: '1px solid #334155',
                backgroundColor: '#0F172A',
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
            className="login-button"
            style={{
              width: '100%',
              padding: '0.75rem 1rem',
              backgroundColor: 'var(--accent-spark)',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontWeight: 'bold',
              fontSize: '0.9rem',
              cursor: 'pointer',
              marginTop: '0.5rem'
            }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p style={{ marginTop: '1.75rem', textAlign: 'center', fontSize: '0.85rem', color: '#64748B' }}>
          Don't have an account?{' '}
          <Link to="/register" className="login-link" style={{ color: 'var(--accent-blueprint)', textDecoration: 'none', fontWeight: '500' }}>
            Register here
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
