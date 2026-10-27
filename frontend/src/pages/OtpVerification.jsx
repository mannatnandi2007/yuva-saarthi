/**
 * Yuva Saarthi — OTP Verification Screen
 * Phase 6: Uses shared resilient apiClient, flat pastel design tokens, solid strokes.
 */

import React, { useState } from 'react';
import { KeyRound, AlertCircle } from 'lucide-react';
import apiClient from '../api/client.js';

export default function OtpVerification({ userSession, onVerify, onNavigate }) {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleVerify = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) {
      setError('Please enter a valid 6-digit OTP.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload = {
        phone: userSession?.user_phone || userSession?.phone,
        otp_code: otp,
        age_band: userSession?.age_band,
        emergency_contacts: userSession?.emergency_contacts,
      };

      const response = await apiClient.post('/auth/verify', payload);

      if (response.data?.status === 'success' || response.data?.session_id) {
        onVerify(response.data.session_id);
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to verify OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        maxWidth: '460px',
        margin: '40px auto',
        padding: '20px',
        color: 'var(--text)',
        fontFamily: 'var(--font-body)',
      }}
    >
      <div
        style={{
          padding: '36px 32px',
          textAlign: 'center',
          backgroundColor: 'var(--surface)',
          border: 'var(--border-width) solid var(--stroke)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-hard)',
        }}
      >
        <div
          style={{
            width: '56px',
            height: '56px',
            borderRadius: 'var(--radius-pill)',
            backgroundColor: 'var(--lilac)',
            border: 'var(--border-width) solid var(--stroke)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#16131F',
            marginBottom: '16px',
          }}
        >
          <KeyRound size={28} strokeWidth={2.5} />
        </div>

        <h1 style={{ fontSize: '24px', fontWeight: 800, fontFamily: 'var(--font-heading)', marginBottom: '8px' }}>
          Verify Your Phone
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '24px' }}>
          Enter the 6-digit verification code sent to{' '}
          <strong>{userSession?.user_phone || userSession?.phone || 'your phone'}</strong>.
        </p>

        {error && (
          <div
            role="alert"
            style={{
              backgroundColor: 'var(--coral)',
              color: '#16131F',
              border: 'var(--border-width) solid var(--stroke)',
              borderRadius: 'var(--radius-md)',
              padding: '10px 14px',
              marginBottom: '20px',
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

        <form onSubmit={handleVerify} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <input
              type="text"
              required
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              placeholder="0 0 0 0 0 0"
              style={{
                width: '100%',
                padding: '14px 16px',
                textAlign: 'center',
                letterSpacing: '0.4em',
                fontSize: '22px',
                fontWeight: 700,
                backgroundColor: 'var(--surface-2)',
                border: 'var(--border-width-control) solid var(--stroke)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text)',
                outline: 'none',
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading || otp.length !== 6}
            style={{
              width: '100%',
              padding: '12px 20px',
              borderRadius: 'var(--radius-pill)',
              backgroundColor: 'var(--stroke)',
              color: 'var(--bg)',
              border: 'var(--border-width-control) solid var(--stroke)',
              boxShadow: otp.length === 6 ? 'var(--shadow-hard)' : 'none',
              fontSize: '15px',
              fontWeight: 700,
              cursor: loading || otp.length !== 6 ? 'not-allowed' : 'pointer',
              opacity: loading || otp.length !== 6 ? 0.5 : 1,
              transition: 'transform var(--transition-fast)',
            }}
          >
            {loading ? 'Verifying...' : 'Confirm & Continue'}
          </button>
        </form>
      </div>
    </div>
  );
}
