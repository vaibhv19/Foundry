import React from 'react';

const AgentBadge = ({ sender }) => {
  let label = 'SYS';
  let border = 'var(--color-system)';
  let bg = 'rgba(100, 116, 139, 0.1)';
  let textColor = '#94A3B8';

  if (sender === 'Investor') {
    label = 'INV';
    border = 'var(--color-investor)';
    bg = 'rgba(245, 158, 11, 0.1)';
    textColor = '#F59E0B';
  } else if (sender === 'Product_Manager') {
    label = 'PM';
    border = 'var(--color-pm)';
    bg = 'rgba(99, 102, 241, 0.1)';
    textColor = '#818CF8';
  } else if (sender === 'Tech_Lead') {
    label = 'TEC';
    border = 'var(--color-tech)';
    bg = 'rgba(16, 185, 129, 0.1)';
    textColor = '#34D399';
  }

  return (
    <span style={{
      display: 'inline-block',
      padding: '0.2rem 0.5rem',
      borderRadius: '4px',
      border: `1px solid ${border}`,
      backgroundColor: bg,
      color: textColor,
      fontFamily: 'var(--font-mono)',
      fontSize: '0.75rem',
      fontWeight: 'bold',
      marginRight: '0.5rem'
    }}>
      {label}
    </span>
  );
};

export default AgentBadge;
