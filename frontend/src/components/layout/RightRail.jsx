import React from 'react';

const RightRail = ({ children }) => {
  return (
    <aside style={{ width: '320px', display: 'flex', flexDirection: 'column', backgroundColor: '#0F172A', borderLeft: '1px solid #1E293B', boxSizing: 'border-box', height: 'calc(100vh - 60px)', overflowY: 'auto' }}>
      {children}
    </aside>
  );
};

export default RightRail;
