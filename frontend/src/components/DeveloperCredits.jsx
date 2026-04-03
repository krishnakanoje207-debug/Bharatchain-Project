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
        
        </div>
  )


