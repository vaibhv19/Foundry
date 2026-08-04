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
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#05080A',
      background: 'radial-gradient(circle at 50% 120px, #0B1C1A 0%, #05080A 100%)',
      color: '#E2E8F0',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400..700;1,400..700&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap');
        
        .dash-card {
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          background-color: rgba(13, 20, 24, 0.65) !important;
          border: 1px solid rgba(197, 168, 128, 0.08) !important;
          backdrop-filter: blur(12px);
        }
        .dash-card:hover {
          border-color: rgba(197, 168, 128, 0.35) !important;
          transform: translateY(-2px);
          box-shadow: 0 12px 24px -10px rgba(0, 0, 0, 0.5), 0 0 30px rgba(197, 168, 128, 0.01);
        }
        .dash-input {
          transition: border-color 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease;
          font-family: 'Plus Jakarta Sans', sans-serif;
        }
        .dash-input::placeholder {
          color: #3A474D !important;
          opacity: 1;
        }
        .dash-input:hover {
          border-color: rgba(197, 168, 128, 0.2) !important;
        }
        .dash-input:focus {
          border-color: #C5A880 !important;
          box-shadow: 0 0 0 3px rgba(197, 168, 128, 0.1);
          background-color: #070B0D !important;
          outline: none;
        }
        .dash-btn-primary {
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          font-family: 'Plus Jakarta Sans', sans-serif;
        }
        .dash-btn-primary:hover:not(:disabled) {
          background-color: #D5BC98 !important;
          box-shadow: 0 4px 12px rgba(197, 168, 128, 0.2);
        }
        .dash-btn-secondary {
          transition: all 0.15s ease;
          font-family: 'Plus Jakarta Sans', sans-serif;
        }
        .dash-btn-secondary:hover {
          background-color: rgba(255, 255, 255, 0.04) !important;
          border-color: rgba(197, 168, 128, 0.3) !important;
        }
        .trash-btn {
          transition: color 0.15s ease;
        }
        .trash-btn:hover {
          color: #F87171 !important;
        }
      `}</style>

      <header style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '1.25rem 2rem',
        borderBottom: '1px solid rgba(197, 168, 128, 0.1)',
        backgroundColor: 'rgba(13, 20, 24, 0.85)',
        backdropFilter: 'blur(8px)',
        boxSizing: 'border-box'
      }}>
        {/* Convergent Debate Wordmark Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="24" height="24">
            <defs>
              <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#E2C9A1" />
                <stop offset="100%" stopColor="#C5A880" />
              </linearGradient>
            </defs>
            <circle cx="50" cy="50" r="38" stroke="rgba(197, 168, 128, 0.15)" strokeWidth="2.5" fill="none" />
            <path d="M50,28 L50,48" stroke="url(#goldGrad)" strokeWidth="5" strokeLinecap="round" />
            <path d="M34,62 L50,48" stroke="url(#goldGrad)" strokeWidth="5" strokeLinecap="round" />
            <path d="M66,62 L50,48" stroke="url(#goldGrad)" strokeWidth="5" strokeLinecap="round" />
            <circle cx="50" cy="48" r="5" fill="#C5A880" />
          </svg>
          <h1 style={{
            margin: 0,
            fontSize: '1.4rem',
            fontFamily: "'Lora', serif",
            fontWeight: '600',
            color: '#C5A880',
            letterSpacing: '-0.015em'
          }}>
            Foundry
          </h1>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <span style={{ fontSize: '0.85rem', color: '#94A3B8' }}>
            Welcome, <strong style={{ color: '#E2E8F0', fontWeight: '600' }}>{user?.name || user?.email}</strong>
          </span>
          <button
            onClick={handleLogout}
            className="dash-btn-secondary"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 0.85rem',
              backgroundColor: 'transparent',
              border: '1px solid #1E292B',
              borderRadius: '6px',
              color: '#94A3B8',
              cursor: 'pointer',
              fontSize: '0.8rem',
              fontWeight: '500'
            }}
          >
            <LogOut size={14} /> Logout
          </button>
        </div>
      </header>

      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '2.5rem 1.5rem', boxSizing: 'border-box' }}>
        {/* Input Panel Card */}
        <section className="dash-card" style={{
          padding: '2rem',
          borderRadius: '12px',
          marginBottom: '2.5rem',
          boxSizing: 'border-box'
        }}>
          <h2 style={{
            margin: '0 0 1rem 0',
            fontSize: '1.4rem',
            fontFamily: "'Lora', serif",
            color: '#E2E8F0',
            fontWeight: '600'
          }}>
            Forge a New Startup Plan
          </h2>
          <form onSubmit={handleSubmitIdea} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <textarea
              value={ideaText}
              onChange={(e) => setIdeaText(e.target.value)}
              placeholder="Describe your startup idea in detail (e.g., A subscription box for gourmet coffee roasters, focusing on local sustainable micro-lots...)"
              rows={4}
              className="dash-input"
              style={{
                width: '100%',
                padding: '1rem',
                borderRadius: '8px',
                border: '1px solid #1E292B',
                backgroundColor: '#070B0D',
                color: '#F1F5F9',
                resize: 'vertical',
                boxSizing: 'border-box',
                fontSize: '0.9rem',
                lineHeight: '1.5',
                fontFamily: "'Plus Jakarta Sans', sans-serif"
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="submit"
                disabled={submitting || !ideaText.trim()}
                className="dash-btn-primary"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#C5A880',
                  color: '#030608',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: '600',
                  fontSize: '0.9rem',
                  cursor: 'pointer'
                }}
              >
                <Plus size={16} strokeWidth={2.5} /> {submitting ? 'Forging...' : 'Forge Blueprint'}
              </button>
            </div>
          </form>
        </section>

        {/* Blueprint List Section */}
        <section>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1.75rem',
            gap: '1.5rem',
            flexWrap: 'wrap'
          }}>
            <h2 style={{
              margin: 0,
              fontSize: '1.5rem',
              fontFamily: "'Lora', serif",
              color: '#E2E8F0',
              fontWeight: '600'
            }}>
              Your Startup Blueprints
            </h2>
            <div style={{ position: 'relative', width: '100%', maxWidth: '300px' }}>
              <input
                type="text"
                placeholder="Search blueprints..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="dash-input"
                style={{
                  width: '100%',
                  padding: '0.6rem 1rem 0.6rem 2.25rem',
                  borderRadius: '6px',
                  border: '1px solid #1E292B',
                  backgroundColor: 'rgba(13, 20, 24, 0.6)',
                  color: '#F1F5F9',
                  boxSizing: 'border-box',
                  fontSize: '0.85rem'
                }}
              />
              <Search size={14} style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', color: '#475569' }} />
            </div>
          </div>

          {loading && blueprints.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem 0', color: '#8A99AD', fontSize: '0.9rem' }}>
              Loading your blueprints...
            </div>
          ) : filteredBlueprints.length === 0 ? (
            /* Styled Empty State aligned directly on page background */
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              padding: '3rem 2rem',
              color: '#8A99AD'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: '#070B0D',
                border: '1px solid rgba(197, 168, 128, 0.08)',
                marginBottom: '1.25rem'
              }}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="30" height="30">
                  <path d="M34,68 L48,34" stroke="rgba(197, 168, 128, 0.3)" strokeWidth="6" strokeLinecap="round" />
                  <path d="M66,68 L52,34" stroke="rgba(197, 168, 128, 0.3)" strokeWidth="6" strokeLinecap="round" />
                  <path d="M50,70 L50,42" stroke="rgba(197, 168, 128, 0.3)" strokeWidth="6" strokeLinecap="round" />
                  <polygon points="50,16 56,24 50,32 44,24" fill="rgba(197, 168, 128, 0.3)" />
                </svg>
              </div>
              <p style={{ margin: '0 0 0.25rem 0', fontWeight: '500', color: '#E2E8F0', fontSize: '0.95rem' }}>
                No blueprints found
              </p>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748B' }}>
                Submit a startup idea in the forge box above to generate your strategy.
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.75rem' }}>
              {filteredBlueprints.map((bp) => (
                <div
                  key={bp.id}
                  onClick={() => navigate(`/editor/${bp.id}`)}
                  className="dash-card"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    padding: '1.5rem',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    position: 'relative',
                    boxSizing: 'border-box'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
                      <FileText size={16} style={{ color: '#C5A880' }} />
                      <span style={{
                        fontSize: '0.7rem',
                        fontWeight: '600',
                        letterSpacing: '0.04em',
                        padding: '0.2rem 0.6rem',
                        borderRadius: '4px',
                        backgroundColor: bp.status === 'READY' ? 'rgba(30, 94, 78, 0.15)' : 'rgba(197, 168, 128, 0.1)',
                        border: bp.status === 'READY' ? '1px solid rgba(30, 94, 78, 0.25)' : '1px solid rgba(197, 168, 128, 0.2)',
                        color: bp.status === 'READY' ? '#3CD070' : '#C5A880'
                      }}>
                        {bp.status}
                      </span>
                    </div>
                    <h3 style={{
                      margin: '0 0 0.5rem 0',
                      fontSize: '1.05rem',
                      fontWeight: '600',
                      color: '#F1F5F9',
                      letterSpacing: '-0.01em'
                    }}>
                      {bp.title}
                    </h3>
                    <p style={{
                      margin: 0,
                      fontSize: '0.85rem',
                      color: '#8A99AD',
                      lineHeight: '1.45',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical'
                    }}>
                      {bp.idea?.raw_text}
                    </p>
                  </div>

                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: '1.5rem',
                    borderTop: '1px solid rgba(255, 255, 255, 0.04)',
                    paddingTop: '0.85rem',
                    boxSizing: 'border-box'
                  }}>
                    <span style={{ fontSize: '0.75rem', color: '#475569' }}>
                      {new Date(bp.created_at).toLocaleDateString()}
                    </span>
                    <button
                      onClick={(e) => handleDelete(e, bp.id)}
                      className="trash-btn"
                      style={{
                        padding: '0.35rem',
                        backgroundColor: 'transparent',
                        border: 'none',
                        color: '#C94A4A',
                        cursor: 'pointer'
                      }}
                    >
                      <Trash2 size={15} />
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
