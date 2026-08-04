import React, { useState } from 'react';
import apiClient from '../../api/client';
import { Download, FileText, CheckCircle2, AlertCircle } from 'lucide-react';

const ExportPanel = ({ blueprintId }) => {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleExport = async (format) => {
    setDownloading(true);
    setError('');
    setSuccess('');

    try {
      const response = await apiClient.post(`/exports/${blueprintId}/trigger/`, {
        format: format
      });

      const { export_url } = response.data;
      if (export_url) {
        const responseFile = await apiClient.get(`/exports/${blueprintId}/download/`, {
          responseType: 'blob'
        });

        const url = window.URL.createObjectURL(new Blob([responseFile.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `blueprint_${blueprintId}.md`);
        document.body.appendChild(link);
        link.click();
        link.remove();

        setSuccess(`Document exported as ${format} successfully!`);
      }
    } catch (err) {
      setError(err.message || 'Export trigger failed.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div style={{ backgroundColor: '#1E293B', padding: '1.5rem', borderRadius: '8px', border: '1px solid #334155', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--base-text)' }}>Export Compiled Document</h3>
      <p style={{ margin: 0, fontSize: '0.85rem', color: '#94A3B8', lineHeight: '1.4' }}>
        Download the unified startup plan document compiling all active section versions.
      </p>

      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid #EF4444', borderRadius: '4px', color: '#F87171', fontSize: '0.8rem' }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', backgroundColor: 'rgba(16, 185, 129, 0.1)', border: '1px solid #10B981', borderRadius: '4px', color: '#34D399', fontSize: '0.8rem' }}>
          <CheckCircle2 size={16} />
          <span>{success}</span>
        </div>
      )}

      <div style={{ display: 'flex', gap: '1rem' }}>
        <button
          onClick={() => handleExport('MARKDOWN')}
          disabled={downloading}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            padding: '0.75rem',
            backgroundColor: 'var(--accent-blueprint)',
            color: '#0F172A',
            border: 'none',
            borderRadius: '4px',
            fontWeight: 'bold',
            cursor: 'pointer',
            fontSize: '0.85rem'
          }}
        >
          <FileText size={16} />
          Export MD
        </button>

        <button
          onClick={() => handleExport('PDF')}
          disabled={downloading}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            padding: '0.75rem',
            backgroundColor: 'transparent',
            border: '1px solid var(--accent-blueprint)',
            color: 'var(--accent-blueprint)',
            borderRadius: '4px',
            fontWeight: 'bold',
            cursor: 'pointer',
            fontSize: '0.85rem'
          }}
        >
          <Download size={16} />
          Export PDF
        </button>
      </div>
    </div>
  );
};

export default ExportPanel;
