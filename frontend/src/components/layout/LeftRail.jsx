import React from 'react';
import { useStrategyStore } from '../../store/strategyStore';
import { UserCheck, Award, Settings, ShieldAlert, Cpu } from 'lucide-react';

const LeftRail = () => {
  const nodesStatus = useStrategyStore((state) => state.nodesStatus);
  const activeJob = useStrategyStore((state) => state.activeJob);

  const agents = [
    { name: 'Investor', icon: UserCheck },
    { name: 'Product_Manager', icon: Award },
    { name: 'Tech_Lead', icon: Settings },
    { name: 'Consistency_Check', icon: ShieldAlert },
    { name: 'Tie_Breaker', icon: Cpu },
  ];

  return (
    <aside style={{ width: '280px', display: 'flex', flexDirection: 'column', backgroundColor: 'rgba(13, 20, 24, 0.65)', borderRight: '1px solid rgba(197, 168, 128, 0.1)', backdropFilter: 'blur(12px)', boxSizing: 'border-box', height: 'calc(100vh - 60px)', padding: '1.5rem' }}>
      <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.05rem', fontFamily: "'Lora', serif", fontWeight: '600', color: '#E2E8F0' }}>Agent Timeline</h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', position: 'relative', flex: 1 }}>
        <div style={{ position: 'absolute', left: '23px', top: '10px', bottom: '10px', width: '2px', borderLeft: '1px dashed rgba(197, 168, 128, 0.15)', zIndex: 0 }} />

        {agents.map((agent) => {
          const status = nodesStatus[agent.name] || 'idle';
          const Icon = agent.icon;
          const isThinking = status === 'thinking';
          const isDone = status === 'done';
          const isIdle = status === 'idle';

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
                  border: isIdle 
                    ? '1px solid rgba(255, 255, 255, 0.04)' 
                    : isThinking 
                      ? '2px solid #C5A880' 
                      : '1px solid rgba(60, 208, 112, 0.3)',
                  backgroundColor: isIdle 
                    ? '#070B0D' 
                    : isThinking 
                      ? 'rgba(197, 168, 128, 0.1)' 
                      : 'rgba(30, 94, 78, 0.15)',
                  color: isIdle 
                    ? '#475569' 
                    : isThinking 
                      ? '#C5A880' 
                      : '#3CD070',
                  transition: 'all 0.3s ease',
                  boxSizing: 'border-box',
                }}
              >
                <Icon size={18} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: '600', color: isIdle ? '#64748B' : '#E2E8F0' }}>
                  {agent.name.replace('_', ' ')}
                </span>
                <span style={{ fontSize: '0.75rem', color: isThinking ? '#C5A880' : isDone ? '#3CD070' : '#475569', fontWeight: isThinking ? '600' : 'normal' }}>
                  {status.toUpperCase()}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {activeJob && (
        <div style={{
          marginTop: 'auto',
          padding: '0.85rem 1rem',
          backgroundColor: 'rgba(0, 0, 0, 0.2)',
          border: '1px solid rgba(197, 168, 128, 0.08)',
          borderRadius: '6px',
          fontSize: '0.75rem',
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          color: '#8A99AD',
          lineHeight: '1.5'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
            <span>Job ID:</span>
            <span style={{ fontWeight: '600', color: '#E2E8F0' }}>{activeJob.id.substring(0, 8)}...</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Node:</span>
            <span style={{
              fontWeight: '600',
              color: useStrategyStore.getState().isStreaming ? '#C5A880' : '#3CD070'
            }}>
              {useStrategyStore.getState().isStreaming ? 'STREAMING' : 'READY'}
            </span>
          </div>
        </div>
      )}
    </aside>
  );
};

export default LeftRail;
