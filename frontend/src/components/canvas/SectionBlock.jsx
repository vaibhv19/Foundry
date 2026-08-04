import React, { useEffect, useState } from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import { useBlueprintStore } from '../../store/blueprintStore';
import apiClient from '../../api/client';
import { Edit3 } from 'lucide-react';
import DecisionAnchor from './DecisionAnchor';

const SectionBlock = ({ section }) => {
  const [versions, setVersions] = useState([]);
  const activeSection = useCanvasStore((state) => state.activeSection);
  const selectSection = useCanvasStore((state) => state.selectSection);
  const restoreVersion = useCanvasStore((state) => state.restoreVersion);
  const currentBlueprint = useBlueprintStore((state) => state.currentBlueprint);
  const activeVersions = useCanvasStore((state) => state.activeVersions);
  const setActiveVersionForSection = useCanvasStore((state) => state.setActiveVersionForSection);

  const [selectedDecision, setSelectedDecision] = useState(null);

  const activeDecisions = currentBlueprint?.decisions?.filter((d) => d.is_active) || [];

  const activeVersion = versions.find((v) => v.is_active) || versions[0];

  useEffect(() => {
    const loadVersions = async () => {
      try {
        const response = await apiClient.get(`/sections/${section.id}/versions/`);
        setVersions(response.data);
        const activeV = response.data.find(v => v.is_active);
        if (activeV) {
          setActiveVersionForSection(section.id, activeV);
        }
      } catch (err) {
        console.error(err);
      }
    };
    loadVersions();
  }, [section.id, currentBlueprint?.status, activeVersions[section.id]?.id]);

  const handleSelect = () => {
    selectSection(section);
  };

  const handleRestore = async (versionId) => {
    try {
      await restoreVersion(versionId);
    } catch (err) {
      console.error(err);
    }
  };

  const renderMarkdownLineWithAnchors = (line) => {
    if (!line) return '';
    if (activeDecisions.length === 0) return line;

    const sortedDecs = [...activeDecisions].sort((a, b) => b.choice_value.length - a.choice_value.length);
    let parts = [line];

    for (const dec of sortedDecs) {
      const val = dec.choice_value;
      if (!val) continue;

      const newParts = [];
      for (const part of parts) {
        if (typeof part !== 'string') {
          newParts.push(part);
          continue;
        }

        const index = part.toLowerCase().indexOf(val.toLowerCase());
        if (index !== -1) {
          const before = part.substring(0, index);
          const match = part.substring(index, index + val.length);
          const after = part.substring(index + val.length);

          if (before) newParts.push(before);

          newParts.push(
            <span key={dec.id} style={{ borderBottom: '1px dashed var(--accent-blueprint)', position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
              <span style={{ fontWeight: '500', color: 'var(--accent-blueprint)' }}>{match}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedDecision(dec);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '0 2px',
                  color: 'var(--accent-blueprint)',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                }}
                title="View Decision Details"
              >
                ⚓
              </button>
            </span>
          );

          if (after) {
            newParts.push(after);
          }
        } else {
          newParts.push(part);
        }
      }
      parts = newParts;
    }

    return parts;
  };

  const renderContent = (text) => {
    if (!text) {
      return (
        <div style={{ padding: '2rem', textAlign: 'center', color: '#64748B', fontStyle: 'italic', fontSize: '0.9rem' }}>
          No content generated yet. Use the sidebar to forge content.
        </div>
      );
    }

    const lines = text.split('\n');
    return lines.map((line, i) => {
      const processedLine = renderMarkdownLineWithAnchors(line);

      if (line.startsWith('### ')) {
        return (
          <h4 key={i} style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-spark)', margin: '1rem 0 0.5rem 0', borderBottom: '1px solid #1E293B', paddingBottom: '0.25rem' }}>
            {processedLine}
          </h4>
        );
      }
      if (line.startsWith('## ')) {
        return (
          <h3 key={i} style={{ fontFamily: 'var(--font-serif)', color: 'var(--base-text)', margin: '1.2rem 0 0.6rem 0' }}>
            {processedLine}
          </h3>
        );
      }
      if (line.startsWith('# ')) {
        return (
          <h2 key={i} style={{ fontFamily: 'var(--font-serif)', color: 'var(--accent-blueprint)', margin: '1.5rem 0 0.75rem 0' }}>
            {processedLine}
          </h2>
        );
      }
      if (line.startsWith('- ') || line.startsWith('* ')) {
        const markerLess = line.substring(2);
        return (
          <li key={i} style={{ marginLeft: '1rem', marginBottom: '0.4rem', color: '#E2E8F0' }}>
            {renderMarkdownLineWithAnchors(markerLess)}
          </li>
        );
      }
      return (
        <p key={i} style={{ margin: '0 0 0.75rem 0', color: '#CBD5E1', fontSize: '0.95rem' }}>
          {processedLine}
        </p>
      );
    });
  };

  const isSelected = activeSection?.id === section.id;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#1E293B',
        border: isSelected ? '2px solid var(--accent-blueprint)' : '1px solid #334155',
        borderRadius: '8px',
        padding: '1.5rem',
        boxSizing: 'border-box',
        transition: 'border-color 0.2s',
        position: 'relative',
        minHeight: '350px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #334155', paddingBottom: '0.5rem' }}>
        <div>
          <span style={{ fontSize: '0.7rem', color: '#64748B', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>
            {section.category}
          </span>
          <h3 style={{ margin: 0, fontSize: '1.2rem', fontFamily: 'var(--font-serif)', color: 'var(--base-text)' }}>
            {section.title}
          </h3>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            onClick={handleSelect}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              padding: '0.3rem 0.6rem',
              backgroundColor: isSelected ? 'var(--accent-blueprint)' : 'transparent',
              border: '1px solid var(--accent-blueprint)',
              borderRadius: '4px',
              color: isSelected ? '#0F172A' : 'var(--accent-blueprint)',
              cursor: 'pointer',
              fontSize: '0.75rem',
              fontWeight: 'bold',
            }}
          >
            <Edit3 size={12} /> Edit
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '1rem' }}>
        {versions.map((v) => (
          <button
            key={v.id}
            onClick={() => handleRestore(v.id)}
            style={{
              padding: '0.2rem 0.5rem',
              borderRadius: '12px',
              border: 'none',
              backgroundColor: v.is_active ? 'var(--accent-spark)' : '#334155',
              color: 'white',
              fontSize: '0.7rem',
              fontFamily: 'var(--font-mono)',
              cursor: 'pointer',
              fontWeight: v.is_active ? 'bold' : 'normal',
            }}
          >
            v{v.version_number}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', maxHeight: '400px' }}>
        {renderContent(activeVersion?.content_markdown)}
      </div>

      {selectedDecision && (
        <DecisionAnchor
          decision={selectedDecision}
          onClose={() => setSelectedDecision(null)}
        />
      )}
    </div>
  );
};

export default SectionBlock;
