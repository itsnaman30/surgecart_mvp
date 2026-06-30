const steps = [
  {
    num: '1',
    title: 'Add your location',
    desc: 'Sync your current location or enter GPS coordinates. SurgeCart maps the nearest dark stores and delivery zones for your area.',
  },
  {
    num: '2',
    title: 'We watch for you',
    desc: 'Our workers poll delivery slots every few seconds — without slowing down your phone or browser.',
  },
  {
    num: '3',
    title: 'Get notified instantly',
    desc: 'The moment a slot opens, you get a push alert or in-app ping. Tap through and checkout before it\'s gone.',
  },
];

const HowItWorks = () => (
  <section id="how-it-works" className="sc-section sc-section-alt">
    <div className="sc-container">
      <div className="sc-section-header">
        <span className="sc-eyebrow">How it works</span>
        <h2 className="sc-section-title">Three steps to stress-free groceries</h2>
        <p className="sc-section-desc">
          Stop refreshing apps during peak hours. Set it once and let SurgeCart do the watching.
        </p>
      </div>

      <div className="sc-steps">
        {steps.map((step) => (
          <div key={step.num} className="sc-step">
            <div className="sc-step-num">{step.num}</div>
            <h3 className="sc-step-title">{step.title}</h3>
            <p className="sc-step-desc">{step.desc}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default HowItWorks;
