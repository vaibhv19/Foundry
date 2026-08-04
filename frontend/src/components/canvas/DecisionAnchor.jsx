import React from 'react';
import { X, Shield } from 'lucide-react';

const DecisionAnchor = ({ decision, onClose }) => {
  return (
    <div style={{
      position: 'absolute',
      top: '50px',
      left: '10px',
      right: '10px',
      backgroundColor: '#1E293B',
      border: '1px solid var(--accent-blueprint)',
      borderRadius: '6px',
      padding: '1rem',
      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
      zIndex: 10,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', borderBottom: '1px solid #334155', paddingBottom: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Shield size={16} style={{ color: 'var(--accent-blueprint)' }} />
          <span style={{ fontSize: '0.85rem', fontWeight: 'bold', fontFamily: 'var(--font-mono)' }}>
            Decision: {decision.decision_key}
          </span>
        </div>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }}
        >
          <X size={16} />
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem' }}>
        <div>
          <span style={{ color: '#64748B', marginRight: '0.5rem' }}>Value:</span>
          <strong style={{ color: 'var(--base-text)' }}>{decision.choice_value}</strong>
        </div>
        <div>
          <span style={{ color: '#64748B', marginRight: '0.5rem' }}>Owner:</span>
          <span style={{ color: 'var(--accent-spark)', fontFamily: 'var(--font-mono)' }}>
            {decision.node_origin}
          </span>
        </div>
        <div>
          <span style={{ color: '#64748B', marginRight: '0.5rem' }}>Priority:</span>
          <span style={{
            padding: '0.1rem 0.4rem',
            borderRadius: '4px',
            backgroundColor: decision.priority === 'P0' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)',
            color: decision.priority === 'P0' ? '#EF4444' : '#F59E0B',
            fontWeight: 'bold',
            fontSize: '0.75rem'
          }}>
            {decision.priority}
          </span>
        </div>
        {decision.rationale && (
          <div>
            <div style={{ color: '#64748B', marginBottom: '0.2rem' }}>Rationale:</div>
            <div style={{ backgroundColor: '#0F172A', padding: '0.5rem', borderRadius: '4px', fontStyle: 'italic', color: '#94A3B8' }}>
              {decision.rationale}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DecisionAnchor;
