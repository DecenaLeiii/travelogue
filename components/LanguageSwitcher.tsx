import { useTranslation, LANG_GROUPS, type Lang } from '../lib/i18n';

export default function LanguageSwitcher({ className }: { className?: string }) {
  const { lang, setLang } = useTranslation();

  return (
    <select
      value={lang}
      onChange={(e) => setLang(e.target.value as Lang)}
      className={className}
      aria-label="Language selector"
    >
      {LANG_GROUPS.map((group) => (
        <optgroup key={group.label} label={group.label}>
          {group.langs.map((l) => (
            <option key={l.code} value={l.code}>
              {l.label}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}
