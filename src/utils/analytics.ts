// Google Analytics Configuration
declare global {
  interface Window {
    gtag: (...args: any[]) => void;
  }
}

// Replace 'G-XXXXXXXXXX' with your actual Google Analytics Measurement ID
export const GA_TRACKING_ID = 'G-RHQ3WC5D26';

// Initialize Google Analytics
export const initGA = () => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('config', GA_TRACKING_ID, {
      page_title: document.title,
      page_location: window.location.href,
    });
  }
};

// Track page views
export const trackPageView = (url: string) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('config', GA_TRACKING_ID, {
      page_path: url,
    });
  }
};

// Track custom events
export const trackEvent = (action: string, category: string, label?: string, value?: number) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', action, {
      event_category: category,
      event_label: label,
      value: value,
    });
  }
};

// Specific event tracking functions for your app
export const trackShare = (method: string) => {
  trackEvent('share', 'engagement', method);
};

export const trackDownload = () => {
  trackEvent('download', 'engagement', 'dashboard_image');
};

export const trackRestart = () => {
  trackEvent('restart', 'engagement', 'dashboard');
};

export const trackCopyUrl = () => {
  trackEvent('copy_url', 'engagement', 'dashboard');
};

export const trackFileUpload = (fileType: string) => {
  trackEvent('file_upload', 'engagement', fileType);
};

export const trackAnalysisComplete = () => {
  trackEvent('analysis_complete', 'conversion', 'dashboard_generated');
}; 