import WaitlistForm from './WaitlistForm';

const CTABanner = () => (
  <div className="sc-cta-banner">
    <h2>Ready to stop refreshing?</h2>
    <p>Join the waitlist and be first in line when we open the next batch of beta spots.</p>
    <WaitlistForm compact />
  </div>
);

export default CTABanner;
