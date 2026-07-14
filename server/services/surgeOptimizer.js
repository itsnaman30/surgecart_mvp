const { getPlanConfig } = require('./planService');

function getDemandContext(hour, platform) {
  const isPeak = hour >= 17 && hour <= 21;
  const isLunch = hour >= 11 && hour <= 14;
  const isEarlyMorning = hour >= 6 && hour <= 9;

  return {
    isPeak,
    isLunch,
    isEarlyMorning,
    platform,
    demandScore: isPeak ? 95 : isLunch ? 72 : isEarlyMorning ? 40 : 55,
  };
}

function getSmartIntervalMs(track, baseIntervalMs) {
  const plan = track?.plan || 'free';
  const config = getPlanConfig(plan);
  if (!config.priorityQueue) return baseIntervalMs;

  const hour = new Date().getHours();
  const context = getDemandContext(hour, track?.platform);
  const multiplier = context.isPeak ? 0.5 : context.isLunch ? 0.75 : 1;

  return Math.max(5000, Math.round(baseIntervalMs * multiplier));
}

function getSurgeStrategy(track, baseResult) {
  const plan = track?.plan || 'free';
  const config = getPlanConfig(plan);
  if (!config.priorityQueue) {
    return {
      strategy: 'baseline',
      message: baseResult?.message || 'Monitoring demand surge',
      priorityBoost: false,
    };
  }

  const hour = new Date().getHours();
  const context = getDemandContext(hour, track?.platform);

  if (context.isPeak && baseResult?.isSlotAvailable) {
    return {
      strategy: 'peak-burst',
      message: `Peak-hour surge detected — scanning faster and prioritizing alerts for ${track?.platform || 'this platform'}.`,
      priorityBoost: true,
      demandScore: context.demandScore,
    };
  }

  if (context.isLunch && !baseResult?.isSlotAvailable) {
    return {
      strategy: 'lunch-watch',
      message: `Demand is rising around lunch — keeping a tighter watch for ${track?.platform || 'this platform'}.`,
      priorityBoost: true,
      demandScore: context.demandScore,
    };
  }

  return {
    strategy: 'steady',
    message: baseResult?.message || 'Monitoring demand surge',
    priorityBoost: false,
    demandScore: context.demandScore,
  };
}

module.exports = {
  getDemandContext,
  getSmartIntervalMs,
  getSurgeStrategy,
};
