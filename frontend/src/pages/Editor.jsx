import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useBlueprintStore } from '../store/blueprintStore';
import { useStrategyStore } from '../store/strategyStore';
import { useCanvasStore } from '../store/canvasStore';
import socketManager from '../api/websocket';

import MissionControlLayout from '../components/layout/MissionControlLayout';
import TopBar from '../components/layout/TopBar';
import LeftRail from '../components/layout/LeftRail';
import RightRail from '../components/layout/RightRail';
import StreamingPane from '../components/strategy/StreamingPane';
import CanvasGrid from '../components/canvas/CanvasGrid';
import RewriteSidebar from '../components/canvas/RewriteSidebar';
import ExportPanel from '../components/export/ExportPanel';
import { Layers, FileCode } from 'lucide-react';

const Editor = () => {
  const { blueprint_id } = useParams();
  const { currentBlueprint, fetchBlueprintDetails, loading: bpLoading } = useBlueprintStore();
  const isStreaming = useStrategyStore((state) => state.isStreaming);
  const convergenceProgress = useStrategyStore((state) => state.convergenceProgress);

  const [activeTab, setActiveTab] = useState('canvas');

  useEffect(() => {
    fetchBlueprintDetails(blueprint_id);
    socketManager.connect(blueprint_id);

    return () => {
      socketManager.disconnect();
    };
  }, [blueprint_id]);

  if (bpLoading && !currentBlueprint) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--base-bg)', color: 'var(--base-text)' }}>
        Loading Blueprint Workspace...
      </div>
    );
  }

  if (!currentBlueprint) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--base-bg)', color: '#EF4444' }}>
        Blueprint not found.
      </div>
    );
  }

  const renderCenterView = () => {
    if (isStreaming || currentBlueprint.status === 'GENERATING') {
      return (
        <div style={{ height: 'calc(100vh - 120px)', padding: '1rem', backgroundColor: '#1E293B', borderRadius: '8px', border: '1px solid #334155' }}>
          <StreamingPane />
        </div>
      );
    }

    if (activeTab === 'export') {
      return <ExportPanel blueprintId={blueprint_id} />;
    }

    return (
      <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'start' }}>
        <div style={{ flex: 1 }}>
          <CanvasGrid sections={currentBlueprint.sections || []} />
        </div>
        <div style={{ width: '320px', backgroundColor: '#1E293B', border: '1px solid #334155', borderRadius: '8px', position: 'sticky', top: '1.5rem' }}>
          <RewriteSidebar />
        </div>
      </div>
    );
  };

  return (
    <MissionControlLayout
      topbar={
        <TopBar
          title={currentBlueprint.title}
          status={currentBlueprint.status}
          convergenceProgress={convergenceProgress}
        />
      }
      leftrail={<LeftRail />}
      rightrail={<RightRail />}
    >
      {!(isStreaming || currentBlueprint.status === 'GENERATING') && (
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid #1E293B', paddingBottom: '0.75rem' }}>
          <button
            onClick={() => setActiveTab('canvas')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 1rem',
              backgroundColor: activeTab === 'canvas' ? '#1E293B' : 'transparent',
              border: 'none',
              borderBottom: activeTab === 'canvas' ? '2px solid var(--accent-blueprint)' : 'none',
              color: activeTab === 'canvas' ? 'var(--accent-blueprint)' : '#94A3B8',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '0.9rem',
            }}
          >
            <Layers size={16} /> Interactive Canvas
          </button>

          <button
            onClick={() => setActiveTab('export')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 1rem',
              backgroundColor: activeTab === 'export' ? '#1E293B' : 'transparent',
              border: 'none',
              borderBottom: activeTab === 'export' ? '2px solid var(--accent-blueprint)' : 'none',
              color: activeTab === 'export' ? 'var(--accent-blueprint)' : '#94A3B8',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '0.9rem',
            }}
          >
            <FileCode size={16} /> Compile & Export
          </button>
        </div>
      )}

      {renderCenterView()}
    </MissionControlLayout>
  );
};

export default Editor;
