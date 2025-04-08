import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { 
  Users, 
  MessageSquare, 
  Shield, 
  Lock, 
  Unlock, 
  Trash2, 
  Plus, 
  AlertTriangle,
  BarChart3,
  Cpu,
  Database,
  Activity,
  ArrowUpDown,
  RefreshCw
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface AdminPanelProps {
  onClose?: () => void;
  standalone?: boolean;
}

export function AdminPanel({ onClose, standalone = false }: AdminPanelProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("users");
  
  return (
    <Card className={`w-full ${standalone ? "" : "max-w-4xl mx-auto"}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            <CardTitle>Admin Control Center</CardTitle>
          </div>
          {!standalone && onClose && (
            <Button variant="outline" onClick={onClose}>Close</Button>
          )}
        </div>
        <CardDescription>
          Manage users, models, registration settings, and content filters
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="users" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5 mb-4">
            <TabsTrigger value="users">
              <Users className="h-4 w-4 mr-2" />
              Users
            </TabsTrigger>
            <TabsTrigger value="registration">
              <Lock className="h-4 w-4 mr-2" />
              Registration
            </TabsTrigger>
            <TabsTrigger value="blockedKeywords">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Content Filters
            </TabsTrigger>
            <TabsTrigger value="models">
              <MessageSquare className="h-4 w-4 mr-2" />
              Models
            </TabsTrigger>
            <TabsTrigger value="system">
              <Shield className="h-4 w-4 mr-2" />
              System
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="users" className="border rounded-md p-4">
            <UsersTab />
          </TabsContent>
          
          <TabsContent value="blockedKeywords" className="border rounded-md p-4">
            <BlockedKeywordsTab />
          </TabsContent>
          
          <TabsContent value="registration" className="border rounded-md p-4">
            <RegistrationTab />
          </TabsContent>
          
          <TabsContent value="models" className="border rounded-md p-4">
            <ModelsTab />
          </TabsContent>
          
          <TabsContent value="system" className="border rounded-md p-4">
            <SystemTab />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

// Users Tab Component
function UsersTab() {
  const { toast } = useToast();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Fetch all users
  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      try {
        const response = await apiRequest('GET', '/api/admin/users');
        const data = await response.json();
        setUsers(data);
      } catch (error) {
        console.error('Error fetching users:', error);
        toast({
          title: "Failed to load users",
          description: "Could not retrieve user data.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchUsers();
  }, [toast]);
  
  // Toggle user active status
  const toggleUserActive = async (userId: number, currentStatus: boolean) => {
    try {
      const response = await apiRequest('PUT', `/api/admin/users/${userId}`, {
        isActive: !currentStatus
      });
      
      if (response.ok) {
        const updatedUser = await response.json();
        setUsers(users.map(user => user.id === userId ? updatedUser : user));
        toast({
          title: "User updated",
          description: `User ${updatedUser.username} is now ${updatedUser.isActive ? 'active' : 'inactive'}.`
        });
      }
    } catch (error) {
      console.error('Error updating user:', error);
      toast({
        title: "Update failed",
        description: "Could not update user status.",
        variant: "destructive"
      });
    }
  };
  
  // Toggle admin status
  const toggleAdminStatus = async (userId: number, currentStatus: boolean) => {
    try {
      const response = await apiRequest('PUT', `/api/admin/users/${userId}`, {
        isAdmin: !currentStatus
      });
      
      if (response.ok) {
        const updatedUser = await response.json();
        setUsers(users.map(user => user.id === userId ? updatedUser : user));
        toast({
          title: "User updated",
          description: `${updatedUser.username} admin status: ${updatedUser.isAdmin ? 'Granted' : 'Revoked'}.`
        });
      }
    } catch (error) {
      console.error('Error updating user:', error);
      toast({
        title: "Update failed",
        description: "Could not update admin status.",
        variant: "destructive"
      });
    }
  };
  
  // Update user quota
  const updateUserQuota = async (userId: number, quota: number) => {
    try {
      const response = await apiRequest('PUT', `/api/admin/users/${userId}`, {
        quota
      });
      
      if (response.ok) {
        const updatedUser = await response.json();
        setUsers(users.map(user => user.id === userId ? updatedUser : user));
        toast({
          title: "Quota updated",
          description: `${updatedUser.username}'s quota set to ${updatedUser.quota}.`
        });
      }
    } catch (error) {
      console.error('Error updating quota:', error);
      toast({
        title: "Update failed",
        description: "Could not update user quota.",
        variant: "destructive"
      });
    }
  };
  
  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Manage Users</h3>
      
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 px-2">Username</th>
              <th className="text-center py-2 px-2">Status</th>
              <th className="text-center py-2 px-2">Admin</th>
              <th className="text-center py-2 px-2">Usage</th>
              <th className="text-right py-2 px-2">Quota</th>
              <th className="text-right py-2 px-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.length > 0 ? (
              users.map(user => (
                <tr key={user.id} className="border-b hover:bg-muted/50">
                  <td className="py-2 px-2">
                    {user.username}
                  </td>
                  <td className="py-2 px-2 text-center">
                    <div className="flex items-center justify-center">
                      <Switch 
                        checked={user.isActive}
                        onCheckedChange={() => toggleUserActive(user.id, user.isActive)}
                      />
                    </div>
                  </td>
                  <td className="py-2 px-2 text-center">
                    <div className="flex items-center justify-center">
                      <Switch 
                        checked={user.isAdmin}
                        onCheckedChange={() => toggleAdminStatus(user.id, user.isAdmin)}
                      />
                    </div>
                  </td>
                  <td className="py-2 px-2 text-center">
                    {user.usageCount}/{user.quota}
                  </td>
                  <td className="py-2 px-2 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <Input 
                        type="number"
                        className="w-20 text-right"
                        defaultValue={user.quota}
                        min={0}
                        max={10000}
                        onBlur={(e) => {
                          const newQuota = parseInt(e.target.value);
                          if (!isNaN(newQuota) && newQuota !== user.quota) {
                            updateUserQuota(user.id, newQuota);
                          }
                        }}
                      />
                    </div>
                  </td>
                  <td className="py-2 px-2 text-right">
                    <Button 
                      variant={user.isActive ? "destructive" : "default"}
                      size="sm"
                      onClick={() => toggleUserActive(user.id, user.isActive)}
                    >
                      {user.isActive ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                    </Button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="py-4 text-center text-muted-foreground">
                  No users found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Blocked Keywords Tab Component
function BlockedKeywordsTab() {
  const { toast } = useToast();
  const [keywords, setKeywords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newKeyword, setNewKeyword] = useState("");
  
  // Fetch blocked keywords
  useEffect(() => {
    const fetchKeywords = async () => {
      setLoading(true);
      try {
        const response = await apiRequest('GET', '/api/admin/blocked-keywords');
        const data = await response.json();
        setKeywords(data);
      } catch (error) {
        console.error('Error fetching blocked keywords:', error);
        toast({
          title: "Failed to load keywords",
          description: "Could not retrieve blocked keywords.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchKeywords();
  }, [toast]);
  
  // Add new keyword
  const addKeyword = async () => {
    if (!newKeyword.trim()) return;
    
    try {
      const response = await apiRequest('POST', '/api/admin/blocked-keywords', {
        keyword: newKeyword.trim()
      });
      
      if (response.ok) {
        const addedKeyword = await response.json();
        setKeywords([...keywords, addedKeyword]);
        setNewKeyword("");
        toast({
          title: "Keyword added",
          description: `"${addedKeyword.keyword}" has been blocked.`
        });
      }
    } catch (error) {
      console.error('Error adding keyword:', error);
      toast({
        title: "Failed to add keyword",
        description: "Could not add the blocked keyword.",
        variant: "destructive"
      });
    }
  };
  
  // Delete keyword
  const deleteKeyword = async (keywordId: number) => {
    try {
      const response = await apiRequest('DELETE', `/api/admin/blocked-keywords/${keywordId}`);
      
      if (response.ok) {
        setKeywords(keywords.filter(k => k.id !== keywordId));
        toast({
          title: "Keyword removed",
          description: "The blocked keyword has been removed."
        });
      }
    } catch (error) {
      console.error('Error deleting keyword:', error);
      toast({
        title: "Failed to remove keyword",
        description: "Could not remove the blocked keyword.",
        variant: "destructive"
      });
    }
  };
  
  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Content Filters</h3>
      <p className="text-sm text-muted-foreground">
        Add keywords or phrases that will be blocked in user messages. Any message containing these words will be rejected.
      </p>
      
      <div className="flex space-x-2 mb-4">
        <Input
          placeholder="Add a new blocked keyword or phrase"
          value={newKeyword}
          onChange={(e) => setNewKeyword(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              addKeyword();
            }
          }}
        />
        <Button onClick={addKeyword}>
          <Plus className="h-4 w-4 mr-2" />
          Add
        </Button>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
        {keywords.length > 0 ? (
          keywords.map(keyword => (
            <div key={keyword.id} className="flex items-center justify-between bg-muted/30 rounded-md p-2">
              <span className="font-medium truncate">{keyword.keyword}</span>
              <Button variant="ghost" size="icon" onClick={() => deleteKeyword(keyword.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))
        ) : (
          <div className="col-span-full py-4 text-center text-muted-foreground">
            No blocked keywords found. Add some to start filtering content.
          </div>
        )}
      </div>
    </div>
  );
}

// Registration Settings Tab
function RegistrationTab() {
  const { toast } = useToast();
  const [registrationEnabled, setRegistrationEnabled] = useState(true);
  const [defaultQuota, setDefaultQuota] = useState(100);
  const [loading, setLoading] = useState(true);
  
  // Fetch registration settings
  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true);
      try {
        // Mock implementation - in real app would fetch from API
        setRegistrationEnabled(true);
        setDefaultQuota(100);
        
        setTimeout(() => {
          setLoading(false);
        }, 500);
      } catch (error) {
        console.error('Error fetching registration settings:', error);
        toast({
          title: "Failed to load settings",
          description: "Could not retrieve registration settings.",
          variant: "destructive"
        });
        setLoading(false);
      }
    };
    
    fetchSettings();
  }, [toast]);
  
  // Toggle registration
  const toggleRegistration = async () => {
    try {
      // Mock implementation - in real app would save to API
      setRegistrationEnabled(!registrationEnabled);
      
      toast({
        title: "Registration settings updated",
        description: `User registration is now ${!registrationEnabled ? 'enabled' : 'disabled'}.`
      });
    } catch (error) {
      console.error('Error updating registration settings:', error);
      toast({
        title: "Update failed",
        description: "Could not update registration settings.",
        variant: "destructive"
      });
    }
  };
  
  // Update default quota
  const updateDefaultQuota = async (quota: number) => {
    try {
      // Mock implementation - in real app would save to API
      setDefaultQuota(quota);
      
      toast({
        title: "Default quota updated",
        description: `New users will receive a quota of ${quota}.`
      });
    } catch (error) {
      console.error('Error updating default quota:', error);
      toast({
        title: "Update failed",
        description: "Could not update default quota.",
        variant: "destructive"
      });
    }
  };
  
  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Registration Control</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Control who can register and default user settings for new accounts.
        </p>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-md">
            <div>
              <h4 className="font-medium">User Registration</h4>
              <p className="text-sm text-muted-foreground">Allow new users to register</p>
            </div>
            <Switch
              checked={registrationEnabled}
              onCheckedChange={toggleRegistration}
            />
          </div>
          
          <div className="p-4 border rounded-md">
            <h4 className="font-medium mb-2">Default User Quota</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Set the default API request quota for new users
            </p>
            
            <div className="flex items-center space-x-4">
              <Input
                type="number"
                min={0}
                max={10000}
                value={defaultQuota}
                onChange={(e) => setDefaultQuota(parseInt(e.target.value) || 0)}
                className="w-24"
              />
              <Button 
                onClick={() => updateDefaultQuota(defaultQuota)}
                size="sm"
              >
                Save
              </Button>
            </div>
          </div>
          
          <div className="p-4 border rounded-md bg-muted/30">
            <h4 className="font-medium mb-2">Domain Restrictions</h4>
            <p className="text-sm text-muted-foreground">
              Limit registration to specific email domains (coming soon)
            </p>
            
            <Button variant="outline" disabled className="mt-2">
              <Lock className="h-4 w-4 mr-2" />
              Configure Domains
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Models Tab Component (placeholder for future implementation)
function ModelsTab() {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Model Management</h3>
      <p className="text-sm text-muted-foreground">
        Configure LLM models and their endpoints for your chat assistant.
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Current Model</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-medium">deepseek-coder-v2</div>
            <div className="text-sm text-muted-foreground mt-1">
              API Endpoint: http://13.40.186.0:11434/api/generate
            </div>
            <div className="flex mt-4">
              <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Active</Badge>
              <Badge className="ml-2 bg-blue-100 text-blue-800 hover:bg-blue-100">Default</Badge>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-muted/20 border-dashed">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Add New Model</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center py-6">
            <Button variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Add Model
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// System Monitoring Tab
function SystemTab() {
  const [systemStats, setSystemStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalRequests: 0,
    averageResponseTime: 0,
    uptime: 0
  });
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchSystemStats = async () => {
      setLoading(true);
      try {
        // Mock data - in a real app, this would come from an API
        setSystemStats({
          totalUsers: 12,
          activeUsers: 8,
          totalRequests: 1543,
          averageResponseTime: 1.2,
          uptime: 98.7
        });
        
        setTimeout(() => {
          setLoading(false);
        }, 700);
      } catch (error) {
        console.error('Error fetching system stats:', error);
        setLoading(false);
      }
    };
    
    fetchSystemStats();
  }, []);
  
  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">System Monitoring</h3>
        <p className="text-sm text-muted-foreground">
          Monitor system performance, usage stats, and status
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemStats.totalUsers}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {systemStats.activeUsers} active users
            </div>
            <Progress value={(systemStats.activeUsers / systemStats.totalUsers) * 100} className="h-1 mt-2" />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">API Requests</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemStats.totalRequests}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {systemStats.averageResponseTime}s average response time
            </div>
            <div className="h-1 mt-2 bg-muted overflow-hidden rounded-full">
              <div 
                className="h-full bg-primary"
                style={{ width: `${Math.min(100, systemStats.averageResponseTime * 30)}%` }}
              />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">System Status</CardTitle>
              <Cpu className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemStats.uptime}%</div>
            <div className="text-xs text-muted-foreground mt-1">
              Uptime in last 30 days
            </div>
            <Progress value={systemStats.uptime} className="h-1 mt-2" />
          </CardContent>
        </Card>
      </div>
      
      <div className="flex justify-end">
        <Button variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh Stats
        </Button>
      </div>
    </div>
  );
}