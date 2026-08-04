import React from 'react';
import SectionBlock from './SectionBlock';

const CanvasGrid = ({ sections }) => {
  const sortedSections = [...sections].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(450px, 1fr))', gap: '1.5rem', boxSizing: 'border-box' }}>
      {sortedSections.map((section) => (
        <SectionBlock key={section.id} section={section} />
      ))}
    </div>
  );
};

export default CanvasGrid;
