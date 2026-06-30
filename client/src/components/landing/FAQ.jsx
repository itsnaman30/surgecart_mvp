import { useState } from 'react';

const faqs = [
  {
    q: 'How does SurgeCart check for slots?',
    a: 'We run lightweight polling workers that check public slot availability on supported platforms for your saved locations. No login credentials are required for basic monitoring.',
  },
  {
    q: 'Which cities are supported?',
    a: 'We\'re starting with major metros in India — Bangalore, Mumbai, Delhi NCR, Chennai, and Hyderabad. More cities roll out as we expand platform coverage.',
  },
  {
    q: 'Will this get my account banned?',
    a: 'We use conservative polling intervals and respect platform rate limits. SurgeCart only reads publicly available slot data — it doesn\'t automate checkout or place orders on your behalf.',
  },
  {
    q: 'Can I watch multiple locations?',
    a: 'Beta users can track up to 3 locations simultaneously. Pro will offer unlimited watches when it launches.',
  },
  {
    q: 'Is there a mobile app?',
    a: 'The web console works on mobile today, with installable PWA support. Native iOS and Android apps are on the roadmap.',
  },
];

const FAQ = () => {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <section id="faq" className="sc-section">
      <div className="sc-container">
        <div className="sc-section-header">
          <span className="sc-eyebrow">FAQ</span>
          <h2 className="sc-section-title">Common questions</h2>
        </div>

        <div className="sc-faq-list">
          {faqs.map((faq, i) => (
            <div key={faq.q} className={`sc-faq-item ${openIndex === i ? 'open' : ''}`}>
              <button
                type="button"
                className="sc-faq-question"
                onClick={() => setOpenIndex(openIndex === i ? -1 : i)}
                aria-expanded={openIndex === i}
              >
                {faq.q}
                <span className="sc-faq-chevron">▼</span>
              </button>
              {openIndex === i && (
                <div className="sc-faq-answer">{faq.a}</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FAQ;
