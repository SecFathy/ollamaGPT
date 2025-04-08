import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Plus, 
  MessageSquare, 
  Trash2, 
  Moon, 
  Sun, 
  Menu,
  LogOut,
  User,
  Shield,
  Settings
} from 'lucide-react';
import { Conversation } from '@/lib/types';
import { cn, formatTimestamp, truncateString } from '@/lib/utils';
import { useAppInfo } from '@/hooks/use-app-info';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { UserProfile } from '@/components/user/user-profile';
import { AdminPanel } from '@/components/admin/admin-panel';
import { useAuth } from '@/hooks/use-auth';

interface SidebarProps {
  conversations: Conversation[];
  currentConversationId?: string;
  onNewChat: () => void;
  onSelectConversation: (conversationId: string) => void;
  onClearConversations: () => void;
  onToggleTheme: () => void;
  onLogout: () => void;
  isDarkMode: boolean;
  isMobileOpen: boolean;
  onMobileClose: () => void;
}

export function Sidebar({
  conversations,
  currentConversationId,
  onNewChat,
  onSelectConversation,
  onClearConversations,
  onToggleTheme,
  onLogout,
  isDarkMode,
  isMobileOpen,
  onMobileClose
}: SidebarProps) {
  const { appName } = useAppInfo();
  const { user } = useAuth();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  
  // Group conversations by date
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const todayConversations = conversations.filter(conv => {
    const convDate = new Date(conv.createdAt);
    return convDate.toDateString() === today.toDateString();
  });
  
  const yesterdayConversations = conversations.filter(conv => {
    const convDate = new Date(conv.createdAt);
    return convDate.toDateString() === yesterday.toDateString();
  });
  
  const olderConversations = conversations.filter(conv => {
    const convDate = new Date(conv.createdAt);
    return convDate < yesterday && convDate.toDateString() !== yesterday.toDateString();
  });

  return (
    <>
      {/* Mobile overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 md:hidden"
          onClick={onMobileClose}
        ></div>
      )}
      
      {/* User Profile Dialog */}
      <Dialog open={isProfileOpen} onOpenChange={setIsProfileOpen}>
        <DialogContent className="max-w-md">
          <UserProfile onClose={() => setIsProfileOpen(false)} />
        </DialogContent>
      </Dialog>
      
      {/* Admin Panel Dialog */}
      <Dialog open={isAdminPanelOpen} onOpenChange={setIsAdminPanelOpen}>
        <DialogContent className="max-w-4xl">
          <AdminPanel onClose={() => setIsAdminPanelOpen(false)} />
        </DialogContent>
      </Dialog>
      
      {/* Sidebar */}
      <aside
        className={cn(
          "bg-sidebar text-sidebar-foreground flex flex-col h-full transition-all duration-300",
          isMobileOpen
            ? "fixed inset-y-0 left-0 z-50 w-3/4 max-w-xs" 
            : "hidden md:flex w-64"
        )}
      >
        <div className="p-3 border-b border-sidebar-border">
          <h1 className="text-lg font-semibold text-center">{appName}</h1>
        </div>
        <div className="p-4">
          <Button
            variant="outline"
            className="w-full justify-start gap-2 border-sidebar-border bg-transparent hover:bg-sidebar-accent text-sidebar-foreground"
            onClick={onNewChat}
          >
            <Plus className="h-5 w-5" />
            New chat
          </Button>
        </div>
        
        <ScrollArea className="flex-1 px-2">
          {todayConversations.length > 0 && (
            <div className="mb-4">
              <h2 className="text-xs text-sidebar-foreground/50 font-medium mb-1 px-2">Today</h2>
              {todayConversations.map(conversation => (
                <Button
                  key={conversation.id}
                  variant="ghost"
                  className={cn(
                    "w-full justify-start text-left py-2 px-3 mb-1 hover:bg-sidebar-accent",
                    currentConversationId === conversation.id && "bg-sidebar-accent"
                  )}
                  onClick={() => onSelectConversation(conversation.id)}
                >
                  <MessageSquare className="h-4 w-4 mr-2 shrink-0" />
                  <span className="truncate">{truncateString(conversation.title, 26)}</span>
                </Button>
              ))}
            </div>
          )}
          
          {yesterdayConversations.length > 0 && (
            <div className="mb-4">
              <h2 className="text-xs text-sidebar-foreground/50 font-medium mb-1 px-2">Yesterday</h2>
              {yesterdayConversations.map(conversation => (
                <Button
                  key={conversation.id}
                  variant="ghost"
                  className={cn(
                    "w-full justify-start text-left py-2 px-3 mb-1 hover:bg-sidebar-accent",
                    currentConversationId === conversation.id && "bg-sidebar-accent"
                  )}
                  onClick={() => onSelectConversation(conversation.id)}
                >
                  <MessageSquare className="h-4 w-4 mr-2 shrink-0" />
                  <span className="truncate">{truncateString(conversation.title, 26)}</span>
                </Button>
              ))}
            </div>
          )}
          
          {olderConversations.length > 0 && (
            <div className="mb-4">
              <h2 className="text-xs text-sidebar-foreground/50 font-medium mb-1 px-2">Older</h2>
              {olderConversations.map(conversation => (
                <Button
                  key={conversation.id}
                  variant="ghost"
                  className={cn(
                    "w-full justify-start text-left py-2 px-3 mb-1 hover:bg-sidebar-accent",
                    currentConversationId === conversation.id && "bg-sidebar-accent"
                  )}
                  onClick={() => onSelectConversation(conversation.id)}
                >
                  <MessageSquare className="h-4 w-4 mr-2 shrink-0" />
                  <span className="truncate">{truncateString(conversation.title, 26)}</span>
                </Button>
              ))}
            </div>
          )}
        </ScrollArea>
        
        <div className="mt-auto p-4 border-t border-sidebar-border">
          <Button
            variant="ghost"
            className="w-full justify-start text-sm hover:bg-sidebar-accent mb-1"
            onClick={() => setIsProfileOpen(true)}
          >
            <User className="h-4 w-4 mr-2" />
            My Profile
          </Button>
          
          {user?.isAdmin && (
            <>
              <Button
                variant="ghost"
                className="w-full justify-start text-sm hover:bg-sidebar-accent mb-1"
                onClick={() => setIsAdminPanelOpen(true)}
              >
                <Shield className="h-4 w-4 mr-2" />
                Admin Panel
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start text-sm hover:bg-sidebar-accent mb-1"
                asChild
              >
                <a href="/admin">
                  <Shield className="h-4 w-4 mr-2" />
                  Admin Dashboard
                </a>
              </Button>
            </>
          )}
          
          <Button
            variant="ghost"
            className="w-full justify-start text-sm hover:bg-sidebar-accent mb-1"
            onClick={onClearConversations}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clear conversations
          </Button>
          
          <Button
            variant="ghost"
            className="w-full justify-start text-sm hover:bg-sidebar-accent mb-1"
            onClick={onToggleTheme}
          >
            {isDarkMode ? (
              <>
                <Sun className="h-4 w-4 mr-2" />
                Light mode
              </>
            ) : (
              <>
                <Moon className="h-4 w-4 mr-2" />
                Dark mode
              </>
            )}
          </Button>
          
          <Separator className="my-2" />
          
          <Button
            variant="ghost"
            className="w-full justify-start text-sm hover:bg-sidebar-accent text-red-500 hover:text-red-600"
            onClick={onLogout}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </aside>
    </>
  );
}

export function MobileNav({ onOpenSidebar }: { onOpenSidebar: () => void }) {
  const { appName } = useAppInfo();
  
  return (
    <div className="md:hidden flex items-center p-2 border-b border-border">
      <Button variant="ghost" size="icon" onClick={onOpenSidebar}>
        <Menu className="h-5 w-5" />
        <span className="sr-only">Toggle Menu</span>
      </Button>
      <span className="ml-2 font-medium">{appName} Chat</span>
    </div>
  );
}
