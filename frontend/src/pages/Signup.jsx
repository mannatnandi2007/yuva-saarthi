// YUVAA Saarthi Signup Page with Multi-Contact Configuration & Safety Validation
// Reference: PRD §3.1 (Auth & Onboarding) & Safety Escalation Rules

import React, { useState } from 'react';
import { User, Phone, Users, ShieldAlert, Plus, Trash2, AlertCircle } from 'lucide-react';

export default function Signup({ onComplete, onNavigate }) {
  const [userPhone, setUserPhone] = useState('');
  const [ageBand, setAgeBand] = useState('');
  const [error, setError] = useState(null);
  
  // Array of emergency contacts (max 3, min 1)
  const [contacts, setContacts] = useState([
    { phone: '', relationship: 'Parent', priority_order: 1 }
  ]);

  const normalizePhone = (num) => (num || '').replace(/[^\d+]/g, '');

  const addContact = () => {
    if (contacts.length < 3) {
      setContacts([
        ...contacts,
        { phone: '', relationship: 'Guardian', priority_order: contacts.length + 1 }
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

  // Check if contact phone matches user's own phone
  const doesMatchUserPhone = (contactPhone) => {
    const cleanUser = normalizePhone(userPhone);
    const cleanContact = normalizePhone(contactPhone);
    return cleanUser.length >= 7 && cleanContact.length >= 7 && cleanUser === cleanContact;
  };

  // Check if contact phone is duplicated across contacts
  const isDuplicateContactPhone = (contactPhone, currentIndex) => {
    const cleanContact = normalizePhone(contactPhone);
    if (cleanContact.length < 7) return false;
    return contacts.some((c, i) => i !== currentIndex && normalizePhone(c.phone) === cleanContact);
  };

  // Soft Validation Check (PRD §3.1)
  const isOnlyPeerContacts = () => {
    if (contacts.length === 0) return false;
    return contacts.every(c => c.relationship === 'Sibling' || c.relationship === 'Friend');
  };

  const validateForm = () => {
    const cleanUser = normalizePhone(userPhone);
    const userDigits = cleanUser.replace(/\D/g, '');

    if (!userPhone.trim() || userDigits.length < 7) {
      return "Please enter a valid phone number for yourself (at least 10 digits).";
    }

    if (!ageBand) {
      return "Please select your age band.";
    }

    if (contacts.length === 0) {
      return "Please provide at least one emergency contact.";
    }

    const seenContacts = new Set();
    for (let i = 0; i < contacts.length; i++) {
      const c = contacts[i];
      const cleanContact = normalizePhone(c.phone);
      const contactDigits = cleanContact.replace(/\D/g, '');

      if (!c.phone.trim() || contactDigits.length < 7) {
        return `Please enter a valid phone number for emergency contact #${i + 1} (${c.relationship}).`;
      }

      if (cleanUser === cleanContact) {
        return `Emergency contact #${i + 1} (${c.relationship}) cannot be your own phone number. In a crisis, your safety contact is notified on your behalf.`;
      }

      if (seenContacts.has(cleanContact)) {
        return `Emergency contact #${i + 1} has a duplicate number. Each contact must have a distinct phone number.`;
      }

      seenContacts.add(cleanContact);
    }

    return null;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const validationErr = validateForm();
    if (validationErr) {
      setError(validationErr);
      return;
    }

    setError(null);
    // Store user data state and transition to Consent screen
    onComplete({
      user_phone: userPhone.trim(),
      age_band: ageBand,
      emergency_contacts: contacts.map(c => ({ ...c, phone: c.phone.trim() }))
    });
    onNavigate('consent');
  };

  return (
    <div style={{ maxWidth: '640px', margin: '40px auto', padding: '20px' }} className="animate-slideup">
      <div className="glass-container" style={{ padding: '36px' }}>
        
        <header style={{ textAlign: 'center', marginBottom: '28px' }}>
          <h1 style={{ fontSize: '2.2rem', fontWeight: '800' }}>
            Get Started with <span className="gradient-text">YUVAA Saarthi</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '6px' }}>Onboard securely using OTP-verification</p>
        </header>

        {/* Safety Promise Copy (PRD §3.1) */}
        <div style={{ 
          background: 'rgba(99, 102, 241, 0.06)', 
          borderLeft: '4px solid var(--accent-indigo)', 
          padding: '16px', 
          borderRadius: '8px', 
          marginBottom: '28px',
          fontSize: '0.9rem',
          color: 'var(--text-secondary)'
        }}>
          <strong>Safety Promise:</strong> Your chats are private. If we ever detect signs of a real safety emergency, we'll contact your emergency contacts — because your safety comes first.
        </div>

        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid var(--danger)',
            color: 'var(--danger)',
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '0.88rem'
          }} className="animate-slideup">
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* User phone & Ageband */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '600' }}>
                Your Phone (OTP-verified)
              </label>
              <div style={{ position: 'relative' }}>
                <Phone size={16} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-muted)' }} />
                <input 
                  type="tel" 
                  placeholder="+91 98765 43210"
                  required
                  value={userPhone}
                  onChange={(e) => {
                    setUserPhone(e.target.value);
                    setError(null);
                  }}
                  className="form-input" 
                  style={{ width: '100%', paddingLeft: '38px' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '600' }}>
                Age Band
              </label>
              <select 
                required
                value={ageBand}
                onChange={(e) => {
                  setAgeBand(e.target.value);
                  setError(null);
                }}
                className="form-input" 
                style={{ width: '100%', height: '45px', cursor: 'pointer' }}
              >
                <option value="">Select Age Band</option>
                <option value="under-13">Under 13</option>
                <option value="13-15">13 - 15</option>
                <option value="16-17">16 - 17</option>
                <option value="18-plus">18+</option>
              </select>
            </div>
          </div>

          {/* Emergency contacts configuration */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users size={18} style={{ color: 'var(--accent-purple)' }} />
                <h2 style={{ fontSize: '1.2rem', fontWeight: '700' }}>Emergency Safety Contacts</h2>
              </div>
              
              {contacts.length < 3 && (
                <button 
                  type="button" 
                  onClick={addContact}
                  style={{ 
                    background: 'rgba(168, 85, 247, 0.1)', 
                    border: '1px solid var(--accent-purple)', 
                    color: 'var(--accent-purple)', 
                    borderRadius: '6px', 
                    padding: '6px 12px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '4px',
                    cursor: 'pointer',
                    fontSize: '0.8rem'
                  }}
                >
                  <Plus size={14} /> Add Contact
                </button>
              )}
            </div>

            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
              Add up to 3 trusted contacts. In a crisis escalation, they will be notified in priority order. <em>Your emergency contact must be someone else, not your own number.</em>
            </p>

            {/* List of Contacts */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {contacts.map((contact, index) => {
                const isMatchUser = doesMatchUserPhone(contact.phone);
                const isDuplicate = isDuplicateContactPhone(contact.phone, index);
                const hasConflict = isMatchUser || isDuplicate;

                return (
                  <div 
                    key={index}
                    style={{ 
                      background: hasConflict ? 'rgba(239, 68, 68, 0.05)' : 'rgba(255,255,255,0.02)', 
                      border: `1px solid ${hasConflict ? 'var(--danger)' : 'rgba(255,255,255,0.05)'}`, 
                      borderRadius: '8px', 
                      padding: '16px',
                      position: 'relative',
                      transition: 'border-color 0.2s ease'
                    }}
                  >
                    <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr auto', gap: '12px', alignItems: 'flex-start' }}>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontSize: '0.75rem', color: hasConflict ? 'var(--danger)' : 'var(--text-muted)', fontWeight: '600' }}>
                          Contact Phone Number
                        </span>
                        <input 
                          type="tel" 
                          placeholder="+91 98765 43211"
                          required
                          value={contact.phone}
                          onChange={(e) => updateContact(index, 'phone', e.target.value)}
                          className="form-input"
                          style={{ 
                            padding: '8px 12px',
                            borderColor: hasConflict ? 'var(--danger)' : undefined
                          }}
                        />
                        {isMatchUser && (
                          <span style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: '2px', fontWeight: '500' }}>
                            ⚠️ Cannot be your own phone number
                          </span>
                        )}
                        {isDuplicate && (
                          <span style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: '2px', fontWeight: '500' }}>
                            ⚠️ Duplicate: already listed for another contact
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '600' }}>Relationship</span>
                        <select
                          value={contact.relationship}
                          onChange={(e) => updateContact(index, 'relationship', e.target.value)}
                          className="form-input"
                          style={{ padding: '8px 12px', height: '40px' }}
                        >
                          <option value="Parent">Parent</option>
                          <option value="Guardian">Guardian</option>
                          <option value="Sibling">Sibling</option>
                          <option value="Friend">Friend</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', justifyContent: 'center' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', fontWeight: '600' }}>Priority</span>
                        <div style={{ 
                          background: 'var(--bg-tertiary)', 
                          padding: '8px 14px', 
                          borderRadius: '6px', 
                          fontWeight: 'bold', 
                          color: 'var(--accent-indigo)',
                          textAlign: 'center'
                        }}>
                          #{contact.priority_order}
                        </div>
                      </div>

                    </div>

                    {contacts.length > 1 && (
                      <button 
                        type="button" 
                        onClick={() => removeContact(index)}
                        style={{ 
                          position: 'absolute', 
                          right: '-10px', 
                          top: '-10px', 
                          background: 'var(--danger)', 
                          border: 'none', 
                          borderRadius: '50%', 
                          width: '24px', 
                          height: '24px', 
                          display: 'flex', 
                          justifyContent: 'center', 
                          alignItems: 'center', 
                          cursor: 'pointer',
                          color: '#fff'
                        }}
                      >
                        <Trash2 size={12} />
                      </button>
                    )}

                  </div>
                );
              })}
            </div>

            {/* Soft non-blocking peer contact validation box (PRD §3.1) */}
            {isOnlyPeerContacts() && (
              <div 
                className="animate-slideup"
                style={{ 
                  background: 'rgba(245, 158, 11, 0.08)', 
                  border: '1px solid rgba(245, 158, 11, 0.2)', 
                  padding: '12px 16px', 
                  borderRadius: '8px', 
                  marginTop: '16px',
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '12px'
                }}
              >
                <ShieldAlert size={20} style={{ color: 'var(--warning)', flexShrink: 0 }} />
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
                  <strong>Nudge:</strong> For safety emergencies, having an adult contact can help us get you support faster — want to add one too? (You can still proceed if you prefer).
                </p>
              </div>
            )}
          </div>

          <button 
            type="submit" 
            className="gradient-btn" 
            style={{ width: '100%', padding: '14px', borderRadius: '8px', fontSize: '1rem', marginTop: '12px' }}
          >
            Continue to Consent & Policy Acknowledgment
          </button>

        </form>

      </div>
    </div>
  );
}
