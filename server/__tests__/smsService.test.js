const test = require('node:test');
const assert = require('node:assert/strict');

const smsService = require('../services/smsService');

test('detects Twilio configuration when credentials are present', () => {
  process.env.TWILIO_ACCOUNT_SID = 'AC123';
  process.env.TWILIO_AUTH_TOKEN = 'token';
  process.env.TWILIO_PHONE_NUMBER = '+15551234567';

  assert.equal(smsService.isSmsConfigured(), true);
});

test('returns a stub result when no SMS provider is configured', async () => {
  delete process.env.TWILIO_ACCOUNT_SID;
  delete process.env.TWILIO_AUTH_TOKEN;
  delete process.env.TWILIO_PHONE_NUMBER;

  const result = await smsService.sendSms('+919876543210', 'hello');

  assert.equal(result.sent, false);
  assert.equal(result.reason, 'sms_not_configured');
});
