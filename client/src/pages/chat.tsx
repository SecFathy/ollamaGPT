import { useEffect } from 'react';
import { Sidebar, MobileNav } from '@/components/chat/sidebar';
import { ChatContainer } from '@/components/chat/chat-container';
import { ChatInput } from '@/components/chat/chat-input';
import { ModelSelector } from '@/components/chat/model-selector';
import { useChat } from '@/hooks/use-chat';
import { useTitle } from '@/hooks/use-title';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { useAppInfo } from '@/hooks/use-app-info';

export default function ChatPage() {
  const { logoutMutation } = useAuth();
  const { toast } = useToast();
  
  const {
    messages,
    isGenerating,
    sendMessage,
    stopGeneration,
    availableModels,
    selectedModel,
    setSelectedModel,
    conversations,
    currentConversationId,
    newConversation,
    selectConversation,
    clearConversations,
    isDarkMode,
    toggleTheme,
    isMobileSidebarOpen,
    setIsMobileSidebarOpen
  } = useChat();
  
  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        toast({
          title: "Logged out successfully",
          description: "You have been logged out of your account",
        });
      },
      onError: (error) => {
        toast({
          title: "Logout failed",
          description: error.message,
          variant: "destructive",
        });
      }
    });
  };

  // Set page title based on current conversation
  const currentConversation = currentConversationId 
    ? conversations.find(c => c.id === currentConversationId) 
    : null;
  
  // The useTitle hook will automatically append the app name
  useTitle(currentConversation ? currentConversation.title : undefined);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <Sidebar 
        conversations={conversations}
        currentConversationId={currentConversationId || undefined}
        onNewChat={newConversation}
        onSelectConversation={selectConversation}
        onClearConversations={clearConversations}
        onToggleTheme={toggleTheme}
        onLogout={handleLogout}
        isDarkMode={isDarkMode}
        isMobileOpen={isMobileSidebarOpen}
        onMobileClose={() => setIsMobileSidebarOpen(false)}
      />
      
      {/* Main content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Mobile header */}
        <MobileNav onOpenSidebar={() => setIsMobileSidebarOpen(true)} />
        
        {/* Model selector */}
        <ModelSelector 
          models={availableModels}
          selectedModel={selectedModel}
          onModelSelect={setSelectedModel}
        />
        
        {/* Chat messages */}
        <ChatContainer 
          messages={messages}
          isStreaming={isGenerating}
          onExampleSelect={sendMessage}
        />
        
        {/* Chat input */}
        <ChatInput 
          onSubmit={sendMessage}
          onCancel={stopGeneration}
          isGenerating={isGenerating}
        />
      </div>
    </div>
  );
}
