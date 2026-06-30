import { useState } from 'react';
import { waitlistApi } from '../../api/client';

const WaitlistForm = ({ id, compact = false }) => {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    try {
      await waitlistApi.join(email.trim());
      setStatus('success');
      setEmail('');
      setTimeout(() => setStatus(null), 5000);
    } catch {
      setStatus('error');
      setTimeout(() => setStatus(null), 5000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id={id} className="sc-waitlist">
      <form onSubmit={handleSubmit} className="sc-waitlist-row">
        <input
          type="email"
          className="sc-input"
          placeholder="you@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={loading}
        />
        <button type="submit" className={`sc-btn sc-btn-primary ${compact ? '' : 'sc-btn-lg'}`} disabled={loading}>
          {loading ? 'Joining...' : compact ? 'Join waitlist' : 'Get early access'}
        </button>
      </form>
      {status === 'success' && (
        <div className="sc-waitlist-success">
          You&apos;re on the list — we&apos;ll reach out when your spot opens.
        </div>
      )}
      {status === 'error' && (
        <div className="sc-waitlist-success" style={{ borderColor: '#ef4444', color: '#ef4444', backgroundColor: 'rgba(239,68,68,0.1)' }}>
          Could not join waitlist. Make sure the server is running.
        </div>
      )}
      {!compact && (
        <p className="sc-waitlist-note">Free during beta · No credit card required</p>
      )}
    </div>
  );
};

export default WaitlistForm;
