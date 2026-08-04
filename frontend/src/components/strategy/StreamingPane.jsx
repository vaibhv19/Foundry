import React, { useEffect, useRef } from 'react';
import { useStrategyStore } from '../../store/strategyStore';
import AgentBadge from './AgentBadge';

const StreamingPane = () => {
  const debateLogs = useStrategyStore((state) => state.debateLogs);
  const isStreaming = useStrategyStore((state) => state.isStreaming);
  const paneRef = useRef(null);

  useEffect(() => {
    if (paneRef.current) {
      paneRef.current.scrollTop = paneRef.current.scrollHeight;
    }
  }, [debateLogs]);

  const getStyleForSender = (sender) => {
    const baseStyle = {
      padding: '1rem',
      borderRadius: '6px',
      marginBottom: '1rem',
      backgroundColor: '#1E293B',
      border: '1px solid #334155',
      lineHeight: '1.6',
    };

    if (sender === 'Investor') {
      return {
        ...baseStyle,
        fontFamily: 'var(--font-serif)',
        fontSize: '1.05rem',
        borderLeft: '4px solid var(--color-investor)',
      };
    } else if (sender === 'Product_Manager') {
      return {
        ...baseStyle,
        fontFamily: 'var(--font-sans)',
        fontSize: '0.95rem',
        borderLeft: '4px solid var(--color-pm)',
      };
    } else if (sender === 'Tech_Lead') {
      return {
        ...baseStyle,
        fontFamily: 'var(--font-mono)',
        fontSize: '0.9rem',
        borderLeft: '4px solid var(--color-tech)',
      };
    } else if (sender === 'Error') {
      return {
        ...baseStyle,
        fontFamily: 'var(--font-mono)',
        fontSize: '0.85rem',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        border: '1px solid #EF4444',
        color: '#F87171',
      };
    } else {
      // System or others
      return {
        ...baseStyle,
        fontFamily: 'var(--font-mono)',
        fontSize: '0.85rem',
        backgroundColor: '#0F172A',
        color: '#94A3B8',
        borderLeft: '4px solid var(--color-system)',
      };
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', boxSizing: 'border-box' }}>
      <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', borderBottom: '1px solid #334155', paddingBottom: '0.5rem' }}>
        Strategy Room Live Debate Log
      </h3>
      <div
        ref={paneRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          paddingRight: '0.5rem',
          boxSizing: 'border-box',
        }}
      >
        {debateLogs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#64748B', fontStyle: 'italic' }}>
            No active stream. Start debate to stream agent reasoning.
          </div>
        ) : (
          debateLogs.map((log, index) => (
            <div key={index} style={getStyleForSender(log.sender)}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.25rem' }}>
                <AgentBadge sender={log.sender} />
                <strong style={{ fontSize: '0.85rem', color: '#F1F5F9' }}>{log.sender.replace('_', ' ')}</strong>
                <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: '#64748B', fontFamily: 'var(--font-mono)' }}>
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <div style={{ whiteSpace: 'pre-wrap', color: log.sender === 'Error' ? '#F87171' : 'var(--base-text)' }}>{log.content}</div>
            </div>
          ))
        )}
        {isStreaming && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-blueprint)', padding: '0.5rem', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
            <span className="thinking-pulse" style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--accent-blueprint)' }} />
            Agents are debating...
          </div>
        )}
      </div>
    </div>
  );
};

export default StreamingPane;
