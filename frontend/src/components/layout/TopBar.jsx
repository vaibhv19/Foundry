import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const TopBar = ({ title, status, convergenceProgress }) => {
  const navigate = useNavigate();

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1.5rem', backgroundColor: 'rgba(13, 20, 24, 0.85)', borderBottom: '1px solid rgba(197, 168, 128, 0.1)', height: '60px', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button
          onClick={() => navigate('/dashboard')}
          style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.4rem 0.75rem', backgroundColor: 'transparent', border: '1px solid rgba(197, 168, 128, 0.15)', borderRadius: '6px', color: '#94A3B8', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '500', transition: 'all 0.15s ease' }}
        >
          <ArrowLeft size={14} /> Back
        </button>
        <span style={{ fontSize: '1.1rem', fontWeight: '600', fontFamily: "'Lora', serif", color: '#E2E8F0' }}>{title}</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.85rem', color: '#64748B' }}>Status:</span>
          <span style={{
            fontSize: '0.7rem',
            fontWeight: '600',
            letterSpacing: '0.04em',
            padding: '0.2rem 0.6rem',
            borderRadius: '12px',
            backgroundColor: status === 'READY' ? 'rgba(30, 94, 78, 0.25)' : 'rgba(197, 168, 128, 0.15)',
            color: status === 'READY' ? '#3CD070' : '#C5A880'
          }}>
            {status}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '0.85rem', color: '#64748B' }}>Convergence:</span>
          <div style={{ width: '120px', height: '8px', backgroundColor: '#131E20', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ width: `${convergenceProgress}%`, height: '100%', backgroundColor: '#C5A880', transition: 'width 0.3s ease' }} />
          </div>
          <span style={{ fontSize: '0.85rem', fontFamily: "'Plus Jakarta Sans', sans-serif", width: '35px', textAlign: 'right', color: '#94A3B8' }}>
            {convergenceProgress}%
          </span>
        </div>
      </div>
    </div>
  );
};

export default TopBar;
