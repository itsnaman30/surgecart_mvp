import '../styles/landing.css';
import Navbar from '../components/landing/Navbar';
import Hero from '../components/landing/Hero';
import HowItWorks from '../components/landing/HowItWorks';
import Features from '../components/landing/Features';
import Pricing from '../components/landing/Pricing';
import FAQ from '../components/landing/FAQ';
import CTABanner from '../components/landing/CTABanner';
import Footer from '../components/landing/Footer';

const LandingPage = () => (
  <div className="landing">
    <Navbar />
    <main>
      <Hero />
      <HowItWorks />
      <Features />
      <Pricing />
      <FAQ />
      <CTABanner />
    </main>
    <Footer />
  </div>
);

export default LandingPage;
