import React from 'react';

const MissionControlLayout = ({ topbar, leftrail, rightrail, children }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', backgroundColor: 'var(--base-bg)', color: 'var(--base-text)' }}>
      {topbar}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {leftrail}
        <main style={{ flex: 1, overflowY: 'auto', backgroundColor: '#090D1A', padding: '1.5rem', boxSizing: 'border-box' }}>
          {children}
        </main>
        {rightrail}
      </div>
    </div>
  );
};

export default MissionControlLayout;
