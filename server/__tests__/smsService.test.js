const mockSend = jest.fn();
jest.mock('@aws-sdk/client-sns', () => ({
  SNSClient: jest.fn().mockImplementation(() => ({ send: mockSend })),
  PublishCommand: jest.fn().mockImplementation((args) => ({ __type: 'PublishCommand', ...args })),
}));

// In-memory fs so the service never touches the real data files.
jest.mock('fs', () => {
  const store = {};
  return {
    __store: store,
    __reset: () => {
      for (const k of Object.keys(store)) delete store[k];
    },
    existsSync: jest.fn((p) => Object.prototype.hasOwnProperty.call(store, p)),
    readFileSync: jest.fn((p) => {
      if (!Object.prototype.hasOwnProperty.call(store, p)) {
        throw new Error(`ENOENT: ${p}`);
      }
      return store[p];
    }),
    writeFileSync: jest.fn((p, data) => {
      store[p] = data;
    }),
    mkdirSync: jest.fn(),
  };
});

const AWS_ENV = ['AWS_REGION', 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY'];

function loadFresh() {
  let mod;
  jest.isolateModules(() => {
    mod = require('../services/smsService');
  });
  return mod;
}

describe('smsService', () => {
  const saved = {};

  beforeEach(() => {
    AWS_ENV.forEach((k) => {
      saved[k] = process.env[k];
      delete process.env[k];
    });
    mockSend.mockReset();
    require('fs').__reset();
    require('fs').writeFileSync.mockClear();
  });

  afterEach(() => {
    AWS_ENV.forEach((k) => {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    });
  });

  describe('normalizePhoneNumber', () => {
    let normalizePhoneNumber;
    beforeEach(() => {
      ({ normalizePhoneNumber } = loadFresh());
    });

    it('returns null for empty or whitespace input', () => {
      expect(normalizePhoneNumber('')).toBeNull();
      expect(normalizePhoneNumber('   ')).toBeNull();
      expect(normalizePhoneNumber(undefined)).toBeNull();
    });

    it('keeps a valid E.164 number', () => {
      expect(normalizePhoneNumber('+919876543210')).toBe('+919876543210');
    });

    it('rejects an invalid E.164 number', () => {
      expect(normalizePhoneNumber('+0123')).toBeNull();
    });

    it('converts a 10-digit Indian number', () => {
      expect(normalizePhoneNumber('9876543210')).toBe('+919876543210');
    });

    it('strips separators and formatting', () => {
      expect(normalizePhoneNumber('(987) 654-3210')).toBe('+919876543210');
    });

    it('handles a leading 0 national number', () => {
      expect(normalizePhoneNumber('09876543210')).toBe('+919876543210');
    });

    it('handles a 00 international prefix', () => {
      expect(normalizePhoneNumber('00919876543210')).toBe('+919876543210');
    });

    it('handles a 91-prefixed 12-digit number', () => {
      expect(normalizePhoneNumber('919876543210')).toBe('+919876543210');
    });

    it('rejects junk input', () => {
      expect(normalizePhoneNumber('abcd')).toBeNull();
      expect(normalizePhoneNumber('123')).toBeNull();
    });
  });

  describe('isAwsSnsConfigured', () => {
    it('is false when credentials are missing', () => {
      const { isAwsSnsConfigured } = loadFresh();
      expect(isAwsSnsConfigured()).toBe(false);
    });

    it('is false for placeholder credentials', () => {
      process.env.AWS_REGION = 'us-east-1';
      process.env.AWS_ACCESS_KEY_ID = 'your_access_key';
      process.env.AWS_SECRET_ACCESS_KEY = 'your_secret';
      const { isAwsSnsConfigured } = loadFresh();
      expect(isAwsSnsConfigured()).toBe(false);
    });

    it('ignores trailing comments and is true for real credentials', () => {
      process.env.AWS_REGION = 'us-east-1 # primary';
      process.env.AWS_ACCESS_KEY_ID = 'AKIAREAL';
      process.env.AWS_SECRET_ACCESS_KEY = 'realsecret';
      const { isAwsSnsConfigured } = loadFresh();
      expect(isAwsSnsConfigured()).toBe(true);
    });
  });

  describe('register / collect targets', () => {
    it('registers and deduplicates normalized numbers', () => {
      const svc = loadFresh();
      expect(svc.registerPhoneNumber('9876543210')).toBe('+919876543210');
      expect(svc.registerPhoneNumber('09876543210')).toBe('+919876543210');
      expect(svc.getRegisteredTargets()).toContain('+919876543210');
      expect(
        svc.getRegisteredTargets().filter((n) => n === '+919876543210').length,
      ).toBe(1);
    });

    it('returns null when registering an invalid number', () => {
      const svc = loadFresh();
      expect(svc.registerPhoneNumber('nope')).toBeNull();
    });

    it('collects the track phone alongside registered targets', () => {
      const svc = loadFresh();
      svc.registerPhoneNumber('9000000000');
      const phones = svc.collectAlertPhones({ phoneNumber: '8123456789' });
      expect(phones).toContain('+918123456789');
      expect(phones).toContain('+919000000000');
    });
  });

  describe('sendSms', () => {
    it('returns missing_number when no recipient is given', async () => {
      const { sendSms } = loadFresh();
      expect(await sendSms('', 'hi')).toEqual({ sent: false, reason: 'missing_number' });
    });

    it('stubs out delivery when AWS SNS is not configured', async () => {
      const { sendSms } = loadFresh();
      const res = await sendSms('+919876543210', 'hello');
      expect(res).toEqual({ sent: false, reason: 'aws_sns_not_configured' });
      expect(mockSend).not.toHaveBeenCalled();
    });

    it('publishes via SNS when configured', async () => {
      process.env.AWS_REGION = 'us-east-1';
      process.env.AWS_ACCESS_KEY_ID = 'AKIAREAL';
      process.env.AWS_SECRET_ACCESS_KEY = 'realsecret';
      mockSend.mockResolvedValue({ MessageId: 'abc' });
      const { sendSms } = loadFresh();

      const res = await sendSms('+919876543210', 'hello');
      expect(res).toEqual({ sent: true });
      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it('reports the failure reason when SNS throws', async () => {
      process.env.AWS_REGION = 'us-east-1';
      process.env.AWS_ACCESS_KEY_ID = 'AKIAREAL';
      process.env.AWS_SECRET_ACCESS_KEY = 'realsecret';
      mockSend.mockRejectedValue(new Error('throttled'));
      const { sendSms } = loadFresh();

      const res = await sendSms('+919876543210', 'hello');
      expect(res).toEqual({ sent: false, reason: 'throttled' });
    });
  });

  describe('sendSlotOpenAlert', () => {
    it('returns an empty list when there are no phones to alert', async () => {
      const { sendSlotOpenAlert } = loadFresh();
      const outcomes = await sendSlotOpenAlert(
        { platform: 'Blinkit', location: 'Adyar', phoneNumber: '' },
        {},
      );
      expect(outcomes).toEqual([]);
    });

    it('attempts delivery for each collected phone', async () => {
      const svc = loadFresh();
      const outcomes = await svc.sendSlotOpenAlert(
        { platform: 'Blinkit', location: 'Adyar', phoneNumber: '9876543210' },
        { checkoutUrl: 'https://blinkit.com/' },
      );
      expect(outcomes.length).toBeGreaterThanOrEqual(1);
      expect(outcomes[0]).toHaveProperty('phone');
      expect(outcomes[0]).toHaveProperty('sent');
    });
  });
});
