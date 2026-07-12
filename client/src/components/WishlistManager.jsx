import { useCallback, useEffect, useState } from 'react';
import { wishlistApi } from '../api/client';

const WishlistManager = ({ triggerToast }) => {
  const [items, setItems] = useState([]);
  const [loadState, setLoadState] = useState({ loading: true, error: '' });
  const [form, setForm] = useState({
    platform: 'Blinkit',
    title: '',
    url: '',
    location: '',
    latitude: '',
    longitude: '',
    monitor: false,
    desiredPrice: '',
    allowDangerousDelivery: false,
  });
  const [preview, setPreview] = useState({ loading: false, title: '', checkoutUrl: '', price: null });

  const load = useCallback(() => {
    setLoadState({ loading: true, error: '' });
    wishlistApi.list()
      .then((res) => {
        setItems(Array.isArray(res.data) ? res.data : []);
        setLoadState({ loading: false, error: '' });
      })
      .catch((err) => {
        const message = err.response?.status === 401
          ? 'Session expired. Please sign in again to view saved items.'
          : 'Could not load saved items. Check that the server is running.';
        setLoadState({ loading: false, error: message });
      });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...form, desiredPrice: form.desiredPrice ? Number(form.desiredPrice) : null };
      if (!payload.title) return triggerToast?.('Enter item title', 'error');
      const res = await wishlistApi.create(payload);
      setItems((s) => [res.data, ...s]);
      setForm({
        platform: 'Blinkit',
        title: '',
        url: '',
        location: '',
        latitude: '',
        longitude: '',
        monitor: false,
        desiredPrice: '',
        allowDangerousDelivery: false,
      });
      triggerToast?.('Saved item');
    } catch (err) {
      if (err.response?.status === 401) {
        triggerToast?.('Session expired. Please sign in again to save items.', 'error');
        return;
      }
      triggerToast?.(err.response?.data?.error || 'Failed to save', 'error');
    }
  };

  const captureLocation = () => {
    if (!navigator.geolocation) return triggerToast?.('Geolocation not available', 'error');
    navigator.geolocation.getCurrentPosition((pos) => {
      setForm((f) => ({ ...f, latitude: pos.coords.latitude, longitude: pos.coords.longitude }));
      triggerToast?.('Captured location');
    }, () => triggerToast?.('Failed to get location', 'error'));
  };

  const handlePreview = async () => {
    if (!form.url) return triggerToast?.('Enter a product URL to preview', 'error');
    try {
      setPreview({ loading: true, title: '', checkoutUrl: '', price: null });
      const res = await wishlistApi.preview(form.url);
      setPreview({
        loading: false,
        title: res.data.title || '',
        checkoutUrl: res.data.checkoutUrl || form.url,
        price: res.data.price ?? null,
      });
      setForm((f) => ({
        ...f,
        title: res.data.title || f.title,
        checkoutUrl: res.data.checkoutUrl || f.url,
        lastSeenPrice: res.data.price ?? f.lastSeenPrice,
      }));
      triggerToast?.('Preview loaded');
    } catch {
      setPreview({ loading: false, title: '', checkoutUrl: '', price: null });
      triggerToast?.('Preview failed', 'error');
    }
  };

  const handleRemove = async (id) => {
    try {
      await wishlistApi.remove(id);
      setItems((s) => s.filter((i) => i.id !== id));
      triggerToast?.('Removed');
    } catch {
      triggerToast?.('Failed to remove', 'error');
    }
  };

  return (
    <div style={{ display: 'flex', gap: '20px', flexDirection: 'column' }}>
      <form onSubmit={handleAdd} style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
        <select value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })} style={{ padding: '8px' }}>
          <option>Blinkit</option>
          <option>Zepto</option>
          <option>Instamart</option>
        </select>
        <input placeholder="Item title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} style={{ minWidth: 200, padding: '8px' }} />
        <input placeholder="Product url (optional)" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} style={{ minWidth: 260, padding: '8px' }} />
        <input placeholder="Desired price (optional)" value={form.desiredPrice} onChange={(e) => setForm({ ...form, desiredPrice: e.target.value })} style={{ width: 140, padding: '8px' }} />
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <input type="checkbox" checked={form.monitor} onChange={(e) => setForm({ ...form, monitor: e.target.checked })} /> Monitor
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }} title="Override weather safety checks and allow monitoring even in heavy storms">
          <input type="checkbox" checked={form.allowDangerousDelivery} onChange={(e) => setForm({ ...form, allowDangerousDelivery: e.target.checked })} /> Allow monitoring in severe weather (opt-in)
        </label>
        <button type="button" onClick={captureLocation} style={{ padding: '8px 12px' }}>Use my location</button>
        <button type="button" onClick={handlePreview} style={{ padding: '8px 12px' }}>{preview.loading ? 'Previewing...' : 'Preview'}</button>
        <button type="submit" style={{ padding: '8px 12px' }}>Save</button>
      </form>

      {preview.title || preview.checkoutUrl || preview.price != null ? (
        <div style={{ marginTop: 8, padding: 10, border: '1px dashed #e6eef6', borderRadius: 8 }}>
          <div style={{ fontWeight: 700 }}>{preview.title || 'Preview'}</div>
          <div style={{ color: '#64748b' }}>{preview.checkoutUrl}</div>
          {preview.price != null ? <div style={{ marginTop: 6, color: '#0f172a' }}>Current price: ₹{preview.price}</div> : null}
        </div>
      ) : null}

      <div>
        {loadState.loading ? (
          <div style={{ color: '#64748b' }}>Loading saved items...</div>
        ) : loadState.error ? (
          <div style={{ padding: '14px', border: '1px dashed #cbd5e1', borderRadius: '8px', color: '#475569' }}>
            <div style={{ marginBottom: '10px' }}>{loadState.error}</div>
            <button type="button" onClick={load} style={{ padding: '8px 12px' }}>Retry</button>
          </div>
        ) : items.length === 0 ? (
          <div style={{ color: '#64748b' }}>No saved items yet.</div>
        ) : (
          items.map((it) => (
            <div key={it.id} style={{ padding: '12px', border: '1px solid #e6eef6', borderRadius: '8px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 700 }}>
                  {it.title} <span style={{ fontSize: 12, color: '#64748b' }}>· {it.platform}</span>
                </div>
                <div style={{ fontSize: 13, color: '#64748b' }}>
                  {it.url} {it.checkoutUrl ? `· checkout: ${it.checkoutUrl}` : ''}
                </div>
                {it.desiredPrice ? <div style={{ fontSize: 13, color: '#0f172a' }}>Desired: ₹{it.desiredPrice}</div> : null}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                {it.monitor && <div style={{ fontSize: 12, color: '#10b981' }}>Monitoring</div>}
                <button type="button" onClick={() => handleRemove(it.id)} style={{ padding: '6px 10px' }}>Remove</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default WishlistManager;
