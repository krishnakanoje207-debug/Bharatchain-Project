import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../i18n/LanguageContext';
import DeveloperCredits from '../components/DeveloperCredits';
import { FiUsers, FiShoppingBag, FiShield, FiArrowRight, FiCheckCircle, FiLock, FiZap } from 'react-icons/fi';

export default function Home() {
  const { user } = useAuth();
  const { t } = useLanguage();

  return (
    <div className="page fade-in">
      <section style={{ textAlign: 'center', padding: '5rem 1.5rem 4rem', background: 'radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.15) 0%, transparent 60%)' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 1rem', background: 'var(--success-bg)', borderRadius: '50px', fontSize: '0.8rem', color: 'var(--success)', marginBottom: '1.5rem' }}>
          <FiCheckCircle size={14} /> {t('home.badge')}
        </div>
        <h1 style={{ fontSize: '3.2rem', maxWidth: '800px', margin: '0 auto 1rem', lineHeight: 1.15 }}>
          {t('home.title1')} <span className="gradient-text">{t('home.title2')}</span>
        </h1>
        <p style={{ fontSize: '1.15rem', color: 'var(--text-secondary)', maxWidth: '600px', margin: '0 auto 2.5rem' }}>
          {t('home.subtitle')}
        </p>
        {!user ? (
          <div className="flex-center gap-2" style={{ flexWrap: 'wrap' }}>
            <Link to="/signup" className="btn btn-primary btn-lg"><FiArrowRight /> {t('home.signupNow')}</Link>
            <Link to="/schemes" className="btn btn-secondary btn-lg">{t('home.viewSchemes')}</Link>
          </div>
        ) : (
          <Link to={`/${user.role}`} className="btn btn-primary btn-lg">{t('home.goToDashboard')} <FiArrowRight /></Link>
        )}
      </section>

      <section className="container" style={{ padding: '3rem 1.5rem' }}>
        <div className="grid-3" style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
            <FiLock size={32} color="var(--accent-primary)" />
            <h3 style={{ margin: '1rem 0 0.5rem' }}>{t('home.zkProof')}</h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{t('home.zkDesc')}</p>
          </div>
          <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
            <FiZap size={32} color="var(--warning)" />
            <h3 style={{ margin: '1rem 0 0.5rem' }}>{t('home.autoDist')}</h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{t('home.autoDistDesc')}</p>
          </div>
          <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
            <FiShield size={32} color="var(--success)" />
            <h3 style={{ margin: '1rem 0 0.5rem' }}>{t('home.tokenRevoke')}</h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{t('home.tokenRevokeDesc')}</p>
          </div>
        </div>
      </section>

      {!user && (
        <section className="container" style={{ padding: '2rem 1.5rem 3rem' }}>
          <h2 style={{ textAlign: 'center', marginBottom: '2rem' }}>{t('home.getStarted')}</h2>
          <div className="grid-2" style={{ maxWidth: '700px', margin: '0 auto' }}>
            <Link to="/signup?role=citizen" className="card" style={{ textAlign: 'center', padding: '2.5rem', textDecoration: 'none', border: '2px solid transparent' }}>
              <FiUsers size={40} color="var(--accent-primary)" />
              <h3 style={{ margin: '1rem 0 0.5rem', color: 'var(--text-primary)' }}>{t('home.signupCitizen')}</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{t('home.citizenDesc')}</p>
              <span className="btn btn-primary btn-sm" style={{ marginTop: '1rem' }}>{t('home.registerPhone')} <FiArrowRight /></span>
            </Link>
            <Link to="/signup?role=vendor" className="card" style={{ textAlign: 'center', padding: '2.5rem', textDecoration: 'none', border: '2px solid transparent' }}>
              <FiShoppingBag size={40} color="var(--success)" />
              <h3 style={{ margin: '1rem 0 0.5rem', color: 'var(--text-primary)' }}>{t('home.signupVendor')}</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{t('home.vendorDesc')}</p>
              <span className="btn btn-success btn-sm" style={{ marginTop: '1rem' }}>{t('home.registerPhone')} <FiArrowRight /></span>
            </Link>
          </div>
        </section>
      )}

      <DeveloperCredits />

      <footer style={{ borderTop: '1px solid var(--border)', padding: '2rem 1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
        <p>{t('home.footer')}</p>
      </footer>
    </div>
  );
}
