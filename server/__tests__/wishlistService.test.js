const mockSqlite = {
  findWishlistByUser: jest.fn(),
  createWishlistForUser: jest.fn(),
  removeWishlistById: jest.fn(),
};
jest.mock('../db/sqlite', () => mockSqlite);

jest.mock('fs', () => {
  const store = {};
  return {
    __store: store,
    __reset: () => {
      for (const k of Object.keys(store)) delete store[k];
    },
    existsSync: jest.fn((p) => Object.prototype.hasOwnProperty.call(store, p)),
    readFileSync: jest.fn((p) => store[p]),
    writeFileSync: jest.fn((p, data) => {
      store[p] = data;
    }),
    mkdirSync: jest.fn(),
  };
});

const fs = require('fs');

function loadFresh(useSqlite) {
  if (useSqlite === false) process.env.USE_SQLITE = 'false';
  else delete process.env.USE_SQLITE;
  let mod;
  jest.isolateModules(() => {
    mod = require('../services/wishlistService');
  });
  return mod;
}

describe('wishlistService (JSON mode)', () => {
  let svc;

  beforeEach(() => {
    fs.__reset();
    Object.values(mockSqlite).forEach((fn) => fn.mockReset());
    svc = loadFresh(false);
  });

  afterEach(() => {
    delete process.env.USE_SQLITE;
  });

  it('creates a wishlist item with normalized fields', async () => {
    const item = await svc.createForUser('user-1', {
      platform: 'Blinkit',
      title: 'Bisleri',
      desiredPrice: '30',
      latitude: '13.01',
      longitude: '80.25',
      monitor: 1,
    });

    expect(item.id).toMatch(/^wl-/);
    expect(item.userId).toBe('user-1');
    expect(item.platform).toBe('Blinkit');
    expect(item.desiredPrice).toBe(30);
    expect(item.latitude).toBe(13.01);
    expect(item.monitor).toBe(true);
    expect(typeof item.createdAt).toBe('string');
  });

  it('applies defaults for missing fields', async () => {
    const item = await svc.createForUser('user-2', {});
    expect(item.platform).toBe('Unknown');
    expect(item.title).toBe('Saved item');
    expect(item.desiredPrice).toBeNull();
    expect(item.latitude).toBeNull();
    expect(item.monitor).toBe(false);
  });

  it('finds only the requesting user items, newest first', async () => {
    await svc.createForUser('user-1', { title: 'A' });
    await new Promise((r) => setTimeout(r, 2));
    await svc.createForUser('user-1', { title: 'B' });
    await svc.createForUser('user-2', { title: 'C' });

    const items = await svc.findByUser('user-1');
    expect(items).toHaveLength(2);
    expect(items.every((i) => i.userId === 'user-1')).toBe(true);
    expect(new Date(items[0].createdAt) >= new Date(items[1].createdAt)).toBe(true);
  });

  it('removes an item owned by the user', async () => {
    const created = await svc.createForUser('user-1', { title: 'A' });
    const removed = await svc.removeById(created.id, 'user-1');
    expect(removed.id).toBe(created.id);
    expect(await svc.findByUser('user-1')).toHaveLength(0);
  });

  it('does not remove an item owned by another user', async () => {
    const created = await svc.createForUser('user-1', { title: 'A' });
    const removed = await svc.removeById(created.id, 'user-2');
    expect(removed).toBeNull();
    expect(await svc.findByUser('user-1')).toHaveLength(1);
  });
});

describe('wishlistService (SQLite mode)', () => {
  let svc;

  beforeEach(() => {
    Object.values(mockSqlite).forEach((fn) => fn.mockReset());
    svc = loadFresh(true);
  });

  it('delegates findByUser to the sqlite layer', async () => {
    mockSqlite.findWishlistByUser.mockReturnValue([{ id: 'x' }]);
    const res = await svc.findByUser('user-1');
    expect(mockSqlite.findWishlistByUser).toHaveBeenCalledWith('user-1');
    expect(res).toEqual([{ id: 'x' }]);
  });

  it('delegates createForUser to the sqlite layer', async () => {
    mockSqlite.createWishlistForUser.mockReturnValue({ id: 'y' });
    const payload = { title: 'Item' };
    const res = await svc.createForUser('user-1', payload);
    expect(mockSqlite.createWishlistForUser).toHaveBeenCalledWith('user-1', payload);
    expect(res).toEqual({ id: 'y' });
  });

  it('delegates removeById to the sqlite layer', async () => {
    mockSqlite.removeWishlistById.mockReturnValue({ id: 'z' });
    const res = await svc.removeById('z', 'user-1');
    expect(mockSqlite.removeWishlistById).toHaveBeenCalledWith('z', 'user-1');
    expect(res).toEqual({ id: 'z' });
  });
});
