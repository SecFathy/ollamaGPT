import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { useAppInfo } from "@/hooks/use-app-info";
import { useTitle } from "@/hooks/use-title";

export default function NotFound() {
  const { appName } = useAppInfo();
  
  // Set the page title
  useTitle("Page Not Found");
  
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-2 items-center">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <h1 className="text-2xl font-bold">404 Page Not Found</h1>
          </div>

          <p className="mt-4 text-sm text-muted-foreground">
            The page you're looking for doesn't exist or has been moved.
          </p>
          
          <p className="mt-2 text-sm">
            <a href="/" className="text-primary hover:underline">
              Return to {appName} home page
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
