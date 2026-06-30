import { Link } from 'react-router-dom';

const Navbar = () => (
  <nav className="sc-nav">
    <a href="#" className="sc-logo" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
      <span className="sc-logo-mark">S</span>
      SurgeCart
    </a>

    <ul className="sc-nav-links">
      <li><a href="#how-it-works">How it works</a></li>
      <li><a href="#features">Features</a></li>
      <li><a href="#pricing">Pricing</a></li>
      <li><a href="#faq">FAQ</a></li>
    </ul>

    <div className="sc-nav-actions">
      <Link to="/dashboard" className="sc-btn sc-btn-ghost">
        Open Console
      </Link>
      <a href="#waitlist" className="sc-btn sc-btn-primary">
        Join waitlist
      </a>
    </div>
  </nav>
);

export default Navbar;
