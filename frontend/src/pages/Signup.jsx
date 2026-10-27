/**
 * Yuva Saarthi — Onboarding & Login Page
 * Phase 5 & 6: Modern flat pastel aesthetic, zero gradients, solid strokes.
 * Pure SVG YusaCompanion, multi-channel emergency contacts (Phone + optional Telegram/Email).
 */

import React, { useState } from 'react';
import {
  User,
  Phone,
  Users,
  ShieldAlert,
  Plus,
  Trash2,
  AlertCircle,
  ArrowRight,
  Send,
  Mail,
  Lock,
} from 'lucide-react';
import apiClient from '../api/client.js';
import YusaCompanion from '../components/YusaCompanion.jsx';

export default function Signup({
  onComplete,
  onNavigate,
  initialMode = 'signup',
  onBackToLanding = null,
  hideSideMascot = false,
}) {
  const [isLoginMode, setIsLoginMode] = useState(initialMode === 'login');
  const [loginUsername, setLoginUsername] = useState('');

  // Sign up state
  const [username, setUsername] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [userPhone, setUserPhone] = useState(''); // exactly 10 digits
  const [ageBand, setAgeBand] = useState('16-17');
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Array of emergency contacts (max 3, min 1)
  const [contacts, setContacts] = useState([
    {
      first_name: '',
      last_name: '',
      phone: '',
      email: '',
      telegram_chat_id: '',
      relationship: 'Parent',
      priority_order: 1,
    },
  ]);

  const addContact = () => {
    if (contacts.length < 3) {
      setContacts([
        ...contacts,
        {
          first_name: '',
          last_name: '',
          phone: '',
          email: '',
          telegram_chat_id: '',
          relationship: 'Guardian',
          priority_order: contacts.length + 1,
        },
      ]);
    }
  };

  const removeContact = (index) => {
    const updated = contacts
      .filter((_, i) => i !== index)
      .map((c, i) => ({ ...c, priority_order: i + 1 }));
    setContacts(updated);
  };

  const updateContact = (index, field, value) => {
    const updated = [...contacts];
    updated[index] = { ...updated[index], [field]: value };
    setContacts(updated);
  };

  const handlePhoneChange = (setter) => (e) => {
    const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 10);
    setter(digitsOnly);
  };

  const handleContactPhoneChange = (index) => (e) => {
    const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 10);
    updateContact(index, 'phone', digitsOnly);
  };

  const handleDirectLogin = async (e) => {
    e.preventDefault();
    setError(null);
    const clean = loginUsername.trim().toLowerCase();
    if (!clean) {
      setError('Please enter your username.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await apiClient.post('/auth/login', { username: clean });
      if (res.data?.status === 'success' || res.data?.user_id) {
        onComplete(res.data);
        onNavigate('chat');
      }
    } catch (err) {
      const msg = err.response?.data?.detail || 'Could not find account. Please check username or create an account.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const cleanUsername = username.trim().toLowerCase();
    if (!cleanUsername || cleanUsername.length < 3) {
      setError('Username must be at least 3 characters long.');
      return;
    }
    if (!/^[a-zA-Z0-9_.-]+$/.test(cleanUsername)) {
      setError('Username can only contain letters, numbers, hyphens, and underscores.');
      return;
    }
    if (!firstName.trim()) {
      setError('Please enter your first name.');
      return;
    }
    if (!lastName.trim()) {
      setError('Please enter your last name.');
      return;
    }
    if (userPhone.length !== 10) {
      setError('Please enter your 10-digit mobile number.');
      return;
    }

    const seenContacts = new Set();
    for (let i = 0; i < contacts.length; i++) {
      const c = contacts[i];
      if (!c.first_name.trim()) {
        setError(`Please enter the first name for emergency contact #${i + 1}.`);
        return;
      }
      if (!c.last_name.trim()) {
        setError(`Please enter the last name for emergency contact #${i + 1}.`);
        return;
      }
      if (c.phone.length !== 10) {
        setError(`Please enter a valid 10-digit mobile number for ${c.first_name} (Contact #${i + 1}).`);
        return;
      }
      if (userPhone === c.phone) {
        setError(`Emergency contact #${i + 1} (${c.first_name}) cannot be your own phone number.`);
        return;
      }
      if (seenContacts.has(c.phone)) {
        setError(`Emergency contact #${i + 1} has a duplicate mobile number.`);
        return;
      }
      seenContacts.add(c.phone);
    }

    setIsSubmitting(true);
    const payload = {
      username: cleanUsername,
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      phone: `+91${userPhone}`,
      age_band: ageBand,
      consent_given: true,
      policy_ack: true,
      emergency_contacts: contacts.map((c) => ({
        first_name: c.first_name.trim(),
        last_name: c.last_name.trim(),
        relationship: c.relationship,
        phone: `+91${c.phone}`,
        email: c.email ? c.email.trim() : null,
        telegram_chat_id: c.telegram_chat_id ? c.telegram_chat_id.trim() : null,
        priority_order: c.priority_order,
      })),
    };

    try {
      const res = await apiClient.post('/auth/signup', payload);
      if (res.data?.status === 'success' || res.data?.user_id) {
        onComplete(res.data);
        onNavigate('consent');
      }
    } catch (err) {
      let msg = err.response?.data?.detail;
      if (Array.isArray(msg)) {
        msg = msg.map((m) => m.msg || JSON.stringify(m)).join('; ');
      } else if (typeof msg !== 'string' || !msg.trim()) {
        msg = err.response?.data?.message || err.message || 'Registration failed. Please check details and try again.';
      }
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        width: '100%',
        maxWidth: hideSideMascot ? '520px' : '980px',
        margin: 'auto',
        display: 'grid',
        gridTemplateColumns: hideSideMascot ? '1fr' : 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '32px',
        alignItems: 'center',
        padding: '16px 0',
      }}
    >
      {/* ── LEFT COLUMN: YUSA COMPANION ── */}
      {!hideSideMascot && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            gap: '16px',
            padding: '24px 16px',
            backgroundColor: 'var(--surface)',
            borderRadius: 'var(--radius-lg)',
            border: 'var(--border-width) solid var(--stroke)',
            boxShadow: 'var(--shadow-hard)',
          }}
        >
          {onBackToLanding && (
            <button
              type="button"
              onClick={onBackToLanding}
              style={{
                alignSelf: 'flex-start',
                background: 'var(--surface-2)',
                border: '1.5px solid var(--stroke)',
                color: 'var(--text)',
                padding: '6px 14px',
                borderRadius: 'var(--radius-pill)',
                fontSize: '12px',
                fontWeight: '700',
                cursor: 'pointer',
              }}
            >
              ← Back to Overview
            </button>
          )}

          <YusaCompanion mood="normal" size={170} showBubble={false} />

          <div style={{ maxWidth: '320px' }}>
            <h2 style={{ fontSize: '22px', fontWeight: 800, fontFamily: 'var(--font-heading)', color: 'var(--text)', marginBottom: '6px' }}>
              {isLoginMode ? 'Welcome Back!' : 'Say Hi to Yusa ✨'}
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: '1.55' }}>
              {isLoginMode
                ? "Your safe space is ready. Enter your username to resume where you left off."
                : 'Yusa is eager to meet you! Everything you share stays confidential and safe.'}
            </p>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
            <span style={{ fontSize: '12px', backgroundColor: 'var(--lilac)', color: '#16131F', padding: '4px 12px', borderRadius: 'var(--radius-pill)', fontWeight: 700, border: '1px solid var(--stroke)' }}>
              🔒 100% Private
            </span>
            <span style={{ fontSize: '12px', backgroundColor: 'var(--yellow)', color: '#16131F', padding: '4px 12px', borderRadius: 'var(--radius-pill)', fontWeight: 700, border: '1px solid var(--stroke)' }}>
              💬 Hinglish Friendly
            </span>
            <span style={{ fontSize: '12px', backgroundColor: 'var(--mint)', color: '#16131F', padding: '4px 12px', borderRadius: 'var(--radius-pill)', fontWeight: 700, border: '1px solid var(--stroke)' }}>
              ✨ Zero Judgment
            </span>
          </div>
        </div>
      )}

      {/* ── RIGHT COLUMN: CARD (LOGIN & SIGNUP) ── */}
      <div
        style={{
          padding: '32px 28px',
          backgroundColor: 'var(--surface)',
          border: 'var(--border-width) solid var(--stroke)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-hard)',
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 800, fontFamily: 'var(--font-heading)', color: 'var(--text)', marginBottom: '4px' }}>
            {isLoginMode ? 'Welcome Back' : 'Create Safe Account'}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
            {isLoginMode
              ? 'Sign in with your username to resume your confidential conversations.'
              : 'Set up your youth profile and emergency safety contacts.'}
          </p>
        </div>

        {/* Tab Switcher */}
        <div
          style={{
            display: 'flex',
            backgroundColor: 'var(--surface-2)',
            border: 'var(--border-width) solid var(--stroke)',
            borderRadius: 'var(--radius-pill)',
            padding: '3px',
            marginBottom: '22px',
            gap: '4px',
          }}
        >
          <button
            type="button"
            onClick={() => { setIsLoginMode(false); setError(null); }}
            style={{
              flex: 1,
              padding: '8px 14px',
              borderRadius: 'var(--radius-pill)',
              border: !isLoginMode ? '2px solid var(--stroke)' : '2px solid transparent',
              backgroundColor: !isLoginMode ? 'var(--stroke)' : 'transparent',
              color: !isLoginMode ? 'var(--bg)' : 'var(--text)',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'background-color var(--transition-fast)',
            }}
          >
            Create Account
          </button>
          <button
            type="button"
            onClick={() => { setIsLoginMode(true); setError(null); }}
            style={{
              flex: 1,
              padding: '8px 14px',
              borderRadius: 'var(--radius-pill)',
              border: isLoginMode ? '2px solid var(--stroke)' : '2px solid transparent',
              backgroundColor: isLoginMode ? 'var(--stroke)' : 'transparent',
              color: isLoginMode ? 'var(--bg)' : 'var(--text)',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'background-color var(--transition-fast)',
            }}
          >
            Sign In with Username
          </button>
        </div>

        {/* Error notification */}
        {error && (
          <div
            role="alert"
            style={{
              backgroundColor: 'var(--coral)',
              color: '#16131F',
              border: 'var(--border-width) solid var(--stroke)',
              borderRadius: 'var(--radius-md)',
              padding: '10px 14px',
              marginBottom: '18px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '13px',
              fontWeight: 600,
            }}
          >
            <AlertCircle size={16} strokeWidth={2.5} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* TAB 1: SIGN IN */}
        {isLoginMode ? (
          <form onSubmit={handleDirectLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: 'var(--text)' }}>
                Your Username
              </label>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  backgroundColor: 'var(--surface-2)',
                  border: 'var(--border-width-control) solid var(--stroke)',
                  borderRadius: 'var(--radius-md)',
                  padding: '0 12px',
                }}
              >
                <User size={16} strokeWidth={2.5} color="var(--text-muted)" style={{ marginRight: '8px' }} />
                <input
                  type="text"
                  required
                  placeholder="e.g. rahul_k"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 0',
                    border: 'none',
                    outline: 'none',
                    backgroundColor: 'transparent',
                    color: 'var(--text)',
                    fontSize: '15px',
                  }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                width: '100%',
                padding: '12px 20px',
                borderRadius: 'var(--radius-pill)',
                backgroundColor: 'var(--stroke)',
                color: 'var(--bg)',
                border: 'var(--border-width-control) solid var(--stroke)',
                boxShadow: 'var(--shadow-hard)',
                fontSize: '15px',
                fontWeight: 700,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                opacity: isSubmitting ? 0.7 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                marginTop: '8px',
              }}
            >
              <span>{isSubmitting ? 'Signing in...' : 'Sign In & Chat'}</span>
              <ArrowRight size={16} strokeWidth={2.5} />
            </button>
          </form>
        ) : (
          /* TAB 2: SIGN UP */
          <form onSubmit={handleSignupSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* Username */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                Pick a Username <span style={{ color: 'var(--coral)' }}>*</span>
              </label>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  backgroundColor: 'var(--surface-2)',
                  border: 'var(--border-width-control) solid var(--stroke)',
                  borderRadius: 'var(--radius-md)',
                  padding: '0 12px',
                }}
              >
                <User size={16} strokeWidth={2.5} color="var(--text-muted)" style={{ marginRight: '8px' }} />
                <input
                  type="text"
                  required
                  placeholder="e.g. rahul_2008"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 0',
                    border: 'none',
                    outline: 'none',
                    backgroundColor: 'transparent',
                    color: 'var(--text)',
                    fontSize: '15px',
                  }}
                />
              </div>
            </div>

            {/* First & Last Name */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                  First Name <span style={{ color: 'var(--coral)' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Rahul"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    backgroundColor: 'var(--surface-2)',
                    border: 'var(--border-width-control) solid var(--stroke)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text)',
                    fontSize: '14px',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                  Last Name <span style={{ color: 'var(--coral)' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Sharma"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    backgroundColor: 'var(--surface-2)',
                    border: 'var(--border-width-control) solid var(--stroke)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text)',
                    fontSize: '14px',
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            {/* Mobile & Age Band */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                  Your Mobile Number <span style={{ color: 'var(--coral)' }}>*</span>
                </label>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    backgroundColor: 'var(--surface-2)',
                    border: 'var(--border-width-control) solid var(--stroke)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0 10px',
                  }}
                >
                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', marginRight: '6px' }}>+91</span>
                  <input
                    type="tel"
                    required
                    placeholder="9876543210"
                    value={userPhone}
                    onChange={handlePhoneChange(setUserPhone)}
                    style={{
                      width: '100%',
                      padding: '10px 0',
                      border: 'none',
                      outline: 'none',
                      backgroundColor: 'transparent',
                      color: 'var(--text)',
                      fontSize: '14px',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                  Age Band
                </label>
                <select
                  value={ageBand}
                  onChange={(e) => setAgeBand(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 8px',
                    backgroundColor: 'var(--surface-2)',
                    border: 'var(--border-width-control) solid var(--stroke)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text)',
                    fontSize: '14px',
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <option value="13-15">13–15 yrs</option>
                  <option value="16-17">16–17 yrs</option>
                  <option value="18+">18+ yrs</option>
                </select>
              </div>
            </div>

            {/* Emergency Contacts Section */}
            <div style={{ marginTop: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)' }}>
                    Emergency Contacts ({contacts.length}/3)
                  </span>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Contacted only in severe self-harm emergencies
                  </div>
                </div>

                {contacts.length < 3 && (
                  <button
                    type="button"
                    onClick={addContact}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      backgroundColor: 'var(--surface-2)',
                      border: '1.5px solid var(--stroke)',
                      borderRadius: 'var(--radius-pill)',
                      padding: '4px 10px',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    <Plus size={12} strokeWidth={2.5} />
                    <span>Add</span>
                  </button>
                )}
              </div>

              {contacts.map((c, idx) => (
                <div
                  key={idx}
                  style={{
                    backgroundColor: 'var(--surface-2)',
                    border: 'var(--border-width) solid var(--stroke)',
                    borderRadius: 'var(--radius-md)',
                    padding: '12px',
                    marginBottom: '10px',
                    position: 'relative',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, backgroundColor: 'var(--surface)', padding: '2px 8px', borderRadius: 'var(--radius-pill)', border: '1px solid var(--stroke)' }}>
                      Priority {idx + 1} ({c.relationship})
                    </span>

                    {contacts.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeContact(idx)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--coral)',
                          cursor: 'pointer',
                          padding: '2px',
                        }}
                      >
                        <Trash2 size={13} strokeWidth={2.5} />
                      </button>
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                    <input
                      type="text"
                      required
                      placeholder="First Name"
                      value={c.first_name}
                      onChange={(e) => updateContact(idx, 'first_name', e.target.value)}
                      style={{
                        padding: '8px 10px',
                        backgroundColor: 'var(--surface)',
                        border: '1.5px solid var(--stroke)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '13px',
                        color: 'var(--text)',
                        outline: 'none',
                      }}
                    />
                    <input
                      type="text"
                      required
                      placeholder="Last Name"
                      value={c.last_name}
                      onChange={(e) => updateContact(idx, 'last_name', e.target.value)}
                      style={{
                        padding: '8px 10px',
                        backgroundColor: 'var(--surface)',
                        border: '1.5px solid var(--stroke)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '13px',
                        color: 'var(--text)',
                        outline: 'none',
                      }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '8px' }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        backgroundColor: 'var(--surface)',
                        border: '1.5px solid var(--stroke)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '0 8px',
                      }}
                    >
                      <span style={{ fontSize: '12px', fontWeight: 700, marginRight: '4px' }}>+91</span>
                      <input
                        type="tel"
                        required
                        placeholder="Mobile"
                        value={c.phone}
                        onChange={handleContactPhoneChange(idx)}
                        style={{
                          width: '100%',
                          padding: '8px 0',
                          border: 'none',
                          outline: 'none',
                          backgroundColor: 'transparent',
                          color: 'var(--text)',
                          fontSize: '13px',
                        }}
                      />
                    </div>

                    <select
                      value={c.relationship}
                      onChange={(e) => updateContact(idx, 'relationship', e.target.value)}
                      style={{
                        padding: '8px 6px',
                        backgroundColor: 'var(--surface)',
                        border: '1.5px solid var(--stroke)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '12px',
                        color: 'var(--text)',
                        outline: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      <option value="Parent">Parent</option>
                      <option value="Guardian">Guardian</option>
                      <option value="Sibling">Sibling</option>
                      <option value="Friend">Friend</option>
                      <option value="Counselor">Counselor</option>
                    </select>
                  </div>

                  {/* Optional Email & Telegram */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '8px' }}>
                    <input
                      type="email"
                      placeholder="Email (optional)"
                      value={c.email}
                      onChange={(e) => updateContact(idx, 'email', e.target.value)}
                      style={{
                        padding: '6px 8px',
                        backgroundColor: 'var(--surface)',
                        border: '1px solid var(--stroke)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '11px',
                        color: 'var(--text)',
                        outline: 'none',
                      }}
                    />
                    <input
                      type="text"
                      placeholder="Telegram ID (opt)"
                      value={c.telegram_chat_id}
                      onChange={(e) => updateContact(idx, 'telegram_chat_id', e.target.value)}
                      style={{
                        padding: '6px 8px',
                        backgroundColor: 'var(--surface)',
                        border: '1px solid var(--stroke)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '11px',
                        color: 'var(--text)',
                        outline: 'none',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                width: '100%',
                padding: '14px 20px',
                borderRadius: 'var(--radius-pill)',
                backgroundColor: 'var(--stroke)',
                color: 'var(--bg)',
                border: 'var(--border-width-control) solid var(--stroke)',
                boxShadow: 'var(--shadow-hard)',
                fontSize: '15px',
                fontWeight: 700,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                opacity: isSubmitting ? 0.7 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                marginTop: '6px',
              }}
            >
              <span>{isSubmitting ? 'Creating profile...' : 'Continue to Consent'}</span>
              <ArrowRight size={16} strokeWidth={2.5} />
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
