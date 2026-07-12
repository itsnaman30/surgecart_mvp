jest.mock('axios');
jest.mock('../services/proxyManager', () => ({
  getRotatedAgent: jest.fn(() => ({ httpsAgent: null, proxyUrl: 'test-proxy' })),
  generateDeviceFingerprint: jest.fn(() => ({ 'User-Agent': 'test-agent' })),
}));

const axios = require('axios');
const scraperEngine = require('../services/scraperEngine');

describe('scraperEngine.fetchBlinkitSlotTelemetry', () => {
  afterEach(() => jest.clearAllMocks());

  it('returns out-of-bounds when no merchant id is resolved', async () => {
    axios.post.mockResolvedValue({ data: { data: {} } });

    const res = await scraperEngine.fetchBlinkitSlotTelemetry(13, 80);
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/Out of bounds/i);
    expect(axios.get).not.toHaveBeenCalled();
  });

  it('reports slot availability when slots are returned', async () => {
    axios.post.mockResolvedValue({ data: { data: { merchant_id: 'm-1' } } });
    axios.get.mockResolvedValue({
      data: { data: { slots: [{ id: 1 }], current_backlog_count: 4 } },
    });

    const res = await scraperEngine.fetchBlinkitSlotTelemetry(13, 80);
    expect(res.success).toBe(true);
    expect(res.merchantNode).toBe('m-1');
    expect(res.isSlotAvailable).toBe(true);
    expect(res.backloggedQueueSize).toBe(4);
  });

  it('reports no availability when slots array is empty', async () => {
    axios.post.mockResolvedValue({ data: { data: { merchant_id: 'm-2' } } });
    axios.get.mockResolvedValue({ data: { data: { slots: [] } } });

    const res = await scraperEngine.fetchBlinkitSlotTelemetry(13, 80);
    expect(res.success).toBe(true);
    expect(res.isSlotAvailable).toBe(false);
    expect(res.backloggedQueueSize).toBe(0);
  });

  it('captures network errors safely', async () => {
    axios.post.mockRejectedValue(new Error('boom'));

    const res = await scraperEngine.fetchBlinkitSlotTelemetry(13, 80);
    expect(res.success).toBe(false);
    expect(res.error).toBe('boom');
  });
});

describe('scraperEngine.fetchZeptoSlotTelemetry', () => {
  afterEach(() => jest.clearAllMocks());

  it('counts open windows as availability', async () => {
    axios.get.mockResolvedValue({
      data: [{ is_available: true }, { is_available: false }, { is_available: true }],
    });

    const res = await scraperEngine.fetchZeptoSlotTelemetry(13, 80);
    expect(res.success).toBe(true);
    expect(res.isSlotAvailable).toBe(true);
    expect(res.availableSlotsCount).toBe(2);
  });

  it('reports no availability when there are no open windows', async () => {
    axios.get.mockResolvedValue({ data: [{ is_available: false }] });

    const res = await scraperEngine.fetchZeptoSlotTelemetry(13, 80);
    expect(res.success).toBe(true);
    expect(res.isSlotAvailable).toBe(false);
    expect(res.availableSlotsCount).toBe(0);
  });

  it('captures network errors safely', async () => {
    axios.get.mockRejectedValue(new Error('timeout'));

    const res = await scraperEngine.fetchZeptoSlotTelemetry(13, 80);
    expect(res.success).toBe(false);
    expect(res.error).toBe('timeout');
  });
});
