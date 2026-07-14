const PLAN_CONFIG = {
  free: {
    name: 'Free',
    maxWatches: 3,
    smsAlerts: false,
    priorityQueue: false,
    analyticsHistory: false,
  },
  pro: {
    name: 'Pro',
    maxWatches: 50,
    smsAlerts: true,
    priorityQueue: true,
    analyticsHistory: true,
  },
};

function getPlanConfig(plan = 'free') {
  return PLAN_CONFIG[plan] || PLAN_CONFIG.free;
}

function getPlanLimit(plan = 'free') {
  return getPlanConfig(plan).maxWatches;
}

function normalizePlan(plan = 'free') {
  return typeof plan === 'string' && plan.toLowerCase() === 'pro' ? 'pro' : 'free';
}

module.exports = {
  PLAN_CONFIG,
  getPlanConfig,
  getPlanLimit,
  normalizePlan,
};
