const path = require('path');
const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');
const { readJsonFile, writeJsonFile } = require('../utils/jsonStore');

const TARGETS_FILE = path.join(__dirname, '..', 'data', 'sms-targets.json');
let registeredTargets = [];
let snsClient = null;

function stripEnvComment(value) {
  return (value || '').replace(/\s*#.*$/, '').trim();
}

function isAwsSnsConfigured() {
  const region = stripEnvComment(process.env.AWS_REGION);
  const accessKey = stripEnvComment(process.env.AWS_ACCESS_KEY_ID);
  const secretKey = stripEnvComment(process.env.AWS_SECRET_ACCESS_KEY);
  
  if (!region || !accessKey || !secretKey) return false;
  if (accessKey.includes('your_') || secretKey.includes('your_')) return false;
  return true;
}

function initializeAwsSns() {
  if (snsClient || !isAwsSnsConfigured()) return snsClient;
  
  try {
    snsClient = new SNSClient({
      region: stripEnvComment(process.env.AWS_REGION),
      credentials: {
        accessKeyId: stripEnvComment(process.env.AWS_ACCESS_KEY_ID),
        secretAccessKey: stripEnvComment(process.env.AWS_SECRET_ACCESS_KEY),
      },
    });
    console.log('[SMS] AWS SNS initialized');
    return snsClient;
  } catch (err) {
    console.error('[SMS] Failed to initialize AWS SNS:', err.message);
    return null;
  }
}

function normalizePhoneNumber(input) {
  if (!input?.trim()) return null;

  let digits = input.trim().replace(/[\s\-().]/g, '');
  if (digits.startsWith('+')) {
    return /^\+[1-9]\d{7,14}$/.test(digits) ? digits : null;
  }
  if (digits.startsWith('00')) {
    digits = `+${digits.slice(2)}`;
  } else if (digits.startsWith('91') && digits.length === 12) {
    digits = `+${digits}`;
  } else if (digits.startsWith('0') && digits.length === 11) {
    digits = `+91${digits.slice(1)}`;
  } else if (/^\d{10}$/.test(digits)) {
    digits = `+91${digits}`;
  } else if (/^\d{11,15}$/.test(digits)) {
    digits = `+${digits}`;
  } else {
    return null;
  }

  return /^\+[1-9]\d{7,14}$/.test(digits) ? digits : null;
}

function loadRegisteredTargets() {
  const parsed = readJsonFile(TARGETS_FILE, []);
  registeredTargets = Array.isArray(parsed)
    ? [...new Set(parsed.map(normalizePhoneNumber).filter(Boolean))]
    : [];
  return registeredTargets;
}

function persistRegisteredTargets() {
  try {
    writeJsonFile(TARGETS_FILE, registeredTargets);
  } catch (err) {
    console.warn('[sms] Could not persist registered numbers:', err.message);
  }
}

function getRegisteredTargets() {
  return [...registeredTargets];
}

function registerPhoneNumber(input) {
  const normalized = normalizePhoneNumber(input);
  if (!normalized) return null;
  if (!registeredTargets.includes(normalized)) {
    registeredTargets.push(normalized);
    persistRegisteredTargets();
  }
  return normalized;
}

function collectAlertPhones(track) {
  const phones = new Set();
  const trackPhone = normalizePhoneNumber(track?.phoneNumber);
  if (trackPhone) phones.add(trackPhone);
  for (const phone of registeredTargets) phones.add(phone);
  return [...phones];
}

async function sendSms(to, body) {
  if (!to) return { sent: false, reason: 'missing_number' };

  if (!isAwsSnsConfigured()) {
    console.log(`[SMS stub] Would alert ${to}: ${body}`);
    return { sent: false, reason: 'aws_sns_not_configured' };
  }

  try {
    const client = initializeAwsSns();
    if (!client) {
      console.error(`[SMS] Failed to initialize AWS SNS client for ${to}`);
      return { sent: false, reason: 'aws_sns_initialization_failed' };
    }

    const command = new PublishCommand({
      Message: body,
      PhoneNumber: to,
    });
    
    await client.send(command);
    
    console.log(`[SMS] ✅ Alert sent to ${to}`);
    return { sent: true };
  } catch (err) {
    console.error(`[SMS] ❌ Failed to send to ${to}: ${err.message}`);
    return { sent: false, reason: err.message };
  }
}

async function sendSlotOpenAlert(track, result) {
  const phones = collectAlertPhones(track);
  if (phones.length === 0) {
    console.log('[SMS] Slot opened but no registered phone numbers to alert');
    return [];
  }

  const checkout = result.checkoutUrl || track.checkoutUrl || '';
  const body = checkout
    ? `SurgeCart: ${track.platform} slot open near ${track.location}! Checkout now: ${checkout}`
    : `SurgeCart: ${track.platform} slot open near ${track.location}! Open SurgeCart to checkout.`;

  const outcomes = await Promise.allSettled(
    phones.map((phone) => sendSms(phone, body)),
  );

  return outcomes.map((outcome, i) => ({
    phone: phones[i],
    ...(outcome.status === 'fulfilled' ? outcome.value : { sent: false, reason: outcome.reason?.message }),
  }));
}

async function sendRegistrationConfirmation(to) {
  return sendSms(
    to,
    'SurgeCart: Your number is registered. We will text you the moment a delivery slot opens.',
  );
}

loadRegisteredTargets();

// Log SMS service status on startup
if (isAwsSnsConfigured()) {
  console.log(`[SMS] ✅ AWS SNS configured and ready (Region: ${stripEnvComment(process.env.AWS_REGION)})`);
} else {
  console.log('[SMS] ⚠️  AWS SNS not configured. Set AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY to enable SMS');
}
console.log(`[SMS] Registered phone targets on startup: ${registeredTargets.length}`);

module.exports = {
  normalizePhoneNumber,
  isAwsSnsConfigured,
  loadRegisteredTargets,
  getRegisteredTargets,
  registerPhoneNumber,
  collectAlertPhones,
  sendSms,
  sendSlotOpenAlert,
  sendRegistrationConfirmation,
};
