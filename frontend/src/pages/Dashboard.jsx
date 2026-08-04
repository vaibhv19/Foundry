import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBlueprintStore } from '../store/blueprintStore';
import { useAuthStore } from '../store/authStore';
import { Plus, Trash2, Search, LogOut, FileText } from 'lucide-react';

const Dashboard = () => {
  const { blueprints, fetchBlueprints, createBlueprint, deleteBlueprint, loading } = useBlueprintStore();
  const { user, logout } = useAuthStore();
  const [ideaText, setIdeaText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchBlueprints();
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleSubmitIdea = async (e) => {
    e.preventDefault();
    if (!ideaText.trim()) return;

    setSubmitting(true);
    try {
      const response = await createBlueprint(ideaText);
      setIdeaText('');
      navigate(`/editor/${response.blueprint_id}`);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this blueprint?')) {
      try {
        await deleteBlueprint(id);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const filteredBlueprints = blueprints.filter(
    (bp) =>
      !bp.is_deleted &&
      (bp.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bp.idea?.raw_text?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--base-bg)', color: 'var(--base-text)' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 2rem', borderBottom: '1px solid #1E293B', backgroundColor: '#0F172A' }}>
        <h1 style={{ margin: 0, fontSize: '1.8rem', fontFamily: 'var(--font-serif)', color: 'var(--accent-blueprint)' }}>Foundry</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontSize: '0.9rem', color: '#94A3B8' }}>Welcome, <strong>{user?.name || user?.email}</strong></span>
          <button
            onClick={handleLogout}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', backgroundColor: 'transparent', border: '1px solid #334155', borderRadius: '4px', color: 'var(--base-text)', cursor: 'pointer' }}
          >
            <LogOut size={16} /> Logout
          </button>
        </div>
      </header>

      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1rem' }}>
        <section style={{ backgroundColor: '#1E293B', padding: '1.5rem', borderRadius: '8px', border: '1px solid #334155', marginBottom: '2rem' }}>
          <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.2rem', color: 'var(--base-text)' }}>Forge a New Startup Plan</h2>
          <form onSubmit={handleSubmitIdea} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <textarea
              value={ideaText}
              onChange={(e) => setIdeaText(e.target.value)}
              placeholder="Describe your startup idea in detail (e.g., A subscription box for gourmet coffee roasters, focusing on local sustainable micro-lots...)"
              rows={4}
              style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #475569', backgroundColor: '#0F172A', color: 'var(--base-text)', resize: 'vertical', boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="submit"
                disabled={submitting || !ideaText.trim()}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem', backgroundColor: 'var(--accent-spark)', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', transition: 'opacity 0.2s' }}
              >
                <Plus size={18} /> {submitting ? 'Forging...' : 'Forge Blueprint'}
              </button>
            </div>
          </form>
        </section>

        <section>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ margin: 0, fontSize: '1.4rem' }}>Your Startup Blueprints</h2>
            <div style={{ position: 'relative', width: '300px' }}>
              <input
                type="text"
                placeholder="Search blueprints..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: '100%', padding: '0.5rem 1rem 0.5rem 2.2rem', borderRadius: '4px', border: '1px solid #334155', backgroundColor: '#1E293B', color: 'var(--base-text)', boxSizing: 'border-box' }}
              />
              <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#64748B' }} />
            </div>
          </div>

          {loading && blueprints.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#94A3B8' }}>Loading your blueprints...</div>
          ) : filteredBlueprints.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', backgroundColor: '#1E293B', border: '1px dashed #334155', borderRadius: '8px', color: '#94A3B8' }}>
              No blueprints found. Submit an idea above to start!
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
              {filteredBlueprints.map((bp) => (
                <div
                  key={bp.id}
                  onClick={() => navigate(`/editor/${bp.id}`)}
                  style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '1.5rem', backgroundColor: '#1E293B', border: '1px solid #334155', borderRadius: '8px', cursor: 'pointer', transition: 'transform 0.2s, border-color 0.2s', position: 'relative' }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent-blueprint)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#334155'; }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                      <FileText size={18} style={{ color: 'var(--accent-blueprint)' }} />
                      <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', borderRadius: '12px', backgroundColor: bp.status === 'READY' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)', color: bp.status === 'READY' ? '#10B981' : '#F59E0B' }}>
                        {bp.status}
                      </span>
                    </div>
                    <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem', color: 'var(--base-text)' }}>{bp.title}</h3>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#94A3B8', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                      {bp.idea?.raw_text}
                    </p>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', borderTop: '1px solid #334155', paddingTop: '0.75rem' }}>
                    <span style={{ fontSize: '0.75rem', color: '#64748B' }}>
                      {new Date(bp.created_at).toLocaleDateString()}
                    </span>
                    <button
                      onClick={(e) => handleDelete(e, bp.id)}
                      style={{ padding: '0.3rem', backgroundColor: 'transparent', border: 'none', color: '#EF4444', cursor: 'pointer', opacity: 0.8 }}
                      onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.8'; }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default Dashboard;
