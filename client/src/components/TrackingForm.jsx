import { useState } from 'react';
import { tracksApi } from '../api/client';
import { MAX_WATCHES } from '../config';

const parseLatitude = (value) => {
  const n = parseFloat(value);
  if (Number.isNaN(n) || n < -90 || n > 90) return null;
  return n;
};

const parseLongitude = (value) => {
  const n = parseFloat(value);
  if (Number.isNaN(n) || n < -180 || n > 180) return null;
  return n;
};

const TrackingForm = ({ onWatchCreated, triggerToast, activeCount = 0, pollingInterval = 30000 }) => {
  const [platform, setPlatform] = useState('Blinkit');
  const [locationName, setLocationName] = useState('');
  const [locationMode, setLocationMode] = useState('auto');
  const [coords, setCoords] = useState({ latitude: null, longitude: null });
  const [manualLat, setManualLat] = useState('');
  const [manualLng, setManualLng] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hasAutoCoords = coords.latitude != null && coords.longitude != null;
  const hasManualCoords = parseLatitude(manualLat) != null && parseLongitude(manualLng) != null;
  const hasValidCoords = locationMode === 'auto' ? hasAutoCoords : hasManualCoords;

  const switchLocationMode = (mode) => {
    if (mode === locationMode) return;

    if (mode === 'manual' && hasAutoCoords) {
      setManualLat(coords.latitude.toFixed(6));
      setManualLng(coords.longitude.toFixed(6));
    }

    if (mode === 'auto' && hasManualCoords) {
      setCoords({
        latitude: parseLatitude(manualLat),
        longitude: parseLongitude(manualLng),
      });
    }

    setLocationMode(mode);
  };

  const captureDeviceLocation = () => {
    if (!navigator.geolocation) {
      return triggerToast('Your browser does not support GPS location.', 'error');
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        setCoords({ latitude, longitude });
        setManualLat(latitude.toFixed(6));
        setManualLng(longitude.toFixed(6));
        setIsLocating(false);
        triggerToast('Current location synced');
      },
      () => {
        setIsLocating(false);
        triggerToast('Could not get your location. Check browser permissions or enter coordinates manually.', 'error');
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  };

  const resolveCoords = () => {
    if (locationMode === 'auto') {
      if (!hasAutoCoords) return null;
      return { latitude: coords.latitude, longitude: coords.longitude };
    }

    const latitude = parseLatitude(manualLat);
    const longitude = parseLongitude(manualLng);
    if (latitude == null || longitude == null) return null;
    return { latitude, longitude };
  };

  const resetLocationFields = () => {
    setCoords({ latitude: null, longitude: null });
    setManualLat('');
    setManualLng('');
    setLocationMode('auto');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (activeCount >= MAX_WATCHES) {
      return triggerToast(`Beta limit: max ${MAX_WATCHES} active watches. Pause or remove one first.`, 'error');
    }
    if (!locationName.trim()) return triggerToast('Enter a location name (e.g. Home, Office)', 'error');

    const resolved = resolveCoords();
    if (!resolved) {
      return triggerToast(
        locationMode === 'auto'
          ? 'Sync your current location before starting a watch'
          : 'Enter valid latitude (-90 to 90) and longitude (-180 to 180)',
        'error',
      );
    }

    setIsSubmitting(true);
    try {
      const payload = {
        platform,
        location: locationName.trim(),
        latitude: resolved.latitude,
        longitude: resolved.longitude,
        phoneNumber: localStorage.getItem('surge_phone_route') || '',
        pollingIntervalMs: pollingInterval,
      };

      const response = await tracksApi.create(payload);
      triggerToast(`Now watching ${platform} near ${locationName.trim()}`);
      onWatchCreated(response.data);
      setLocationName('');
      resetLocationFields();
    } catch (err) {
      triggerToast(err.response?.data?.error || 'Failed to start watch. Is the server running?', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={card}>
      <h2 style={{ margin: '0 0 4px', fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>Watch for an open slot</h2>
      <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '28px', lineHeight: 1.6 }}>
        Pick a platform, set your location, and SurgeCart will keep scanning while demand is high.
        You will get an alert the moment a slot opens.
      </p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
        <div>
          <label style={label}>Platform</label>
          <select value={platform} onChange={(e) => setPlatform(e.target.value)} style={input}>
            <option value="Blinkit">Blinkit</option>
            <option value="Zepto">Zepto</option>
            <option value="Instamart">Swiggy Instamart</option>
          </select>
        </div>

        <div>
          <label style={label}>Location label</label>
          <input
            type="text"
            placeholder="e.g. Home — Koramangala"
            value={locationName}
            onChange={(e) => setLocationName(e.target.value)}
            style={input}
          />
        </div>

        <div style={gpsBox}>
          <div style={{ fontWeight: '700', fontSize: '13px', color: '#1e293b', marginBottom: '4px' }}>GPS coordinates</div>
          <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 14px' }}>
            Sync your current location or enter coordinates manually so we check the right dark store.
          </p>

          <div style={modeToggle}>
            <button
              type="button"
              onClick={() => switchLocationMode('auto')}
              style={locationMode === 'auto' ? modeBtnActive : modeBtn}
            >
              Current location
            </button>
            <button
              type="button"
              onClick={() => switchLocationMode('manual')}
              style={locationMode === 'manual' ? modeBtnActive : modeBtn}
            >
              Enter manually
            </button>
          </div>

          {locationMode === 'auto' ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={captureDeviceLocation}
                disabled={isLocating}
                style={{
                  padding: '10px 16px',
                  backgroundColor: hasAutoCoords ? '#1e293b' : '#3b82f6',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: isLocating ? 'wait' : 'pointer',
                  opacity: isLocating ? 0.8 : 1,
                }}
              >
                {isLocating ? 'Syncing location...' : hasAutoCoords ? '✓ Location synced' : 'Sync current location'}
              </button>
              {hasAutoCoords && (
                <span style={coordChip}>
                  {coords.latitude.toFixed(4)}, {coords.longitude.toFixed(4)}
                </span>
              )}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={subLabel}>Latitude</label>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="e.g. 12.9352"
                  value={manualLat}
                  onChange={(e) => setManualLat(e.target.value)}
                  style={input}
                />
              </div>
              <div>
                <label style={subLabel}>Longitude</label>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="e.g. 77.6245"
                  value={manualLng}
                  onChange={(e) => setManualLng(e.target.value)}
                  style={input}
                />
              </div>
              {manualLat && manualLng && !hasManualCoords && (
                <p style={{ gridColumn: '1 / -1', margin: 0, fontSize: '12px', color: '#ef4444' }}>
                  Use valid numbers: latitude -90 to 90, longitude -180 to 180.
                </p>
              )}
              {hasManualCoords && (
                <p style={{ gridColumn: '1 / -1', margin: 0, fontSize: '12px', color: '#059669' }}>
                  ✓ Coordinates ready
                </p>
              )}
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting || activeCount >= MAX_WATCHES || !hasValidCoords}
          style={{
            width: '100%', padding: '14px',
            backgroundColor: activeCount >= MAX_WATCHES || !hasValidCoords ? '#94a3b8' : '#10b981',
            color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '14px',
            cursor: isSubmitting || activeCount >= MAX_WATCHES || !hasValidCoords ? 'not-allowed' : 'pointer',
          }}
        >
          {isSubmitting ? 'Starting watch...' : activeCount >= MAX_WATCHES ? `Limit reached (${MAX_WATCHES} watches)` : 'Start watching'}
        </button>
      </form>
    </div>
  );
};

const card = { backgroundColor: '#fff', padding: '36px', borderRadius: '12px', border: '1px solid #e2e8f0', maxWidth: '560px' };
const label = { display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', marginBottom: '8px' };
const subLabel = { display: 'block', fontSize: '11px', fontWeight: '600', color: '#64748b', marginBottom: '6px' };
const input = { width: '100%', padding: '12px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' };
const gpsBox = { padding: '18px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' };
const modeToggle = { display: 'flex', gap: '8px', marginBottom: '14px', padding: '4px', backgroundColor: '#e2e8f0', borderRadius: '8px' };
const modeBtn = { flex: 1, padding: '8px 12px', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '700', color: '#64748b', backgroundColor: 'transparent', cursor: 'pointer' };
const modeBtnActive = { ...modeBtn, backgroundColor: '#fff', color: '#0f172a', boxShadow: '0 1px 2px rgba(15, 23, 42, 0.08)' };
const coordChip = { fontSize: '11px', fontFamily: 'monospace', color: '#64748b', backgroundColor: '#e2e8f0', padding: '4px 8px', borderRadius: '4px' };

export default TrackingForm;
