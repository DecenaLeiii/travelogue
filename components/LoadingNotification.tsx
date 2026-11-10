import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

type NotificationState = {
  show: boolean;
  message: string;
  isArrival: boolean;
};

export default function LoadingNotification() {
  const router = useRouter();
  const [state, setState] = useState<NotificationState>({ show: false, message: 'Travelling...', isArrival: false });
  const [destinations, setDestinations] = useState<Record<string, string>>({});

  // Fetch destinations to map slugs to names
  useEffect(() => {
    const fetchDestinations = async () => {
      try {
        const response = await fetch('/api/destinations');
        const data = await response.json();
        if (Array.isArray(data)) {
          const map: Record<string, string> = {};
          data.forEach((dest: any) => {
            if (dest.slug && dest.name) {
              map[dest.slug] = dest.name;
            }
          });
          setDestinations(map);
        }
      } catch (error) {
        console.error('Failed to fetch destinations:', error);
      }
    };
    fetchDestinations();
  }, []);

  useEffect(() => {
    const handleStart = () => {
      setState({ show: true, message: 'Travelling...', isArrival: false });
    };

    const handleStop = () => {
      // Check if the new route is a destination page
      const match = router.pathname.match(/^\/destination\/\[slug\]$/);
      if (match && router.query.slug) {
        const slug = router.query.slug as string;
        const destName = destinations[slug];
        
        if (destName) {
          // Show arrival message
          setState({ show: true, message: `You have arrived in ${destName}`, isArrival: true });
          
          // Auto-hide after 2.5 seconds
          const timer = setTimeout(() => {
            setState({ show: false, message: '', isArrival: false });
          }, 2500);
          
          return () => clearTimeout(timer);
        }
      }
      
      // Otherwise just hide the notification
      setState({ show: false, message: '', isArrival: false });
    };

    router.events.on('routeChangeStart', handleStart);
    router.events.on('routeChangeComplete', handleStop);
    router.events.on('routeChangeError', handleStop);

    return () => {
      router.events.off('routeChangeStart', handleStart);
      router.events.off('routeChangeComplete', handleStop);
      router.events.off('routeChangeError', handleStop);
    };
  }, [router, destinations]);

  if (!state.show) return null;

  return (
    <div className={`loading-notification ${state.isArrival ? 'arrival' : ''}`}>
      {!state.isArrival && (
        <div className="loading-spinner">
          <div className="spinner-dot"></div>
          <div className="spinner-dot"></div>
          <div className="spinner-dot"></div>
        </div>
      )}
      {state.isArrival && (
        <div className="arrival-icon">✈️</div>
      )}
      <span className="loading-text">{state.message}</span>
    </div>
  );
}
