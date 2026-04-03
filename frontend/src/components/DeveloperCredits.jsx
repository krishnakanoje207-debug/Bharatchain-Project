import { useLanguage } from '../i18n/LanguageContext';
import { FiMail, FiLinkedin, FiGithub } from 'react-icons/fi';

const developers = [
  {
    name: 'Krishna Kanoje',
    role: 'Full Stack Developer',
    email: 'krishnakanoje207@gmail.com',
    linkedin: 'www.linkedin.com/in/krishna-kanoje-64455434b',
    github: 'https://github.com/krishnakanoje207-debug',
    avatar: '👨‍💻'
  },
  {
    name: 'Harsh Raj',
    role: 'Blockchain Developer',
    email: 'dev2@example.com',
    linkedin: 'https://linkedin.com/in/dev2',
    github: 'https://github.com/dev2',
    avatar: '🧑‍💻'
  },
  {
    name: 'Chandani Solanki',
    role: 'Frontend Developer',
    email: 'dev3@example.com',
    linkedin: 'https://linkedin.com/in/dev3',
    github: 'https://github.com/dev3',
    avatar: '👩‍💻'
  },
  {
    name: 'Vikash Chaurasia',
    role: 'Blockchain Developer',
    email: 'dev4@example.com',
    linkedin: 'https://linkedin.com/in/dev4',
    github: 'https://github.com/dev4',
    avatar: '👨‍💻'
  }
  ];

  export default function DeveloperCredits() {
  const { t } = useLanguage();

  return (
    <section style={{
        padding:'4rem 1.5rem',
        background: 'linear-gradient(180deg, transparent 0%, rgba(99,102,241,0.06) 50%, transparent 100%)',
    }}>
        <div className="container">
            <h2 style={{ textAlign: 'center', marginBottom: '0.5rem' }}>
                {t('home.developers')}
            </h2>
            <p style={{
          textAlign: 'center',
          color: 'var(--text-secondary)',
          marginBottom: '2.5rem',
          fontSize: '0.95rem'
        }}>
          The team behind BharatChain
        </p>
        <div className="grid-4" style={{ maxWidth: '1000px', margin: '0 auto' }}>
          {developers.map((dev, i) => (
            <div key={i} className="card developer-card" style={{
              textAlign: 'center',
              padding: '2rem 1.5rem',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '4px',
                background: 'var(--accent-gradient)',
              }} />

              <div style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: 'var(--accent-gradient)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.8rem',
                margin: '0 auto 1rem',
                boxShadow: '0 4px 20px var(--accent-glow)',
              }}>
                {dev.avatar}
              </div>

              <h3 style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>{dev.name}</h3>
              <p style={{
                fontSize: '0.8rem',
                color: 'var(--accent-primary)',
                fontWeight: 500,
                marginBottom: '1rem'
              }}>{dev.role}</p>

              <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem' }}>
                <a href={`mailto:${dev.email}`} title="Email"
                  style={{ color: 'var(--text-muted)', transition: 'color 0.2s' }}
                  onMouseEnter={e => e.target.style.color = 'var(--accent-primary)'}
                  onMouseLeave={e => e.target.style.color = 'var(--text-muted)'}
                >
                  <FiMail size={18} />
                </a>
                <a href={dev.linkedin} target="_blank" rel="noreferrer" title="LinkedIn"
                  style={{ color: 'var(--text-muted)', transition: 'color 0.2s' }}
                  onMouseEnter={e => e.target.style.color = '#0077b5'}
                  onMouseLeave={e => e.target.style.color = 'var(--text-muted)'}
                >
                  <FiLinkedin size={18} />
                </a>
                <a href={dev.github} target="_blank" rel="noreferrer" title="GitHub"
                  style={{ color: 'var(--text-muted)', transition: 'color 0.2s' }}
                  onMouseEnter={e => e.target.style.color = 'var(--text-primary)'}
                  onMouseLeave={e => e.target.style.color = 'var(--text-muted)'}
                >
                  <FiGithub size={18} />
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}





