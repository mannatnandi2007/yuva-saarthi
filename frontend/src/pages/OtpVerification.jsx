import React, { useState } from 'react';
import { KeyRound, CheckCircle2, AlertCircle } from 'lucide-react';
import axios from 'axios';

export default function OtpVerification({ userSession, onVerify, onNavigate }) {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleVerify = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) {
      setError("Please enter a valid 6-digit OTP.");
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const payload = {
        phone: userSession.user_phone,
        otp_code: otp,
        age_band: userSession.age_band,
        emergency_contacts: userSession.emergency_contacts
      };

      const response = await axios.post('http://localhost:8000/auth/verify', payload);
      
      if (response.data.status === 'success') {
        onVerify(response.data.session_id);
      }
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to verify OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '480px', margin: '40px auto', padding: '20px' }} className="animate-slideup">
      <div className="glass-container" style={{ padding: '40px', textAlign: 'center' }}>
        
        <KeyRound size={48} color="var(--accent-crimson)" style={{ marginBottom: '16px', filter: 'drop-shadow(0 0 16px rgba(255, 30, 86, 0.45))' }} />
        
        <h1 style={{ fontSize: '1.8rem', marginBottom: '8px' }}>Verify Your Phone</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
          We sent a 6-digit verification code to <strong style={{color: 'var(--text-primary)'}}>{userSession?.user_phone}</strong>.
        </p>

        {error && (
          <div style={{ 
            background: 'rgba(239, 68, 68, 0.08)', 
            border: '1px solid rgba(239, 68, 68, 0.2)', 
            padding: '12px', 
            borderRadius: '8px', 
            color: 'var(--danger)', 
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            fontSize: '0.9rem'
          }}>
            <AlertCircle size={16} /> {error}
          </div>
        )}

        <form onSubmit={handleVerify} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <input
            type="text"
            placeholder="• • • • • •"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              padding: '16px',
              color: '#fff',
              fontSize: '2rem',
              textAlign: 'center',
              letterSpacing: '8px',
              outline: 'none',
              transition: 'border-color 0.2s',
              width: '100%',
              boxSizing: 'border-box'
            }}
          />

          <button 
            type="submit" 
            disabled={loading || otp.length < 6}
            className="gradient-btn"
            style={{ 
              padding: '14px', 
              borderRadius: '8px', 
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              opacity: (loading || otp.length < 6) ? 0.6 : 1,
              cursor: (loading || otp.length < 6) ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Verifying...' : (
              <>Verify & Continue <CheckCircle2 size={18} /></>
            )}
          </button>
        </form>

        <button 
          onClick={() => onNavigate('signup')}
          style={{ 
            background: 'none', 
            border: 'none', 
            color: 'var(--text-muted)', 
            cursor: 'pointer', 
            textDecoration: 'underline',
            marginTop: '24px',
            fontSize: '0.9rem'
          }}
        >
          Change phone number
        </button>

      </div>
    </div>
  );
}
