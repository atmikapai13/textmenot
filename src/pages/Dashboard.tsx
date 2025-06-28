import React from 'react';
import DashboardDesktop from './DashboardDesktop';
import DashboardMobile from './DashboardMobile';

function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(window.innerWidth <= 950);
  React.useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 950);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return isMobile;
}

export default function Dashboard(props: any) {
  const isMobile = useIsMobile();
  return isMobile ? <DashboardMobile {...props} /> : <DashboardDesktop {...props} />;
}