import { useLanguage } from '../i18n/LanguageContext';

export default function LanguageToggle() {
  const { language, toggleLanguage } = useLanguage();

  return (
    <button
      onClick={toggleLanguage}
      className="btn btn-sm btn-secondary"
      style={{
        fontSize: '0.75rem',
        fontWeight: 700,
        padding: '0.4rem 0.7rem',
        letterSpacing: '0.02em',
        minWidth: '36px'
      }}
      title={language === 'en' ? 'हिंदी में बदलें' : 'Switch to English'}
    >
      {language === 'en' ? 'हि' : 'EN'}
    </button>
  );
}
