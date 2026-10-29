import { useEffect, useState } from 'react';
import { DEFAULT_SITE_BRANDING } from './siteBranding';

export function useSiteLogo() {
  const [logo, setLogo] = useState(DEFAULT_SITE_BRANDING.logo);

  useEffect(() => {
    let active = true;
    fetch('/api/site-branding')
      .then((response) => response.ok ? response.json() : null)
      .then((branding) => {
        if (active && typeof branding?.logo === 'string' && branding.logo) setLogo(branding.logo);
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  return logo;
}
