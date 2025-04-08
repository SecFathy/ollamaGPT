import { useQuery } from "@tanstack/react-query";

interface AppInfo {
  appName: string;
}

export function useAppInfo() {
  const { data, isLoading, error } = useQuery<AppInfo>({
    queryKey: ['/api/app-info'],
    queryFn: async () => {
      const res = await fetch('/api/app-info');
      if (!res.ok) throw new Error("Failed to fetch app info");
      return res.json();
    },
    staleTime: 1000 * 60 * 60, // Cache for 1 hour
    gcTime: 1000 * 60 * 60 * 24, // Keep in cache for 24 hours (renamed from cacheTime in v5)
  });

  return {
    appName: data ? data.appName : "DeepSeek Coder", // Fallback to default
    isLoading,
    error
  };
}