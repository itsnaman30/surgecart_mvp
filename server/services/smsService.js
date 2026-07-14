const fs = require('fs');
const path = require('path');
const twilio = require('twilio');

const TARGETS_FILE = path.join(__dirname, '..', 'data', 'sms-targets.json');
let registeredTargets = [];
let twilioClient = null;

function stripEnvComment(value) {
  return (value || '').replace(/\s*#.*$/, '').trim();
}

function isSmsConfigured() {
  const accountSid = stripEnvComment(process.env.TWILIO_ACCOUNT_SID);
  const authToken = stripEnvComment(process.env.TWILIO_AUTH_TOKEN);
  const fromNumber = stripEnvComment(process.env.TWILIO_PHONE_NUMBER);

  if (!accountSid || !authToken || !fromNumber) return false;
  if (accountSid.includes('your_') || authToken.includes('your_') || fromNumber.includes('your_')) return false;
  return true;
}

function isAwsSnsConfigured() {
  return isSmsConfigured();
}

function initializeTwilioClient() {
  if (twilioClient || !isSmsConfigured()) return twilioClient;

  try {
    twilioClient = twilio(
      stripEnvComment(process.env.TWILIO_ACCOUNT_SID),
      stripEnvComment(process.env.TWILIO_AUTH_TOKEN),
    );
    console.log('[SMS] Twilio client initialized');
    return twilioClient;
  } catch (err) {
    console.error('[SMS] Failed to initialize Twilio client:', err.message);
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
  try {
    if (fs.existsSync(TARGETS_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(TARGETS_FILE, 'utf8'));
      registeredTargets = Array.isArray(parsed)
        ? [...new Set(parsed.map(normalizePhoneNumber).filter(Boolean))]
        : [];
    }
  } catch (err) {
    console.warn('[sms] Could not load registered numbers:', err.message);
    registeredTargets = [];
  }
  return registeredTargets;
}

function persistRegisteredTargets() {
  try {
    fs.mkdirSync(path.dirname(TARGETS_FILE), { recursive: true });
    fs.writeFileSync(TARGETS_FILE, JSON.stringify(registeredTargets, null, 2));
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

  if (!isSmsConfigured()) {
    console.log(`[SMS stub] Would alert ${to}: ${body}`);
    return { sent: false, reason: 'sms_not_configured' };
  }

  try {
    const client = initializeTwilioClient();
    if (!client) {
      console.error(`[SMS] Failed to initialize Twilio client for ${to}`);
      return { sent: false, reason: 'sms_initialization_failed' };
    }

    await client.messages.create({
      body,
      from: stripEnvComment(process.env.TWILIO_PHONE_NUMBER),
      to,
    });

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
if (isSmsConfigured()) {
  console.log(`[SMS] ✅ Twilio configured and ready (From: ${stripEnvComment(process.env.TWILIO_PHONE_NUMBER)})`);
} else {
  console.log('[SMS] ⚠️  Twilio not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER to enable SMS');
}
console.log(`[SMS] Registered phone targets on startup: ${registeredTargets.length}`);

module.exports = {
  normalizePhoneNumber,
  isSmsConfigured,
  isAwsSnsConfigured,
  loadRegisteredTargets,
  getRegisteredTargets,
  registerPhoneNumber,
  collectAlertPhones,
  sendSms,
  sendSlotOpenAlert,
  sendRegistrationConfirmation,
};
