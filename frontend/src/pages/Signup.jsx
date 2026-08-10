// YUVAA Saarthi Signup Page with Multi-Contact Configuration
// Reference: PRD §3.1 (Auth & Onboarding) & Execution Plan Day 1

import React, { useState } from 'react';
import { User, Phone, Users, ShieldAlert, Plus, Trash2 } from 'lucide-react';

export default function Signup({ onComplete, onNavigate }) {
  const [userPhone, setUserPhone] = useState('');
  const [ageBand, setAgeBand] = useState('');
  
  // Array of emergency contacts (max 3, min 1)
  const [contacts, setContacts] = useState([
    { phone: '', relationship: 'Parent', priority_order: 1 }
  ]);

  const addContact = () => {
    if (contacts.length < 3) {
      setContacts([
        ...contacts,
        { phone: '', relationship: 'Parent', priority_order: contacts.length + 1 }
      ]);
    }
  };

  const removeContact = (index) => {
    const updated = contacts.filter((_, i) => i !== index)
      .map((c, i) => ({ ...c, priority_order: i + 1 }));
    setContacts(updated);
  };

  const updateContact = (index, field, value) => {
    const updated = [...contacts];
    updated[index][field] = value;
    setContacts(updated);
  };

  // Soft Validation Check (PRD §3.1)
  const isOnlyPeerContacts = () => {
    if (contacts.length === 0) return false;
    return contacts.every(c => c.relationship === 'Sibling' || c.relationship === 'Friend');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!userPhone || !ageBand || contacts.length === 0) return;
    
    // Store user data state and transition to Consent screen
    onComplete({
      user_phone: userPhone,
      age_band: ageBand,
      emergency_contacts: contacts
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
                  placeholder="+91 XXXXX XXXXX"
                  required
                  value={userPhone}
                  onChange={(e) => setUserPhone(e.target.value)}
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
                onChange={(e) => setAgeBand(e.target.value)}
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
                <h2 style={{ fontSize: '1.2rem', fontWeight: '700' }}>Emergency Contacts</h2>
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

            {/* List of Contacts */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {contacts.map((contact, index) => (
                <div 
                  key={index}
                  style={{ 
                    background: 'rgba(255,255,255,0.02)', 
                    border: '1px solid rgba(255,255,255,0.05)', 
                    borderRadius: '8px', 
                    padding: '16px',
                    position: 'relative'
                  }}
                >
                  <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr auto', gap: '12px', alignItems: 'center' }}>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Phone Number</span>
                      <input 
                        type="tel" 
                        placeholder="+91 XXXXX XXXXX"
                        required
                        value={contact.phone}
                        onChange={(e) => updateContact(index, 'phone', e.target.value)}
                        className="form-input"
                        style={{ padding: '8px 12px' }}
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Relationship</span>
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
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>Priority</span>
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
              ))}
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
