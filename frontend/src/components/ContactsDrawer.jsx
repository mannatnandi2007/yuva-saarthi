/**
 * Yuva Saarthi — Emergency Contacts Slide-out Drawer
 * Phase 5 & 6: Displays priority emergency contacts (SMS, Telegram, Email channels)
 * Flat pastel design system, solid strokes, zero gradients.
 */

import React from 'react';
import { Users, Phone, X, ShieldAlert, Mail, Send } from 'lucide-react';

export default function ContactsDrawer({ isOpen, onClose, contacts = [] }) {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Emergency Contacts Network"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9998,
        backgroundColor: 'rgba(22, 19, 31, 0.55)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        display: 'flex',
        justifyContent: 'flex-end',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '420px',
          height: '100%',
          backgroundColor: 'var(--surface)',
          borderLeft: 'var(--border-width) solid var(--stroke)',
          display: 'flex',
          flexDirection: 'column',
          padding: '24px 20px',
          color: 'var(--text)',
          overflowY: 'auto',
          boxShadow: 'var(--shadow-hard-lg)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '20px',
            borderBottom: 'var(--border-width) solid var(--stroke)',
            paddingBottom: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: 'var(--radius-pill)',
                backgroundColor: 'var(--mint)',
                border: 'var(--border-width) solid var(--stroke)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#16131F',
              }}
            >
              <Users size={18} strokeWidth={2.5} />
            </div>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Safety Network
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 800, fontFamily: 'var(--font-heading)', margin: 0 }}>
                Emergency Contacts
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close contacts drawer"
            style={{
              width: '36px',
              height: '36px',
              borderRadius: 'var(--radius-pill)',
              border: 'var(--border-width) solid var(--stroke)',
              backgroundColor: 'var(--surface-2)',
              color: 'var(--text)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={18} strokeWidth={2.5} />
          </button>
        </div>

        {/* Safety Policy Notice */}
        <div
          style={{
            padding: '12px 14px',
            backgroundColor: 'var(--surface-2)',
            borderRadius: 'var(--radius-md)',
            border: 'var(--border-width) solid var(--stroke)',
            marginBottom: '20px',
            fontSize: '12px',
            lineHeight: 1.5,
            color: 'var(--text)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, marginBottom: '4px' }}>
            <ShieldAlert size={14} strokeWidth={2.5} color="var(--coral)" />
            <span>How Contacts Are Reached</span>
          </div>
          Contacts are only alerted if extreme self-harm is detected. Notifications are sent sequentially (Priority 1, then 2, then 3). Abuse disclosures are strictly kept confidential and never sent to personal contacts.
        </div>

        {/* Contacts List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
          {contacts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-muted)', fontSize: '14px' }}>
              No emergency contacts configured yet.
            </div>
          ) : (
            contacts.map((c, i) => (
              <div
                key={c.id || i}
                style={{
                  padding: '14px 16px',
                  borderRadius: 'var(--radius-lg)',
                  backgroundColor: 'var(--surface)',
                  border: 'var(--border-width) solid var(--stroke)',
                  boxShadow: 'var(--shadow-hard-sm)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, fontSize: '15px' }}>
                    {c.name || `Contact ${i + 1}`}
                  </span>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      backgroundColor: i === 0 ? 'var(--lilac)' : 'var(--surface-2)',
                      color: '#16131F',
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-pill)',
                      border: '1px solid var(--stroke)',
                    }}
                  >
                    Priority {c.priority || i + 1}
                  </span>
                </div>

                <div style={{ fontSize: '13px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Phone size={13} strokeWidth={2.5} />
                  <span>{c.phone_number || c.phone || 'No phone'}</span>
                </div>

                {c.email && (
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Mail size={12} strokeWidth={2.5} />
                    <span>{c.email}</span>
                  </div>
                )}

                {c.telegram_chat_id && (
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Send size={12} strokeWidth={2.5} />
                    <span>Telegram ID: {c.telegram_chat_id}</span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
