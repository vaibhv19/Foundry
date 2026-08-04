import React, { useState } from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import { Play, ShieldAlert, Sparkles, CheckSquare, Square } from 'lucide-react';

const RewriteSidebar = () => {
  const activeSection = useCanvasStore((state) => state.activeSection);
  const triggerRegen = useCanvasStore((state) => state.triggerRegen);
  const loading = useCanvasStore((state) => state.loading);

  const [prompt, setPrompt] = useState('');
  const [enforce, setEnforce] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (!activeSection) {
    return (
      <div style={{ padding: '1.5rem', color: '#64748B', textAlign: 'center', fontStyle: 'italic', fontSize: '0.9rem' }}>
        Select a section on the canvas to edit or rewrite it.
      </div>
    );
  }

  const handleRegenerate = async (e) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setError('');
    setSuccess('');
    try {
      await triggerRegen(activeSection.id, prompt, enforce);
      setSuccess('Regeneration task queued successfully.');
      setPrompt('');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to start regeneration.');
    }
  };

  return (
    <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%', boxSizing: 'border-box' }}>
      <div>
        <span style={{ fontSize: '0.7rem', color: '#64748B', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>
          Active Selection
        </span>
        <h3 style={{ margin: 0, fontSize: '1.1rem', fontFamily: 'var(--font-serif)', color: 'var(--base-text)' }}>
          {activeSection.title}
        </h3>
      </div>

      <form onSubmit={handleRegenerate} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', flex: 1 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.85rem', color: '#94A3B8' }}>Rewrite Instructions</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Tell the agents what to change (e.g. Change database to MongoDB, or Add target audience details...)"
            rows={5}
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: '4px',
              border: '1px solid #475569',
              backgroundColor: '#0F172A',
              color: 'var(--base-text)',
              resize: 'vertical',
              fontSize: '0.9rem',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div
          onClick={() => setEnforce(!enforce)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            cursor: 'pointer',
            padding: '0.5rem',
            borderRadius: '4px',
            backgroundColor: '#1E293B',
            border: '1px solid #334155',
            transition: 'background-color 0.2s',
          }}
        >
          {enforce ? (
            <CheckSquare size={18} style={{ color: 'var(--accent-blueprint)' }} />
          ) : (
            <Square size={18} style={{ color: '#64748B' }} />
          )}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>Enforce Decisions</span>
            <span style={{ fontSize: '0.7rem', color: '#64748B' }}>
              Protect existing layout choices from conflicts.
            </span>
          </div>
        </div>

        {error && (
          <div style={{ display: 'flex', alignItems: 'start', gap: '0.5rem', padding: '0.75rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid #EF4444', borderRadius: '4px', color: '#F87171', fontSize: '0.8rem' }}>
            <ShieldAlert size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div style={{ display: 'flex', alignItems: 'start', gap: '0.5rem', padding: '0.75rem', backgroundColor: 'rgba(16, 185, 129, 0.1)', border: '1px solid #10B981', borderRadius: '4px', color: '#34D399', fontSize: '0.8rem' }}>
            <Sparkles size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>{success}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !prompt.trim()}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            padding: '0.75rem',
            backgroundColor: 'var(--accent-spark)',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontWeight: 'bold',
            cursor: 'pointer',
            marginTop: 'auto',
            transition: 'opacity 0.2s',
          }}
        >
          <Play size={16} />
          {loading ? 'Submitting...' : 'Submit Rewrite'}
        </button>
      </form>
    </div>
  );
};

export default RewriteSidebar;
