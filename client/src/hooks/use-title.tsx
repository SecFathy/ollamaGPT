import { useEffect } from 'react';
import { useAppInfo } from './use-app-info';

export function useTitle(title?: string) {
  const { appName, isLoading } = useAppInfo();
  
  useEffect(() => {
    if (isLoading) return;
    
    const prevTitle = document.title;
    
    if (title) {
      document.title = `${title} | ${appName}`;
    } else {
      document.title = `${appName} Chat`;
    }
    
    return () => {
      document.title = prevTitle;
    };
  }, [title, appName, isLoading]);
}
