import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const TopBar = ({ title, status, convergenceProgress }) => {
  const navigate = useNavigate();

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1.5rem', backgroundColor: '#0F172A', borderBottom: '1px solid #1E293B', height: '60px', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button
          onClick={() => navigate('/dashboard')}
          style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.4rem 0.75rem', backgroundColor: 'transparent', border: '1px solid #334155', borderRadius: '4px', color: '#94A3B8', cursor: 'pointer', fontSize: '0.85rem' }}
        >
          <ArrowLeft size={14} /> Back
        </button>
        <span style={{ fontSize: '1.1rem', fontWeight: 'bold', fontFamily: 'var(--font-serif)', color: 'var(--base-text)' }}>{title}</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.85rem', color: '#64748B' }}>Status:</span>
          <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: status === 'READY' ? '#10B981' : status === 'GENERATING' ? '#F59E0B' : '#EF4444' }}>
            {status}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '0.85rem', color: '#64748B' }}>Convergence:</span>
          <div style={{ width: '120px', height: '8px', backgroundColor: '#334155', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ width: `${convergenceProgress}%`, height: '100%', backgroundColor: 'var(--accent-blueprint)', transition: 'width 0.3s ease' }} />
          </div>
          <span style={{ fontSize: '0.85rem', fontFamily: 'var(--font-mono)', width: '35px', textAlign: 'right' }}>
            {convergenceProgress}%
          </span>
        </div>
      </div>
    </div>
  );
};

export default TopBar;
