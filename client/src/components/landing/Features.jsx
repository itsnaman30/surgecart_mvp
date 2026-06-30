const features = [
  {
    icon: '⚡',
    title: 'Real-time slot alerts',
    desc: 'WebSocket-powered notifications deliver slot openings within seconds — not minutes.',
  },
  {
    icon: '📍',
    title: 'Hyperlocal monitoring',
    desc: 'Track multiple locations and platforms at once. Perfect for families across different neighborhoods.',
  },
  {
    icon: '📊',
    title: 'Demand insights',
    desc: 'See when slots typically open in your area so you can plan around peak delivery windows.',
  },
  {
    icon: '🔔',
    title: 'Push notifications',
    desc: 'Get native alerts on your phone even when the app is closed. Never miss a window again.',
  },
  {
    icon: '🛒',
    title: 'Cart persistence',
    desc: 'Keep items in your cart while you wait. When a slot opens, you\'re one tap from checkout.',
  },
  {
    icon: '🔒',
    title: 'Privacy first',
    desc: 'We only monitor public slot availability. Your cart data and credentials stay on your device.',
  },
];

const Features = () => (
  <section id="features" className="sc-section">
    <div className="sc-container">
      <div className="sc-section-header">
        <span className="sc-eyebrow">Features</span>
        <h2 className="sc-section-title">Built for the slot-hunting grind</h2>
        <p className="sc-section-desc">
          Everything you need to beat peak-hour delivery congestion — without living inside three different apps.
        </p>
      </div>

      <div className="sc-grid-3">
        {features.map((f) => (
          <div key={f.title} className="sc-card">
            <div className="sc-card-icon">{f.icon}</div>
            <h3 className="sc-card-title">{f.title}</h3>
            <p className="sc-card-desc">{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default Features;
