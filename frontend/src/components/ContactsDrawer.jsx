import React from 'react';
import { Users, Phone, ShieldCheck, X, ShieldAlert } from 'lucide-react';

/**
 * Emergency Contacts Slide-out Drawer
 * Displays the verified emergency contacts and escalation priority (Priority 1 -> 2 -> 3)
 */
export default function ContactsDrawer({ isOpen, onClose, contacts = [] }) {
  if (!isOpen) return null;

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9998,
        background: 'rgba(9, 3, 6, 0.75)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        justifyContent: 'flex-end',
        transition: 'opacity 0.25s ease'
      }}
      onClick={onClose}
    >
      <div 
        style={{
          width: '100%',
          maxWidth: '420px',
          height: '100%',
          background: 'var(--bg-secondary)',
          borderLeft: '1px solid var(--border-glow)',
          boxShadow: '-8px 0 40px rgba(0, 0, 0, 0.6)',
          display: 'flex',
          flexDirection: 'column',
          padding: '28px 24px',
          color: 'var(--text-primary)',
          overflowY: 'auto'
        }}
        onClick={(e) => e.stopPropagation()}
        className="animate-slideleft"
      >
        {/* Drawer Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ 
              width: '36px', height: '36px', borderRadius: '10px', 
              background: 'rgba(255, 30, 86, 0.12)', border: '1px solid rgba(255, 30, 86, 0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Users size={18} color="var(--accent-crimson)" />
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-pink)', letterSpacing: '0.1em' }}>
                SAFETY NETWORK
              </div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '800', margin: 0 }}>
                Emergency Contacts
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '8px',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Priority Order Info */}
        <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', lineHeight: '1.5', marginTop: 0, marginBottom: '20px' }}>
          In the event of an acute self-harm crisis, Yuva Saarthi dispatches sequential emergency voice alerts to these contacts in exact numerical order.
        </p>

        {/* Contacts List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', flex: 1 }}>
          {contacts && contacts.length > 0 ? (
            contacts
              .slice()
              .sort((a, b) => (a.priority_order || 1) - (b.priority_order || 1))
              .map((c, idx) => {
                const priority = c.priority_order || idx + 1;
                const name = c.first_name || c.name || `Contact #${priority}`;
                const rel = c.relationship || 'Emergency Contact';
                const phone = c.phone || '—';

                return (
                  <div
                    key={c.id || idx}
                    style={{
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '14px',
                      padding: '16px',
                      position: 'relative',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ 
                        fontSize: '0.72rem', 
                        fontFamily: 'var(--font-mono)', 
                        padding: '3px 8px', 
                        borderRadius: '6px',
                        background: priority === 1 ? 'rgba(255, 30, 86, 0.2)' : 'rgba(244, 114, 182, 0.1)',
                        color: priority === 1 ? 'var(--accent-crimson)' : 'var(--accent-pink)',
                        fontWeight: '700'
                      }}>
                        PRIORITY #{priority}
                      </span>
                      <ShieldCheck size={16} color="var(--accent-pink)" />
                    </div>

                    <div style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                      {name}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.84rem', color: 'var(--text-muted)' }}>
                      <span>Relationship: <strong style={{ color: 'var(--text-secondary)' }}>{rel}</strong></span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.86rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      <Phone size={14} color="var(--accent-crimson)" />
                      <span style={{ fontFamily: 'var(--font-mono)' }}>{phone}</span>
                    </div>
                  </div>
                );
              })
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
              No emergency contacts registered yet.
            </div>
          )}
        </div>

        {/* Abuse safeguard reminder box */}
        <div style={{ 
          marginTop: 'auto', 
          padding: '14px 16px', 
          background: 'rgba(255, 30, 86, 0.06)', 
          border: '1px solid rgba(255, 30, 86, 0.2)', 
          borderRadius: '12px',
          display: 'flex',
          gap: '10px'
        }}>
          <ShieldAlert size={18} color="var(--accent-crimson)" style={{ flexShrink: 0, marginTop: '2px' }} />
            <strong style={{ color: 'var(--accent-rose)' }}>Safe Haven Policy:</strong> If family safety or domestic concerns are detected, your contacts will never be dialed to protect your privacy and safety.
        </div>

      </div>
    </div>
  );
}
