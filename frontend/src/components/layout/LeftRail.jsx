import React from 'react';

const LeftRail = ({ children }) => {
  return (
    <aside style={{ width: '280px', display: 'flex', flexDirection: 'column', backgroundColor: '#0F172A', borderRight: '1px solid #1E293B', boxSizing: 'border-box', height: 'calc(100vh - 60px)', overflowY: 'auto' }}>
      {children}
    </aside>
  );
};

export default LeftRail;
