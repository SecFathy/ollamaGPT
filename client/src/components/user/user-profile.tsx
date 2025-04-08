import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { LogOut, User, Shield } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";

interface UserProfileProps {
  onClose: () => void;
}

export function UserProfile({ onClose }: UserProfileProps) {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Fetch detailed profile data
  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      try {
        const response = await apiRequest('GET', '/api/user/profile');
        const data = await response.json();
        setProfile(data);
      } catch (error) {
        console.error('Error fetching profile:', error);
        toast({
          title: "Failed to load profile",
          description: "Could not retrieve your profile information.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [toast]);

  // Handle logout
  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        toast({
          title: "Logged out",
          description: "You have been successfully logged out."
        });
      },
      onError: (error) => {
        toast({
          title: "Logout failed",
          description: error.message,
          variant: "destructive"
        });
      }
    });
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="h-6 w-6 text-primary" />
            <CardTitle>User Profile</CardTitle>
          </div>
          <div className="flex gap-2">
            {profile?.isAdmin && (
              <Badge variant="outline" className="bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-300 border-amber-300">
                <Shield className="h-3 w-3 mr-1" />
                Admin
              </Badge>
            )}
            <Badge variant={profile?.isActive ? "outline" : "destructive"}>
              {profile?.isActive ? 'Active' : 'Inactive'}
            </Badge>
          </div>
        </div>
        <CardDescription>
          Your account information and usage statistics
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex justify-center py-4">
            <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full"></div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-1 text-sm font-medium">Username</div>
              <div className="col-span-2 text-sm">{profile?.username}</div>
              
              <div className="col-span-1 text-sm font-medium">Account Created</div>
              <div className="col-span-2 text-sm">{formatDate(profile?.createdAt)}</div>
              
              <div className="col-span-1 text-sm font-medium">Last Login</div>
              <div className="col-span-2 text-sm">{formatDate(profile?.lastLogin)}</div>
            </div>

            <div className="pt-4">
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium">API Usage Quota</span>
                <span className="text-sm">{profile?.usageCount} / {profile?.quota}</span>
              </div>
              <Progress value={profile?.usagePercentage || 0} className="h-2" />
            </div>
          </>
        )}
      </CardContent>

      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={onClose}>Close</Button>
        <Button variant="destructive" size="sm" onClick={handleLogout}>
          <LogOut className="h-4 w-4 mr-2" />
          Logout
        </Button>
      </CardFooter>
    </Card>
  );
}