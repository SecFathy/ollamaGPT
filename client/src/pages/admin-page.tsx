import { useEffect } from 'react';
import { useAuth } from "@/hooks/use-auth";
import { AdminPanel } from "@/components/admin/admin-panel";
import { Redirect } from "wouter";
import { Loader2 } from "lucide-react";

export default function AdminPage() {
  const { user, isLoading } = useAuth();
  
  // Redirect to login if not authenticated
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  // Check if user is logged in and has admin privileges
  if (!user) {
    return <Redirect to="/auth" />;
  }
  
  // Check if user is an admin
  if (!user.isAdmin) {
    return <Redirect to="/" />;
  }
  
  return (
    <div className="container mx-auto py-8 px-4">
      <AdminPanel standalone={true} />
    </div>
  );
}