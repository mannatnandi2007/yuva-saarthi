/**
 * Yuva Saarthi — Session Sidebar Component
 * Phase 4 & Phase 6: Session history sidebar / mobile drawer.
 * Grouped by time (Today, Yesterday, This Week, Earlier), multi-select bulk delete,
 * New Chat button, Contacts drawer link, and Theme toggle.
 */

import React, { useState } from 'react';
import { Plus, Trash2, CheckSquare, Square, X, MessageSquare, Shield, Users } from 'lucide-react';
import ThemeToggle from '../ThemeToggle';

export function SessionSidebar({
  sessions = [],
  groupedSessions = {},
  currentSessionId = null,
  onSelectSession,
  onNewChat,
  onDeleteSession,
  onBulkDelete,
  onOpenContacts,
  isOpen = false,
  onClose = () => {},
  className = '',
}) {
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);

  const toggleSelectId = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleExecuteBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (window.confirm(`Delete ${selectedIds.length} conversations?`)) {
      await onBulkDelete(selectedIds);
      setSelectedIds([]);
      setIsBulkMode(false);
    }
  };

  const renderGroup = (title, list) => {
    if (!list || list.length === 0) return null;

    return (
      <div key={title} style={{ marginBottom: '18px' }}>
        <div
          style={{
            fontSize: '11px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: 'var(--text-muted)',
            padding: '4px 12px',
            fontFamily: 'var(--font-body)',
          }}
        >
          {title}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
          {list.map((sess) => {
            const isSelected = sess.id === currentSessionId;
            const isChecked = selectedIds.includes(sess.id);

            return (
              <div
                key={sess.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: isSelected ? 'var(--lilac)' : 'var(--surface)',
                  color: isSelected ? '#16131F' : 'var(--text)',
                  border: '1.5px solid var(--stroke)',
                  boxShadow: isSelected ? 'var(--shadow-hard-sm)' : 'none',
                  cursor: 'pointer',
                  transition: 'background-color var(--transition-fast)',
                }}
                onClick={() => {
                  if (isBulkMode) {
                    toggleSelectId(sess.id);
                  } else {
                    onSelectSession(sess.id);
                    onClose();
                  }
                }}
              >
                {isBulkMode ? (
                  <button
                    type="button"
                    style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', color: 'inherit' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSelectId(sess.id);
                    }}
                  >
                    {isChecked ? <CheckSquare size={16} strokeWidth={2.5} /> : <Square size={16} strokeWidth={2.5} />}
                  </button>
                ) : (
                  <MessageSquare size={15} strokeWidth={2.2} style={{ flexShrink: 0 }} />
                )}

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: '13px',
                      fontWeight: isSelected ? 700 : 500,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      fontFamily: 'var(--font-body)',
                    }}
                  >
                    {sess.title || 'Conversation'}
                  </div>
                </div>

                {!isBulkMode && (
                  <button
                    type="button"
                    aria-label="Delete session"
                    title="Delete conversation"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm('Delete this conversation?')) {
                        onDeleteSession(sess.id);
                      }
                    }}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: isSelected ? '#16131F' : 'var(--text-muted)',
                      cursor: 'pointer',
                      padding: '4px',
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <Trash2 size={13} strokeWidth={2.2} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(22, 19, 31, 0.45)',
            zIndex: 90,
            display: 'block',
          }}
        />
      )}

      <aside
        className={`session-sidebar ${className}`}
        style={{
          width: '280px',
          height: '100%',
          backgroundColor: 'var(--surface-2)',
          borderRight: 'var(--border-width) solid var(--stroke)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 95,
          flexShrink: 0,
          transition: 'transform var(--transition-normal)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px',
            borderBottom: 'var(--border-width) solid var(--stroke)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: 'var(--radius-pill)',
                backgroundColor: 'var(--lilac)',
                border: '2px solid var(--stroke)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '14px',
                color: '#16131F',
                fontFamily: 'var(--font-heading)',
              }}
            >
              YS
            </div>
            <span
              style={{
                fontFamily: 'var(--font-heading)',
                fontWeight: 700,
                fontSize: '18px',
                color: 'var(--text)',
              }}
            >
              Conversations
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {sessions.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setIsBulkMode(!isBulkMode);
                  setSelectedIds([]);
                }}
                title={isBulkMode ? 'Done' : 'Bulk select'}
                style={{
                  background: isBulkMode ? 'var(--stroke)' : 'var(--surface)',
                  color: isBulkMode ? 'var(--bg)' : 'var(--text)',
                  border: '1.5px solid var(--stroke)',
                  borderRadius: 'var(--radius-pill)',
                  padding: '4px 10px',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {isBulkMode ? 'Cancel' : 'Select'}
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="sidebar-close-btn"
              style={{
                display: 'none',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text)',
                padding: '4px',
              }}
            >
              <X size={18} strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {/* New Chat Primary Action */}
        <div style={{ padding: '12px 16px' }}>
          <button
            type="button"
            onClick={() => {
              onNewChat();
              onClose();
            }}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '10px 16px',
              borderRadius: 'var(--radius-pill)',
              backgroundColor: 'var(--surface)',
              color: 'var(--text)',
              border: 'var(--border-width-control) solid var(--stroke)',
              boxShadow: 'var(--shadow-hard-sm)',
              fontSize: '14px',
              fontWeight: 700,
              fontFamily: 'var(--font-body)',
              cursor: 'pointer',
              transition: 'transform var(--transition-fast)',
            }}
          >
            <Plus size={16} strokeWidth={3} />
            <span>New Chat</span>
          </button>
        </div>

        {/* Bulk Action Bar if active */}
        {isBulkMode && selectedIds.length > 0 && (
          <div
            style={{
              padding: '8px 16px',
              backgroundColor: 'var(--coral)',
              color: '#16131F',
              borderBottom: 'var(--border-width) solid var(--stroke)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '12px',
              fontWeight: 700,
            }}
          >
            <span>{selectedIds.length} selected</span>
            <button
              type="button"
              onClick={handleExecuteBulkDelete}
              style={{
                backgroundColor: 'var(--surface)',
                color: 'var(--text)',
                border: '1.5px solid var(--stroke)',
                borderRadius: 'var(--radius-pill)',
                padding: '4px 10px',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <Trash2 size={12} strokeWidth={2.5} />
              <span>Delete</span>
            </button>
          </div>
        )}

        {/* Sessions Scroll List */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '8px 12px',
          }}
        >
          {sessions.length === 0 ? (
            <div
              style={{
                padding: '32px 12px',
                textAlign: 'center',
                color: 'var(--text-muted)',
                fontSize: '13px',
                fontFamily: 'var(--font-body)',
              }}
            >
              No past conversations yet. Say hello to get started!
            </div>
          ) : (
            <>
              {renderGroup('Today', groupedSessions.today)}
              {renderGroup('Yesterday', groupedSessions.yesterday)}
              {renderGroup('This Week', groupedSessions.thisWeek)}
              {renderGroup('Earlier', groupedSessions.earlier)}
            </>
          )}
        </div>

        {/* Footer Actions: Emergency Contacts & Theme Toggle */}
        <div
          style={{
            padding: '14px 16px',
            borderTop: 'var(--border-width) solid var(--stroke)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            backgroundColor: 'var(--surface)',
          }}
        >
          {onOpenContacts && (
            <button
              type="button"
              onClick={onOpenContacts}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '8px 12px',
                borderRadius: 'var(--radius-pill)',
                backgroundColor: 'var(--mint)',
                color: '#16131F',
                border: '1.5px solid var(--stroke)',
                fontSize: '12px',
                fontWeight: 700,
                fontFamily: 'var(--font-body)',
                cursor: 'pointer',
                boxShadow: 'var(--shadow-hard-sm)',
              }}
            >
              <Users size={14} strokeWidth={2.5} />
              <span>Emergency Contacts</span>
            </button>
          )}

          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <ThemeToggle />
          </div>
        </div>
      </aside>
    </>
  );
}

export default SessionSidebar;
