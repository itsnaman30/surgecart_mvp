import { useNavigate } from 'react-router-dom';
import { FREE_SCAN_LIMIT } from '../config';

const Premium = () => {
  const navigate = useNavigate();

  const features = [
    { label: 'Lifetime scans', free: `${FREE_SCAN_LIMIT} scans`, pro: 'Unlimited', highlight: false },
    { label: 'Scan restore on delete', free: 'No — scans are permanent', pro: 'N/A (unlimited)', highlight: false },
    { label: 'SMS alerts', free: '—', pro: '\u2713 Real-time SMS', highlight: true },
    { label: 'Priority queue', free: '—', pro: '\u2713 Priority during peak', highlight: true },
    { label: 'Demand analytics', free: 'Basic', pro: 'Advanced historical', highlight: true },
    { label: 'Platforms monitored', free: 'Blinkit, Zepto, Instamart', pro: 'All platforms', highlight: false },
    { label: 'Scan frequency', free: 'Standard', pro: 'Configurable (5s-2min)', highlight: false },
    { label: 'Browser notifications', free: '\u2713', pro: '\u2713', highlight: false },
    { label: 'Wishlist saved items', free: '\u2713', pro: '\u2713', highlight: false },
    { label: 'Weather safety checks', free: '\u2713', pro: '\u2713', highlight: false },
  ];

  return (
    <div style={container}>
      <div style={bgDecor1} />
      <div style={bgDecor2} />

      <nav style={nav}>
        <div onClick={() => navigate('/')} style={{ ...brand, cursor: 'pointer' }}>
          <div style={brandIcon} />
          <span style={{ fontWeight: 800 }}>SurgeCart</span>
        </div>
        <button type="button" onClick={() => navigate('/dashboard')} style={dashboardBtn}>
          Go to Dashboard \u2192
        </button>
      </nav>

      <main style={main}>
        <div style={header}>
          <div style={badge}>Upgrade your plan</div>
          <h1 style={title}>Unlock unlimited scans &<br />priority monitoring</h1>
          <p style={subtitle}>
            Free users get {FREE_SCAN_LIMIT} lifetime scans. Once used, they're gone \u2014 even if you delete watches.
            Upgrade to Pro for unlimited scans with priority queue and SMS alerts.
          </p>
        </div>

        <div style={cardsRow}>
          <div style={card(false)}>
            <div style={cardLabel(false)}>Free</div>
            <div style={priceRow}>
              <span style={price(false)}>\u20B90</span>
              <span style={pricePeriod(false)}>/ lifetime</span>
            </div>
            <div style={cardDesc(false)}>
              {FREE_SCAN_LIMIT} scans to try SurgeCart. See if slot monitoring works in your area.
            </div>
            <ul style={featureList}>
              <li style={featureItem(false)}>\u2713 {FREE_SCAN_LIMIT} lifetime scans</li>
              <li style={featureItem(false)}>\u2713 Basic demand signal</li>
              <li style={featureItem(false)}>\u2713 Browser alerts</li>
              <li style={{ ...featureItem(false), opacity: 0.4 }}>\u2715 SMS alerts</li>
              <li style={{ ...featureItem(false), opacity: 0.4 }}>\u2715 Priority queue</li>
              <li style={{ ...featureItem(false), opacity: 0.4 }}>\u2715 Advanced analytics</li>
            </ul>
            <button type="button" onClick={() => navigate('/auth')} style={cardBtn(false)}>
              Current plan
            </button>
          </div>

          <div style={card(true)}>
            <div style={proBadge}>BEST VALUE</div>
            <div style={cardLabel(true)}>Pro</div>
            <div style={priceRow}>
              <span style={price(true)}>\u20B9199</span>
              <span style={pricePeriod(true)}>/ month</span>
            </div>
            <div style={cardDesc(true)}>
              Unlimited scans. Priority monitoring during peak hours. SMS alerts when slots open.
            </div>
            <ul style={featureList}>
              <li style={featureItem(true)}>\u2713 Unlimited lifetime scans</li>
              <li style={featureItem(true)}>\u2713 Priority queue during surge</li>
              <li style={featureItem(true)}>\u2713 SMS alerts (real-time)</li>
              <li style={featureItem(true)}>\u2713 Advanced demand analytics</li>
              <li style={featureItem(true)}>\u2713 Configurable scan frequency</li>
              <li style={featureItem(true)}>\u2713 All platforms supported</li>
            </ul>
            <button type="button" onClick={() => navigate('/auth?upgrade=pro')} style={cardBtn(true)}>
              Upgrade to Pro \u2192
            </button>
          </div>
        </div>

        <div style={tableCard}>
          <h2 style={tableTitle}>Compare plans</h2>
          <div style={table}>
            {features.map((f, i) => (
              <div key={i} style={tableRow(i % 2 === 0)}>
                <div style={tableLabel}>
                  {f.highlight && <span style={star}>\u2726</span>}
                  {f.label}
                </div>
                <div style={tableCell(false)}>{f.free}</div>
                <div style={tableCell(true)}>{f.pro}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={faqCard}>
          <h2 style={tableTitle}>Frequently asked questions</h2>
          <div style={faqItem}>
            <div style={faqQ}>What happens to my free scans if I delete a watch?</div>
            <div style={faqA}>
              Free plan scans are consumed permanently. Deleting a watch does NOT restore a scan slot.
              You get {FREE_SCAN_LIMIT} lifetime scans on the Free plan.
            </div>
          </div>
          <div style={faqItem}>
            <div style={faqQ}>Can I upgrade mid-cycle?</div>
            <div style={faqA}>
              Yes! Upgrading to Pro gives you unlimited scans and priority queue immediately.
            </div>
          </div>
          <div style={faqItem}>
            <div style={faqQ}>What payment methods do you accept?</div>
            <div style={faqA}>
              We support all major UPI apps, credit/debit cards, and net banking.
            </div>
          </div>
        </div>
      </main>

      <footer style={footer}>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>
          \u00A9 2024 SurgeCart \u2014 Never miss a delivery slot again.
        </p>
      </footer>
    </div>
  );
};

const container = {
  minHeight: '100vh',
  backgroundColor: '#f8fafc',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  position: 'relative',
  overflow: 'hidden',
};
const bgDecor1 = {
  position: 'absolute', top: '-200px', right: '-200px',
  width: '500px', height: '500px', borderRadius: '50%',
  background: 'radial-gradient(circle, rgba(16, 185, 129, 0.06) 0%, transparent 70%)',
  pointerEvents: 'none',
};
const bgDecor2 = {
  position: 'absolute', bottom: '-300px', left: '-200px',
  width: '600px', height: '600px', borderRadius: '50%',
  background: 'radial-gradient(circle, rgba(139, 92, 246, 0.05) 0%, transparent 70%)',
  pointerEvents: 'none',
};
const nav = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  padding: '20px max(4%, 40px)', maxWidth: '1100px', margin: '0 auto',
  position: 'relative', zIndex: 2,
};
const brand = { fontSize: '20px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' };
const brandIcon = { width: '10px', height: '10px', borderRadius: '2px', backgroundColor: '#10b981', boxShadow: '0 0 12px rgba(16, 185, 129, 0.4)' };
const dashboardBtn = { padding: '10px 20px', borderRadius: '10px', backgroundColor: '#0f172a', color: '#fff', border: 'none', fontWeight: '700', fontSize: '13px', cursor: 'pointer' };
const main = { maxWidth: '900px', margin: '0 auto', padding: '20px max(4%, 40px) 60px', position: 'relative', zIndex: 2 };
const header = { textAlign: 'center', marginBottom: '48px' };
const badge = { display: 'inline-block', padding: '6px 16px', borderRadius: '999px', backgroundColor: '#d1fae5', color: '#059669', fontSize: '13px', fontWeight: '700', marginBottom: '16px' };
const title = { fontSize: '36px', fontWeight: '800', color: '#0f172a', margin: '0 0 16px', lineHeight: 1.2, letterSpacing: '-0.5px' };
const subtitle = { fontSize: '15px', color: '#64748b', lineHeight: 1.6, maxWidth: '600px', margin: '0 auto' };
const cardsRow = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '48px' };
const card = (isPro) => ({
  backgroundColor: isPro ? '#0f172a' : '#fff',
  border: isPro ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e2e8f0',
  borderRadius: '16px', padding: '32px', display: 'flex', flexDirection: 'column',
  position: 'relative', overflow: 'hidden',
  boxShadow: isPro ? '0 16px 32px rgba(15, 23, 42, 0.15)' : '0 4px 12px rgba(0,0,0,0.03)',
});
const proBadge = { position: 'absolute', top: '12px', right: '12px', padding: '4px 10px', borderRadius: '6px', backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10b981', fontSize: '10px', fontWeight: '800', letterSpacing: '1px' };
const cardLabel = (isPro) => ({ fontSize: '14px', fontWeight: '700', textTransform: 'uppercase', color: isPro ? 'rgba(255,255,255,0.5)' : '#94a3b8', letterSpacing: '1px', marginBottom: '12px' });
const priceRow = { display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '12px' };
const price = (isPro) => ({ fontSize: '40px', fontWeight: '800', color: isPro ? '#fff' : '#0f172a' });
const pricePeriod = (isPro) => ({ fontSize: '14px', color: isPro ? 'rgba(255,255,255,0.4)' : '#64748b' });
const cardDesc = (isPro) => ({ fontSize: '13px', color: isPro ? 'rgba(255,255,255,0.6)' : '#64748b', lineHeight: 1.5, marginBottom: '24px' });
const featureList = { listStyle: 'none', padding: 0, margin: '0 0 24px', display: 'flex', flexDirection: 'column', gap: '10px' };
const featureItem = (isPro) => ({ fontSize: '13px', fontWeight: '600', color: isPro ? 'rgba(255,255,255,0.8)' : '#334155', display: 'flex', alignItems: 'center', gap: '8px' });
const cardBtn = (isPro) => ({ width: '100%', padding: '14px', borderRadius: '10px', border: 'none', fontWeight: '700', fontSize: '14px', cursor: 'pointer', backgroundColor: isPro ? '#10b981' : '#f1f5f9', color: isPro ? '#fff' : '#64748b', marginTop: 'auto', transition: 'all 0.15s ease', boxShadow: isPro ? '0 4px 12px rgba(16, 185, 129, 0.25)' : 'none' });
const tableCard = { backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '32px', marginBottom: '24px' };
const tableTitle = { fontSize: '20px', fontWeight: '800', color: '#0f172a', margin: '0 0 20px' };
const table = { display: 'flex', flexDirection: 'column', gap: '2px' };
const tableRow = (even) => ({ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: '16px', padding: '12px 16px', borderRadius: '8px', backgroundColor: even ? '#f8fafc' : 'transparent', alignItems: 'center' });
const tableLabel = { fontSize: '13px', fontWeight: '600', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' };
const tableCell = (isPro) => ({ fontSize: '13px', color: isPro ? '#059669' : '#64748b', fontWeight: isPro ? '700' : '500' });
const star = { color: '#8b5cf6', fontSize: '12px' };
const faqCard = { backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '32px' };
const faqItem = { marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid #f1f5f9' };
const faqQ = { fontSize: '14px', fontWeight: '700', color: '#0f172a', marginBottom: '6px' };
const faqA = { fontSize: '13px', color: '#64748b', lineHeight: 1.6 };
const footer = { textAlign: 'center', padding: '32px', position: 'relative', zIndex: 2 };

export default Premium;

