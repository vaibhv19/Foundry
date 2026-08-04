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
      background: 'radial-gradient(circle at 50% 45%, #151D30 0%, #070A14 65%)',
      padding: '1.5rem',
      paddingBottom: '8vh', /* Active optical center */
      boxSizing: 'border-box'
    }}>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .login-card {
          animation: fadeIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          box-shadow: 0 30px 60px -15px rgba(0, 0, 0, 0.65), 0 0 50px rgba(0, 242, 254, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.05);
          background-color: rgba(20, 28, 43, 0.8) !important;
          backdrop-filter: blur(20px);
        }
        .login-input {
          transition: border-color 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease;
        }
        .login-input::placeholder {
          color: #475569 !important;
          opacity: 1;
        }
        .login-input:hover {
          border-color: #475569 !important;
        }
        .login-input:focus {
          border-color: var(--accent-blueprint) !important;
          box-shadow: 0 0 0 3px rgba(0, 242, 254, 0.1);
          background-color: #05070D !important;
          outline: none;
        }
        .login-button {
          transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .login-button:hover:not(:disabled) {
          background-color: #ff2a5f !important;
          transform: translateY(-0.5px);
          box-shadow: 0 4px 14px rgba(255, 8, 68, 0.22);
        }
        .login-button:active:not(:disabled) {
          transform: translateY(0);
        }
        .login-link {
          transition: color 0.15s ease;
        }
        .login-link:hover {
          color: var(--accent-blueprint) !important;
          text-decoration: underline !important;
        }
      `}</style>

      <div className="login-card" style={{
        width: '100%',
        maxWidth: '400px',
        padding: '2.5rem 2.25rem',
        borderRadius: '12px',
        boxSizing: 'border-box'
      }}>
        {/* Logo Icon Badge */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.25rem' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '52px',
            height: '52px',
            borderRadius: '10px',
            backgroundColor: '#0F172A',
            border: '1px solid rgba(255, 255, 255, 0.04)',
            boxSizing: 'border-box'
          }}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="30" height="30">
              <defs>
                <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="#4facfe" />
                  <stop offset="100%" stop-color="#00f2fe" />
                </linearGradient>
              </defs>
              <path d="M25,65 L75,65 L70,72 L30,72 Z" fill="url(#logoGrad)" />
              <path d="M35,48 L65,48 L72,56 C72,58 68,60 62,60 L38,60 C32,60 28,58 28,56 Z" fill="#1E293B" stroke="url(#logoGrad)" stroke-width="1.5" />
              <path d="M40,30 L60,30 C64,30 68,32 72,35 L60,42 L40,42 Z" fill="url(#logoGrad)" />
            </svg>
          </div>
        </div>

        {/* Header Rhythm */}
        <h2 style={{
          fontFamily: 'var(--font-serif)',
          color: 'var(--base-text)',
          fontSize: '1.6rem',
          fontWeight: '700',
          margin: '0 0 0.4rem 0',
          textAlign: 'center',
          letterSpacing: '-0.025em'
        }}>
          Sign in to Foundry
        </h2>
        <p style={{
          color: '#8A99AD', /* Increased contrast */
          fontSize: '0.85rem',
          textAlign: 'center',
          margin: '0 0 1.75rem 0',
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
            <label style={{ display: 'block', marginBottom: '0.45rem', fontSize: '0.825rem', fontWeight: '500', color: '#94A3B8' }}>
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="login-input"
              style={{
                width: '100%',
                padding: '0.85rem 1rem', /* Increased padding comfort */
                borderRadius: '6px',
                border: '1px solid #2B374A', /* Softened border contrast */
                backgroundColor: '#0A0E1A',
                color: 'var(--base-text)',
                boxSizing: 'border-box',
                fontSize: '0.9rem'
              }}
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.45rem', fontSize: '0.825rem', fontWeight: '500', color: '#94A3B8' }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="login-input"
              style={{
                width: '100%',
                padding: '0.85rem 1rem', /* Increased padding comfort */
                borderRadius: '6px',
                border: '1px solid #2B374A', /* Softened border contrast */
                backgroundColor: '#0A0E1A',
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
              padding: '0.85rem 1rem',
              backgroundColor: 'var(--accent-spark)',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontWeight: '600',
              fontSize: '0.9rem',
              cursor: 'pointer',
              marginTop: '0.35rem'
            }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p style={{ marginTop: '2rem', textAlign: 'center', fontSize: '0.825rem', color: '#64748B' }}>
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
