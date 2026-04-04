import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../i18n/LanguageContext';
import { FiCheck, FiArrowRight, FiAlertTriangle } from 'react-icons/fi';

export default function Apply() {
  const { authFetch } = useAuth();
  const { t } = useLanguage();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [schemes, setSchemes] = useState([]);
  const [selectedScheme, setSelectedScheme] = useState('');
  const [myApps, setMyApps] = useState([]);

  const [pan, setPan] = useState('');
  const [kisanCard, setKisanCard] = useState('');
  const [mobile, setMobile] = useState('');
  const [verifiedData, setVerifiedData] = useState(null);

  useEffect(() => {
    fetch('/api/verify/schemes?status=Active').then(r => r.json()).then(d => setSchemes(d.schemes || []));
    authFetch('/api/verify/my-applications').then(r => r.json()).then(d => setMyApps(d.applications || []));
  }, []);

  const isSchemeBlocked = (schemeId) => {
    const app = myApps.find(a => a.scheme_id === parseInt(schemeId));
    if (!app) return null;
    if (app.status === 'Approved' || app.status === 'Funded') return 'already_approved';
    if (app.status === 'Pending') return 'already_pending';
    return null;
  };

  const verifyDocuments = async () => {
    setLoading(true); setError('');
    try {
      const res = await authFetch('/api/verify/citizen', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pan, kisanCard, mobile, schemeId: parseInt(selectedScheme) })
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.autoRejected) { setError(data.error); setStep(4); return; }
        throw new Error(data.error);
      }
      setVerifiedData(data);
      setStep(3);
    } catch (err) { setError(err.message); }
    setLoading(false);
  };

  const selectedSchemeData = schemes.find(s => s.id === parseInt(selectedScheme));

  return (
    <div className="page fade-in">
      <div className="container" style={{ maxWidth: '600px' }}>
        <div className="page-header"><h1 className="page-title">{t('apply.title')}</h1></div>

        {/* Progress */}
        <div className="flex gap-1" style={{ justifyContent: 'center', marginBottom: '2rem', flexWrap: 'wrap' }}>
          {[t('apply.selectScheme'), t('apply.enterDocs'), t('apply.result')].map((s, i) => (
            <div key={i} className="flex gap-1" style={{ alignItems: 'center' }}>
              <div style={{ width: 30, height: 30, borderRadius: '50%', background: step > i + 1 ? 'var(--success)' : step === i + 1 ? 'var(--accent-primary)' : 'var(--bg-glass)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, color: 'white' }}>
                {step > i + 1 ? <FiCheck size={14} /> : i + 1}
              </div>
              <span style={{ fontSize: '0.75rem', color: step >= i + 1 ? 'var(--text-primary)' : 'var(--text-muted)' }}>{s}</span>
              {i < 2 && <div style={{ width: 20, height: 1, background: 'var(--border)' }} />}
            </div>
          ))}
        </div>

        {error && step !== 4 && <div style={{ padding: '0.75rem', background: 'var(--error-bg)', color: 'var(--error)', borderRadius: 'var(--radius-sm)', marginBottom: '1rem', fontSize: '0.85rem' }}>{error}</div>}

        {/* Step 1: Select Scheme */}
        {step === 1 && (
          <div className="card" style={{ padding: '2rem' }}>
            <h3 style={{ marginBottom: '1rem' }}>{t('apply.select')}</h3>
            {schemes.length === 0 ? (<p style={{ color: 'var(--text-muted)' }}>{t('apply.noSchemes')}</p>) : (
              <>
                {schemes.map(s => {
                  const blocked = isSchemeBlocked(s.id);
                  return (
                    <label key={s.id} style={{ display: 'block', padding: '1rem', margin: '0.5rem 0', background: selectedScheme === String(s.id) ? 'rgba(99,102,241,0.1)' : 'var(--bg-glass)', borderRadius: 'var(--radius-sm)', cursor: blocked ? 'not-allowed' : 'pointer', opacity: blocked ? 0.5 : 1, border: selectedScheme === String(s.id) ? '1px solid var(--accent-primary)' : '1px solid transparent' }}>
                      <div className="flex gap-1" style={{ alignItems: 'center' }}>
                        <input type="radio" name="scheme" value={s.id} disabled={!!blocked} checked={selectedScheme === String(s.id)} onChange={e => setSelectedScheme(e.target.value)} />
                        <div>
                          <strong>{s.name}</strong>
                          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>₹{s.per_citizen_amount?.toLocaleString()} {t('schemes.perCitizen')} ({s.instalment_count} {t('schemes.instalments')}) | {t('schemes.targetGroup')}: {s.target_occupation}s</p>
                          {blocked === 'already_approved' && <span className="badge badge-success" style={{ marginTop: '0.25rem' }}>{t('apply.alreadyApproved')}</span>}
                          {blocked === 'already_pending' && <span className="badge badge-warning" style={{ marginTop: '0.25rem' }}>{t('apply.alreadyPending')}</span>}
                        </div>
                      </div>
                    </label>
                  );
                })}
                <button onClick={() => selectedScheme && setStep(2)} disabled={!selectedScheme} className="btn btn-primary mt-1" style={{ width: '100%' }}>{t('apply.continue')} <FiArrowRight /></button>
              </>
            )}
          </div>
        )}

        {/* Step 2: Enter Documents */}
        {step === 2 && (
          <div className="card" style={{ padding: '2rem' }}>
            <h3 style={{ marginBottom: '0.5rem' }}>{t('apply.enterDocs')}</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '1rem' }}>{t('apply.scheme')}: <strong>{selectedSchemeData?.name}</strong></p>
            <div style={{ padding: '0.75rem', background: 'rgba(99,102,241,0.1)', borderRadius: 'var(--radius-sm)', marginBottom: '1.5rem', fontSize: '0.8rem', color: 'var(--accent-primary)' }}>
              ℹ️ {t('apply.noMeta')}
            </div>
            <div className="form-group"><label className="form-label">{t('apply.pan')} *</label><input className="form-input" value={pan} onChange={e => setPan(e.target.value)} placeholder="e.g. ABCDE1000A" required /></div>
            <div className="form-group"><label className="form-label">{t('apply.kisanCard')}</label><input className="form-input" value={kisanCard} onChange={e => setKisanCard(e.target.value)} placeholder="e.g. KCC2024000" /></div>
            <div className="form-group"><label className="form-label">{t('apply.mobile')} *</label><input className="form-input" value={mobile} onChange={e => setMobile(e.target.value)} placeholder="e.g. 7100000000" required /></div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>{t('apply.privacy')}</p>
            <button onClick={verifyDocuments} disabled={loading || !pan || !mobile} className="btn btn-primary" style={{ width: '100%' }}>
              {loading ? t('apply.verifying') : t('apply.verify')}
            </button>
            <button onClick={() => setStep(1)} className="btn btn-secondary mt-1" style={{ width: '100%' }}>{t('apply.back')}</button>
          </div>
        )}

        {/* Step 3: Auto-Approved */}
        {step === 3 && verifiedData && (
          <div className="card" style={{ padding: '2.5rem', textAlign: 'center' }}>
            <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'var(--success-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}><FiCheck size={30} color="var(--success)" /></div>
            <h3 style={{ color: 'var(--success)' }}>{t('apply.autoApproved')}</h3>
            <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>{t('apply.identityVerified')}</p>
            <div style={{ padding: '1rem', background: 'var(--bg-glass)', borderRadius: 'var(--radius-sm)', margin: '1.5rem 0', textAlign: 'left' }}>
              <p><strong>{t('apply.name')}:</strong> {verifiedData.citizenData.name}</p>
              <p><strong>{t('apply.occupation')}:</strong> {verifiedData.citizenData.occupation} {verifiedData.citizenData.isFarmer && '🌾'}</p>
              <p><strong>{t('apply.district')}:</strong> {verifiedData.citizenData.district}, {verifiedData.citizenData.state}</p>
              <p><strong>{t('apply.scheme')}:</strong> {verifiedData.schemeName}</p>
              <p style={{ marginTop: '0.5rem' }}><strong>{t('apply.walletGenerated')}:</strong></p>
              <p className="mono" style={{ fontSize: '0.8rem', color: 'var(--accent-primary)', wordBreak: 'break-all' }}>{verifiedData.walletAddress}</p>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{t('apply.willReceive')}</p>
          </div>
        )}

        {/* Step 4: Auto-rejected */}
        {step === 4 && (
          <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
            <FiAlertTriangle size={40} color="var(--error)" />
            <h3 style={{ margin: '1rem 0 0.5rem', color: 'var(--error)' }}>{t('apply.notEligible')}</h3>
            <p style={{ color: 'var(--text-secondary)' }}>{error}</p>
            <button onClick={() => { setStep(1); setError(''); }} className="btn btn-secondary mt-2">{t('apply.tryAnother')}</button>
          </div>
        )}
      </div>
    </div>
  );
}
