import React, { useState } from 'react';
import { useBlueprintStore } from '../../store/blueprintStore';
import { useCanvasStore } from '../../store/canvasStore';
import { Shield, ShieldAlert, X } from 'lucide-react';

const RightRail = () => {
  const currentBlueprint = useBlueprintStore((state) => state.currentBlueprint);
  const conflictAlert = useCanvasStore((state) => state.conflictAlert);
  const clearConflict = useCanvasStore((state) => state.clearConflict);
  const triggerRegen = useCanvasStore((state) => state.triggerRegen);

  const [overriding, setOverriding] = useState(false);
  const [overrideRationale, setOverrideRationale] = useState('');
  const [overrideTarget, setOverrideTarget] = useState(null);

  const activeDecisions = currentBlueprint?.decisions?.filter((d) => d.is_active) || [];

  const handleOverrideSubmit = async (e) => {
    e.preventDefault();
    if (!overrideTarget) return;

    setOverriding(true);
    try {
      const activeSection = useCanvasStore.getState().activeSection;
      if (activeSection) {
        await triggerRegen(
          activeSection.id,
          `Force override for: ${overrideTarget.key} to ${overrideTarget.proposed_value}. Rationale: ${overrideRationale}`,
          false
        );
        clearConflict();
        setOverrideTarget(null);
        setOverrideRationale('');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setOverriding(false);
    }
  };

  return (
    <aside style={{ width: '320px', display: 'flex', flexDirection: 'column', backgroundColor: '#0F172A', borderLeft: '1px solid #1E293B', boxSizing: 'border-box', height: 'calc(100vh - 60px)', padding: '1.5rem', gap: '1.5rem', overflowY: 'auto' }}>
      
      {conflictAlert && (
        <div style={{ padding: '1rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '2px solid #EF4444', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '0.75rem', position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#F87171' }}>
            <ShieldAlert size={18} />
            <strong style={{ fontSize: '0.9rem' }}>Consistency Conflict!</strong>
            <button onClick={clearConflict} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }}>
              <X size={14} />
            </button>
          </div>
          <p style={{ margin: 0, fontSize: '0.8rem', color: '#CBD5E1', lineHeight: '1.4' }}>
            {conflictAlert.message}
          </p>

          {conflictAlert.conflicts && conflictAlert.conflicts.map((conflict, i) => (
            <div key={i} style={{ backgroundColor: '#0F172A', padding: '0.5rem', borderRadius: '4px', fontSize: '0.75rem', borderLeft: '3px solid #EF4444' }}>
              <div style={{ color: '#94A3B8' }}>Key: <strong style={{ color: 'var(--base-text)' }}>{conflict.key}</strong></div>
              <div style={{ color: '#94A3B8' }}>Active Choice: <strong style={{ color: 'var(--base-text)' }}>{conflict.active_value}</strong></div>
              <div style={{ color: '#F87171' }}>Proposed Choice: <strong style={{ color: 'var(--base-text)' }}>{conflict.proposed_value}</strong></div>

              <button
                onClick={() => setOverrideTarget(conflict)}
                style={{
                  marginTop: '0.5rem',
                  width: '100%',
                  padding: '0.3rem',
                  backgroundColor: 'var(--accent-spark)',
                  border: 'none',
                  borderRadius: '4px',
                  color: 'white',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  fontSize: '0.75rem'
                }}
              >
                Proceed & Override
              </button>
            </div>
          ))}
        </div>
      )}

      {overrideTarget && (
        <div style={{ padding: '1rem', backgroundColor: '#1E293B', border: '1px solid var(--accent-spark)', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--accent-spark)' }}>Override Rationale</span>
            <button onClick={() => setOverrideTarget(null)} style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }}>
              <X size={14} />
            </button>
          </div>

          <form onSubmit={handleOverrideSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <textarea
              value={overrideRationale}
              onChange={(e) => setOverrideRationale(e.target.value)}
              placeholder="State the rationale for this decision override..."
              rows={3}
              style={{
                width: '100%',
                padding: '0.5rem',
                borderRadius: '4px',
                border: '1px solid #475569',
                backgroundColor: '#0F172A',
                color: 'var(--base-text)',
                fontSize: '0.8rem',
                resize: 'none',
                boxSizing: 'border-box'
              }}
              required
            />
            <button
              type="submit"
              disabled={overriding}
              style={{
                width: '100%',
                padding: '0.5rem',
                backgroundColor: '#10B981',
                border: 'none',
                borderRadius: '4px',
                color: 'white',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '0.8rem'
              }}
            >
              {overriding ? 'Applying Override...' : 'Confirm & Re-submit'}
            </button>
          </form>
        </div>
      )}

      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid #334155', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
          <Shield size={18} style={{ color: 'var(--accent-blueprint)' }} />
          <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--base-text)' }}>Decision Log</h3>
        </div>

        {activeDecisions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#64748B', fontStyle: 'italic', fontSize: '0.85rem' }}>
            No active decisions recorded. Let the agents converge to establish core layout constraints.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {activeDecisions.map((dec) => (
              <div
                key={dec.id}
                style={{
                  padding: '0.75rem',
                  backgroundColor: '#1E293B',
                  border: '1px solid #334155',
                  borderRadius: '6px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.25rem',
                  fontSize: '0.8rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 'bold', color: 'var(--base-text)', fontFamily: 'var(--font-mono)' }}>
                    {dec.decision_key}
                  </span>
                  <span style={{
                    fontSize: '0.7rem',
                    padding: '0.1rem 0.3rem',
                    borderRadius: '4px',
                    backgroundColor: dec.priority === 'P0' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                    color: dec.priority === 'P0' ? '#EF4444' : '#F59E0B',
                  }}>
                    {dec.priority}
                  </span>
                </div>
                <div style={{ color: 'var(--accent-blueprint)' }}>
                  Value: <strong>{dec.choice_value}</strong>
                </div>
                <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>
                  Owner: {dec.node_origin.replace('_', ' ')}
                </div>
                {dec.rationale && (
                  <div style={{ fontSize: '0.75rem', fontStyle: 'italic', color: '#64748B', marginTop: '0.25rem', backgroundColor: '#0F172A', padding: '0.35rem', borderRadius: '4px' }}>
                    {dec.rationale}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

    </aside>
  );
};

export default RightRail;
