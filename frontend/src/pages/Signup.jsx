// YUVAA Saarthi — Modern Aesthetic Onboarding & Login
// Redesigned with strict 10-digit Indian phone inputs, fixed +91 prefix, and dark glassmorphism

import React, { useState } from 'react';
import { User, Phone, Users, ShieldAlert, Plus, Trash2, AlertCircle, ArrowRight, Sparkles, Heart } from 'lucide-react';
import axios from 'axios';

// BUG-010 FIX: Use VITE_API_URL env variable for production deployments (Vercel)
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function Signup({ onComplete, onNavigate }) {
  const [isLoginMode, setIsLoginMode] = useState(false);
  const [loginUsername, setLoginUsername] = useState('');

  // Sign up state - phone stores pure 10 digits
  const [username, setUsername] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [userPhone, setUserPhone] = useState(''); // exactly 10 digits
  const [ageBand, setAgeBand] = useState('16-17');
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Array of emergency contacts (max 3, min 1)
  const [contacts, setContacts] = useState([
    { first_name: '', last_name: '', phone: '', relationship: 'Parent', priority_order: 1 }
  ]);

  const addContact = () => {
    if (contacts.length < 3) {
      setContacts([
        ...contacts,
        { first_name: '', last_name: '', phone: '', relationship: 'Guardian', priority_order: contacts.length + 1 }
      ]);
    }
  };

  const removeContact = (index) => {
    const updated = contacts.filter((_, i) => i !== index)
      .map((c, i) => ({ ...c, priority_order: i + 1 }));
    setContacts(updated);
    setError(null);
  };

  const updateContact = (index, field, value) => {
    const updated = [...contacts];
    updated[index][field] = value;
    setContacts(updated);
    setError(null);
  };

  // 10-digit exact matching checks
  const doesMatchUserPhone = (contactPhone) => {
    return userPhone.length === 10 && contactPhone.length === 10 && userPhone === contactPhone;
  };

  const isDuplicateContactPhone = (contactPhone, currentIndex) => {
    if (contactPhone.length !== 10) return false;
    return contacts.some((c, i) => i !== currentIndex && c.phone === contactPhone);
  };

  const handleDirectLogin = async (e) => {
    e.preventDefault();
    setError(null);
    const clean = loginUsername.trim().toLowerCase();
    if (!clean) {
      setError("Please enter your username.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/auth/login`, { username: clean });
      if (res.data?.status === 'success') {
        onComplete(res.data);
        onNavigate('chat');
      }
    } catch (err) {
      const msg = err.response?.data?.detail || "Could not find account. Please check username or create an account.";
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
      setError("Username must be at least 3 characters long.");
      return;
    }
    if (!/^[a-zA-Z0-9_.-]+$/.test(cleanUsername)) {
      setError("Username can only contain letters, numbers, hyphens, and underscores.");
      return;
    }
    if (!firstName.trim()) {
      setError("Please enter your first name.");
      return;
    }
    if (!lastName.trim()) {
      setError("Please enter your last name.");
      return;
    }

    if (userPhone.length !== 10) {
      setError("Please enter your 10-digit mobile number.");
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
      emergency_contacts: contacts.map(c => ({
        first_name: c.first_name.trim(),
        last_name: c.last_name.trim(),
        relationship: c.relationship,
        phone: `+91${c.phone}`,
        priority_order: c.priority_order
      }))
    };

    try {
      const res = await axios.post(`${API_BASE_URL}/auth/signup`, payload);
      if (res.data?.status === 'success') {
        onComplete(res.data);
        onNavigate('consent');
      }
    } catch (err) {
      const msg = err.response?.data?.detail || "Registration failed. Please try again.";
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ width: '100%', maxWidth: '560px', margin: '0 auto' }} className="animate-slideup">
      <div className="glass-panel" style={{ padding: '36px 32px', position: 'relative', overflow: 'hidden' }}>
        
        {/* Subtle decorative glow */}
        <div style={{
          position: 'absolute',
          top: '-80px',
          right: '-80px',
          width: '200px',
          height: '200px',
          background: 'radial-gradient(circle, rgba(168, 85, 247, 0.15) 0%, transparent 70%)',
          pointerEvents: 'none'
        }} />

        {/* Card Header */}
        <div style={{ marginBottom: '22px' }}>
          <h2 style={{ fontSize: '1.45rem', fontWeight: '800', letterSpacing: '-0.02em', marginBottom: '6px', color: '#f4f4f5' }}>
            {isLoginMode ? "Welcome Back" : "Create Safe Account"}
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.86rem', lineHeight: '1.4' }}>
            {isLoginMode 
              ? "Sign in with your unique username to resume your confidential conversations."
              : "Set up your youth profile and trusted emergency safety contacts."}
          </p>
        </div>

        {/* Segmented Tab Switcher */}
        <div style={{
          display: 'flex',
          background: 'rgba(255, 255, 255, 0.04)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          borderRadius: '12px',
          padding: '4px',
          marginBottom: '24px'
        }}>
          <button
            type="button"
            onClick={() => { setIsLoginMode(false); setError(null); }}
            style={{
              flex: 1,
              padding: '9px 14px',
              borderRadius: '9px',
              border: 'none',
              background: !isLoginMode ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'transparent',
              color: !isLoginMode ? '#ffffff' : 'var(--text-secondary)',
              fontSize: '0.86rem',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: !isLoginMode ? '0 2px 8px rgba(99, 102, 241, 0.3)' : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            Create Account
          </button>
          <button
            type="button"
            onClick={() => { setIsLoginMode(true); setError(null); }}
            style={{
              flex: 1,
              padding: '9px 14px',
              borderRadius: '9px',
              border: 'none',
              background: isLoginMode ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'transparent',
              color: isLoginMode ? '#ffffff' : 'var(--text-secondary)',
              fontSize: '0.86rem',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: isLoginMode ? '0 2px 8px rgba(99, 102, 241, 0.3)' : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            Sign In with Username
          </button>
        </div>

        {/* Error Notification */}
        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '10px',
            padding: '12px 14px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            color: '#fca5a5',
            fontSize: '0.84rem',
            lineHeight: '1.4'
          }} className="animate-slideup">
            <AlertCircle size={17} style={{ flexShrink: 0, color: '#f87171' }} />
            <span>{error}</span>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 1: SIGN IN WITH USERNAME                                              */}
        {/* ========================================================================= */}
        {isLoginMode ? (
          <form onSubmit={handleDirectLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', marginBottom: '8px', color: 'var(--text-secondary)' }}>
                Enter Your Username
              </label>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                background: 'var(--bg-input)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '10px',
                padding: '0 14px',
                transition: 'border-color 0.2s'
              }}>
                <span style={{ color: 'var(--accent-purple)', fontWeight: '700', marginRight: '8px', fontSize: '1rem' }}>@</span>
                <input
                  type="text"
                  placeholder="e.g. mannat_n"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                  style={{
                    flex: 1,
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: 'var(--text-primary)',
                    padding: '12px 0',
                    fontSize: '0.92rem',
                    fontFamily: 'inherit'
                  }}
                  autoFocus
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary"
              style={{ width: '100%', padding: '13px', fontSize: '0.95rem' }}
            >
              <span>{isSubmitting ? "Opening Workspace..." : "Open Safe Space"}</span>
              <ArrowRight size={17} />
            </button>
          </form>
        ) : (
          /* ========================================================================= */
          /* TAB 2: CREATE ACCOUNT                                                     */
          /* ========================================================================= */
          <form onSubmit={handleSignupSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
            
            {/* Section 1: Profile */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              borderRadius: '14px',
              padding: '18px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#c084fc', fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                <User size={14} />
                <span>Your Profile</span>
              </div>

              {/* Username */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '600', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                  Choose a Unique Username *
                </label>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '10px',
                  padding: '0 12px'
                }}>
                  <span style={{ color: '#c084fc', fontWeight: '700', marginRight: '6px' }}>@</span>
                  <input
                    type="text"
                    placeholder="e.g. mannat_24"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                    style={{
                      flex: 1,
                      background: 'transparent',
                      border: 'none',
                      outline: 'none',
                      color: 'var(--text-primary)',
                      padding: '10px 0',
                      fontSize: '0.88rem',
                      fontFamily: 'inherit'
                    }}
                    required
                  />
                </div>
              </div>

              {/* First & Last Name */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '600', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                    First Name *
                  </label>
                  <input
                    type="text"
                    placeholder="First Name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="input-field"
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '600', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                    Last Name *
                  </label>
                  <input
                    type="text"
                    placeholder="Last Name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="input-field"
                    required
                  />
                </div>
              </div>

              {/* Phone (with fixed +91 and 10 digits max) & Age Band */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '600', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                    Mobile Number (10 digits) *
                  </label>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '10px',
                    padding: '0 10px'
                  }}>
                    <span style={{
                      fontSize: '0.84rem',
                      fontWeight: '700',
                      color: 'var(--text-secondary)',
                      marginRight: '8px',
                      paddingRight: '8px',
                      borderRight: '1px solid rgba(255, 255, 255, 0.1)',
                      userSelect: 'none'
                    }}>
                      +91
                    </span>
                    <input
                      type="tel"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={10}
                      placeholder="98765 43210"
                      value={userPhone}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                        setUserPhone(digits);
                      }}
                      style={{
                        flex: 1,
                        background: 'transparent',
                        border: 'none',
                        outline: 'none',
                        color: 'var(--text-primary)',
                        padding: '10px 0',
                        fontSize: '0.88rem',
                        fontFamily: 'inherit',
                        letterSpacing: '0.04em'
                      }}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '600', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                    Age Band *
                  </label>
                  <select
                    value={ageBand}
                    onChange={(e) => setAgeBand(e.target.value)}
                    className="input-field"
                  >
                    <option value="under-13">Under 13</option>
                    <option value="13-15">13 - 15</option>
                    <option value="16-17">16 - 17</option>
                    <option value="18-plus">18 - 20</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Section 2: Emergency Contacts */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              borderRadius: '14px',
              padding: '18px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#2dd4bf', fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  <Users size={14} />
                  <span>Trusted Emergency Contacts</span>
                </div>
                {contacts.length < 3 && (
                  <button
                    type="button"
                    onClick={addContact}
                    className="btn-secondary"
                  >
                    <Plus size={13} />
                    <span>Add</span>
                  </button>
                )}
              </div>

              {contacts.map((contact, index) => {
                const matchesUser = doesMatchUserPhone(contact.phone);
                const isDuplicate = isDuplicateContactPhone(contact.phone, index);
                const hasError = matchesUser || isDuplicate;

                return (
                  <div
                    key={index}
                    style={{
                      background: 'rgba(0, 0, 0, 0.3)',
                      border: `1px solid ${hasError ? 'rgba(239, 68, 68, 0.4)' : 'rgba(255, 255, 255, 0.06)'}`,
                      borderRadius: '12px',
                      padding: '14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{
                        fontSize: '0.74rem',
                        fontWeight: '700',
                        color: index === 0 ? '#c084fc' : '#a1a1aa',
                        background: index === 0 ? 'rgba(168, 85, 247, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        letterSpacing: '0.03em'
                      }}>
                        {index === 0 ? "Priority 1 (Primary Contact)" : `Priority ${contact.priority_order}`}
                      </span>

                      {contacts.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeContact(index)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#71717a',
                            cursor: 'pointer',
                            padding: '2px',
                            display: 'flex',
                            alignItems: 'center'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
                          onMouseLeave={(e) => e.currentTarget.style.color = '#71717a'}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>

                    {/* Contact Names */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <input
                        type="text"
                        placeholder="Contact First Name"
                        value={contact.first_name}
                        onChange={(e) => updateContact(index, 'first_name', e.target.value)}
                        className="input-field"
                        style={{ fontSize: '0.84rem', padding: '9px 12px' }}
                        required
                      />
                      <input
                        type="text"
                        placeholder="Contact Last Name"
                        value={contact.last_name}
                        onChange={(e) => updateContact(index, 'last_name', e.target.value)}
                        className="input-field"
                        style={{ fontSize: '0.84rem', padding: '9px 12px' }}
                        required
                      />
                    </div>

                    {/* Relationship & Phone with +91 fixed badge and 10 digits max */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: '10px' }}>
                      <select
                        value={contact.relationship}
                        onChange={(e) => updateContact(index, 'relationship', e.target.value)}
                        className="input-field"
                        style={{ fontSize: '0.84rem', padding: '9px 10px' }}
                      >
                        <option value="Parent">Parent</option>
                        <option value="Guardian">Guardian</option>
                        <option value="Sibling">Sibling</option>
                        <option value="Friend">Friend</option>
                        <option value="Other">Other</option>
                      </select>

                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        background: 'var(--bg-input)',
                        border: `1px solid ${hasError ? '#ef4444' : 'var(--border-subtle)'}`,
                        borderRadius: '10px',
                        padding: '0 8px'
                      }}>
                        <span style={{
                          fontSize: '0.8rem',
                          fontWeight: '700',
                          color: 'var(--text-secondary)',
                          marginRight: '6px',
                          paddingRight: '6px',
                          borderRight: '1px solid rgba(255, 255, 255, 0.1)',
                          userSelect: 'none'
                        }}>
                          +91
                        </span>
                        <input
                          type="tel"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={10}
                          placeholder="98765 43210"
                          value={contact.phone}
                          onChange={(e) => {
                            const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                            updateContact(index, 'phone', digits);
                          }}
                          style={{
                            flex: 1,
                            background: 'transparent',
                            border: 'none',
                            outline: 'none',
                            color: 'var(--text-primary)',
                            padding: '9px 0',
                            fontSize: '0.84rem',
                            fontFamily: 'inherit',
                            letterSpacing: '0.04em'
                          }}
                          required
                        />
                      </div>
                    </div>

                    {matchesUser && (
                      <div style={{ color: '#f87171', fontSize: '0.74rem', fontWeight: '500' }}>
                        ⚠️ Cannot be your own phone number.
                      </div>
                    )}
                    {isDuplicate && (
                      <div style={{ color: '#f87171', fontSize: '0.74rem', fontWeight: '500' }}>
                        ⚠️ Duplicate contact phone number.
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary"
              style={{ width: '100%', padding: '14px', fontSize: '0.95rem' }}
            >
              <span>{isSubmitting ? "Creating Profile..." : "Continue to Safe Space"}</span>
              <ArrowRight size={17} />
            </button>
          </form>
        )}

      </div>
    </div>
  );
}
