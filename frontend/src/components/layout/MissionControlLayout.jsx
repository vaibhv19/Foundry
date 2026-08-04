import React from 'react';

const MissionControlLayout = ({ topbar, leftrail, rightrail, children }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', backgroundColor: '#05080A', color: 'var(--base-text)' }}>
      {topbar}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {leftrail}
        <main style={{ flex: 1, overflowY: 'auto', background: 'radial-gradient(circle at 50% 120px, #0B1C1A 0%, #05080A 100%)', padding: '1.5rem', boxSizing: 'border-box' }}>
          {children}
        </main>
        {rightrail}
      </div>
    </div>
  );
};

export default MissionControlLayout;
