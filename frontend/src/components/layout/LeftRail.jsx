import React from 'react';
import { useStrategyStore } from '../../store/strategyStore';
import { UserCheck, Award, Settings, ShieldAlert, Cpu } from 'lucide-react';

const LeftRail = () => {
  const nodesStatus = useStrategyStore((state) => state.nodesStatus);
  const activeJob = useStrategyStore((state) => state.activeJob);

  const agents = [
    { name: 'Investor', icon: UserCheck, color: 'var(--color-investor)' },
    { name: 'Product_Manager', icon: Award, color: 'var(--color-pm)' },
    { name: 'Tech_Lead', icon: Settings, color: 'var(--color-tech)' },
    { name: 'Consistency_Check', icon: ShieldAlert, color: 'var(--color-system)' },
    { name: 'Tie_Breaker', icon: Cpu, color: 'var(--accent-spark)' },
  ];

  return (
    <aside style={{ width: '280px', display: 'flex', flexDirection: 'column', backgroundColor: '#0F172A', borderRight: '1px solid #1E293B', boxSizing: 'border-box', height: 'calc(100vh - 60px)', padding: '1.5rem' }}>
      <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.1rem', color: 'var(--base-text)' }}>Agent Timeline</h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', position: 'relative', flex: 1 }}>
        <div style={{ position: 'absolute', left: '23px', top: '10px', bottom: '10px', width: '2px', borderLeft: '2px dashed #334155', zIndex: 0 }} />

        {agents.map((agent) => {
          const status = nodesStatus[agent.name] || 'idle';
          const Icon = agent.icon;
          const isThinking = status === 'thinking';

          return (
            <div key={agent.name} style={{ display: 'flex', alignItems: 'center', gap: '1rem', zIndex: 1 }}>
              <div
                className={isThinking ? 'thinking-pulse' : ''}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '46px',
                  height: '46px',
                  borderRadius: '50%',
                  border: `2px solid ${status === 'idle' ? '#334155' : agent.color}`,
                  backgroundColor: status === 'idle' ? '#0F172A' : '#1E293B',
                  color: status === 'idle' ? '#64748B' : agent.color,
                  transition: 'all 0.3s ease',
                  boxSizing: 'border-box',
                }}
              >
                <Icon size={20} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: status === 'idle' ? '#64748B' : 'var(--base-text)' }}>
                  {agent.name.replace('_', ' ')}
                </span>
                <span style={{ fontSize: '0.75rem', color: isThinking ? 'var(--accent-blueprint)' : status === 'done' ? '#10B981' : '#64748B', fontWeight: isThinking ? 'bold' : 'normal' }}>
                  {status.toUpperCase()}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {activeJob && (
        <div style={{ marginTop: 'auto', padding: '0.75rem', backgroundColor: '#1E293B', border: '1px solid #334155', borderRadius: '4px', fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: '#94A3B8' }}>
          <div>Job ID: {activeJob.id.substring(0, 8)}...</div>
          <div>Node: {useStrategyStore.getState().isStreaming ? 'STREAMING' : 'READY'}</div>
        </div>
      )}
    </aside>
  );
};

export default LeftRail;
