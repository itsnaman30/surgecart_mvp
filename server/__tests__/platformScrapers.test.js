jest.mock('axios');
const axios = require('axios');

const { checkZeptoSlot: checkZeptoServiceability } = require('../services/platformScraper');
const { checkZeptoSlot } = require('../services/zeptoService');
const { checkBlinkitSlot } = require('../services/blinkitService');

describe('platformScraper.checkZeptoSlot', () => {
  afterEach(() => jest.clearAllMocks());

  it('is true only when serviceable and not in high demand', async () => {
    axios.get.mockResolvedValue({ data: { is_serviceable: true, high_demand: false } });
    expect(await checkZeptoServiceability('Chennai')).toBe(true);
  });

  it('is false during high demand', async () => {
    axios.get.mockResolvedValue({ data: { is_serviceable: true, high_demand: true } });
    expect(await checkZeptoServiceability('Chennai')).toBe(false);
  });

  it('is false on error', async () => {
    axios.get.mockRejectedValue(new Error('blocked'));
    expect(await checkZeptoServiceability('Chennai')).toBe(false);
  });
});

describe('zeptoService.checkZeptoSlot', () => {
  afterEach(() => jest.clearAllMocks());

  it('returns an open slot with ETA when serviceable', async () => {
    axios.get.mockResolvedValue({ data: { is_serviceable: true, delivery_eta: 12 } });
    const res = await checkZeptoSlot(13, 80);
    expect(res.available).toBe(true);
    expect(res.message).toContain('12');
  });

  it('returns unavailable when not serviceable', async () => {
    axios.get.mockResolvedValue({ data: { is_serviceable: false } });
    expect(await checkZeptoSlot(13, 80)).toEqual({ available: false });
  });

  it('returns unavailable on error', async () => {
    axios.get.mockRejectedValue(new Error('nope'));
    expect(await checkZeptoSlot(13, 80)).toEqual({ available: false });
  });
});

describe('blinkitService.checkBlinkitSlot', () => {
  afterEach(() => jest.clearAllMocks());

  it('returns available when the store is serviceable and not surging', async () => {
    axios.post.mockResolvedValue({ data: { is_unserviceable: false, high_demand_alert: false } });
    const res = await checkBlinkitSlot(13, 80);
    expect(res.available).toBe(true);
    expect(res.message).toMatch(/Blinkit slot/i);
  });

  it('returns unavailable when the store is unserviceable', async () => {
    axios.post.mockResolvedValue({ data: { is_unserviceable: true } });
    expect(await checkBlinkitSlot(13, 80)).toEqual({ available: false });
  });

  it('returns unavailable when facing a high demand alert', async () => {
    axios.post.mockResolvedValue({ data: { high_demand_alert: true } });
    expect(await checkBlinkitSlot(13, 80)).toEqual({ available: false });
  });

  it('returns unavailable on error', async () => {
    axios.post.mockRejectedValue(new Error('403'));
    expect(await checkBlinkitSlot(13, 80)).toEqual({ available: false });
  });
});
