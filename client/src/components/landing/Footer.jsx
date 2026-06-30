const Footer = () => (
  <footer className="sc-footer">
    <div className="sc-container">
      <div className="sc-footer-grid">
        <div className="sc-footer-brand">
          <a href="#" className="sc-logo" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
            <span className="sc-logo-mark">S</span>
            SurgeCart
          </a>
          <p>
            Smart delivery slot monitoring for India&apos;s quick-commerce apps.
            Built for people tired of &quot;no slots available.&quot;
          </p>
        </div>

        <div className="sc-footer-col">
          <h4>Product</h4>
          <ul>
            <li><a href="#how-it-works">How it works</a></li>
            <li><a href="#features">Features</a></li>
            <li><a href="#pricing">Pricing</a></li>
            <li><a href="/dashboard">Console</a></li>
          </ul>
        </div>

        <div className="sc-footer-col">
          <h4>Company</h4>
          <ul>
            <li><a href="#faq">FAQ</a></li>
            <li><a href="mailto:hello@surgecart.in">Contact</a></li>
            <li><a href="#waitlist">Join waitlist</a></li>
          </ul>
        </div>
      </div>

      <div className="sc-footer-bottom">
        <span>© {new Date().getFullYear()} SurgeCart. All rights reserved.</span>
        <span>Made in India 🇮🇳</span>
      </div>
    </div>
  </footer>
);

export default Footer;
