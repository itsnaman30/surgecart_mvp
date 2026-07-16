import { Link } from 'react-router-dom';

const plans = [
  {
    name: 'Beta',
    price: 'Free',
    period: 'during early access',
    featured: true,
    features: [
      'Up to 3 active watches',
      'Zepto, Blinkit & Instamart',
      'Push & in-app alerts',
      'Demand trend charts',
    ],
    cta: 'Join waitlist',
    ctaHref: '#waitlist',
  },
  {
    name: 'Pro',
    price: '₹199',
    period: '/ month · coming soon',
    featured: false,
    features: [
      '50 watches',
      'Smart surge mode',
      'Priority alert queue',
      'SMS fallback alerts',
      'Demand-aware scan cadence',
    ],
    cta: 'Upgrade to Pro',
    ctaHref: '/premium',
  },
];


const Pricing = () => (
  <section id="pricing" className="sc-section sc-section-alt">
    <div className="sc-container">
      <div className="sc-section-header">
        <span className="sc-eyebrow">Pricing</span>
        <h2 className="sc-section-title">Start free, upgrade when you need more</h2>
        <p className="sc-section-desc">
          Beta access is completely free. Pro launches after we nail the core experience.
        </p>
      </div>

      <div className="sc-pricing-grid">
        {plans.map((plan) => (
          <div key={plan.name} className={`sc-price-card ${plan.featured ? 'featured' : ''}`}>
            {plan.featured && <span className="sc-price-badge">Current plan</span>}
            <p className="sc-price-name">{plan.name}</p>
            <p className="sc-price-amount">{plan.price}</p>
            <p className="sc-price-period">{plan.period}</p>
            <ul className="sc-price-features">
              {plan.features.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
            {plan.ctaHref === '#waitlist' ? (
              <a href={plan.ctaHref} className={`sc-btn ${plan.featured ? 'sc-btn-primary' : 'sc-btn-ghost'}`} style={{ width: '100%' }}>
                {plan.cta}
              </a>
            ) : (
              <Link
                to={plan.ctaHref}
                className={`sc-btn ${plan.featured ? 'sc-btn-primary' : 'sc-btn-ghost'} `}
                style={{ width: '100%' }}
              >
                {plan.cta}
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default Pricing;
