import { Link } from 'react-router-dom';
import WaitlistForm from './WaitlistForm';

const Hero = () => (
  <section className="sc-hero sc-container">
    <div className="sc-hero-glow" aria-hidden="true" />

    <span className="sc-eyebrow">Now in private beta · Pro coming soon</span>

    <h1 className="sc-hero-title">
      Never miss a<br />
      <span className="accent">delivery slot again.</span>
    </h1>

    <p className="sc-hero-subtitle">
      When Blinkit, Zepto, or Instamart show &quot;no slots available&quot; during peak surge —
      SurgeCart keeps scanning for you and alerts you the second a window opens. Stop refreshing. Start living.
    </p>

    <div className="sc-hero-actions">
      <a href="#waitlist" className="sc-btn sc-btn-primary sc-btn-lg">
        Join the waitlist
      </a>
      <Link to="/dashboard" className="sc-btn sc-btn-ghost sc-btn-lg">
        Try the console →
      </Link>
    </div>

    <WaitlistForm id="waitlist" />

    <div className="sc-platforms-row">
      <span className="sc-platforms-label">Works with</span>
      <span className="sc-pill sc-pill-zepto">Zepto</span>
      <span className="sc-pill sc-pill-blinkit">Blinkit</span>
      <span className="sc-pill sc-pill-instamart">Instamart</span>
    </div>

    <div className="sc-hero-stats">
      <div className="sc-stat">
        <div className="sc-stat-value">&lt; 2s</div>
        <div className="sc-stat-label">Alert latency</div>
      </div>
      <div className="sc-stat">
        <div className="sc-stat-value">24/7</div>
        <div className="sc-stat-label">Slot monitoring</div>
      </div>
      <div className="sc-stat">
        <div className="sc-stat-value">3</div>
        <div className="sc-stat-label">Platforms supported</div>
      </div>
    </div>
  </section>
);

export default Hero;
