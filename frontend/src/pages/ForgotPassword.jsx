import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FiCheck, FiKey } from 'react-icons/fi';

export default function ForgotPassword() {
  const [step, setStep] = useState(1);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');

  const sendResetOtp = async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setStep(2);
    } catch (err) { setError(err.message); }
    setLoading(false);
  };

  const resetPassword = async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, otp, newPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuccess('Password reset! You can now login with your new password.');
      setStep(3);
    } catch (err) { setError(err.message); }
    setLoading(false);
  };

  return (
    <div className="page fade-in">
      <div className="container" style={{ maxWidth: '440px', padding: '4rem 1.5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <FiKey size={36} color="var(--accent-primary)" />
          <h2 style={{ marginTop: '0.5rem' }}>Reset Password</h2>
        </div>

        {error && <div style={{ padding: '0.75rem', background: 'var(--error-bg)', color: 'var(--error)', borderRadius: 'var(--radius-sm)', marginBottom: '1rem', fontSize: '0.85rem' }}>{error}</div>}
        {success && <div style={{ padding: '0.75rem', background: 'var(--success-bg)', color: 'var(--success)', borderRadius: 'var(--radius-sm)', marginBottom: '1rem', fontSize: '0.85rem' }}>{success}</div>}

        {step === 1 && (
          <div className="card" style={{ padding: '2rem' }}>
            <div className="form-group"><label className="form-label">Phone Number</label><input type="tel" className="form-input" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Enter registered phone number" maxLength={10} /></div>
            <button onClick={sendResetOtp} disabled={loading || phone.length < 10} className="btn btn-primary" style={{ width: '100%' }}>{loading ? 'Sending...' : 'Send Reset OTP'}</button>
          </div>
        )}

        {step === 2 && (
          <div className="card" style={{ padding: '2rem' }}>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem', fontSize: '0.85rem' }}>Enter the OTP sent to {phone} and your new password</p>
            <div className="form-group"><label className="form-label">OTP</label><input type="text" className="form-input" value={otp} onChange={e => setOtp(e.target.value)} placeholder="6-digit OTP" maxLength={6} style={{ textAlign: 'center', fontSize: '1.3rem', letterSpacing: '0.3em' }} /></div>
            <div className="form-group"><label className="form-label">New Password</label><input type="password" className="form-input" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Min 6 characters" minLength={6} /></div>
            <button onClick={resetPassword} disabled={loading || otp.length < 6 || newPassword.length < 6} className="btn btn-primary" style={{ width: '100%' }}>{loading ? 'Resetting...' : 'Reset Password'}</button>
          </div>
        )}

        {step === 3 && (
          <div className="card" style={{ textAlign: 'center', padding: '2.5rem' }}>
            <FiCheck size={40} color="var(--success)" />
            <h3 style={{ margin: '1rem 0' }}>Password Reset!</h3>
            <Link to="/login" className="btn btn-primary">Go to Login</Link>
          </div>
        )}

        <p style={{ textAlign: 'center', marginTop: '1.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          <Link to="/login">← Back to Login</Link>
        </p>
      </div>
    </div>
  );
}
