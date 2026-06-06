"use client";

import { Plus, MessageSquare, PanelLeftClose, PanelLeftOpen, Settings, Search, LogOut, Trash2 } from "lucide-react";
import { Button } from "./ui/button";
import { useState, useEffect } from "react";
import { Input } from "./ui/input";
import { ScrollArea } from "./ui/scroll-area";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

type ChatInfo = { id: string, title: string, created_at: string };

export function Sidebar({ isOpen, onToggle, onSelectChat }: { isOpen: boolean, onToggle: () => void, onSelectChat?: (id: string) => void }) {
  const [chats, setChats] = useState<ChatInfo[]>([]);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    async function fetchChats() {
      const res = await fetch('/api/chats');
      if (res.ok) {
        const data = await res.json();
        setChats(data);
      }
    }

    if (isOpen) {
      fetchChats();
    }

    const handleUpdate = () => fetchChats();
    window.addEventListener('chat-updated', handleUpdate);
    return () => window.removeEventListener('chat-updated', handleUpdate);
  }, [isOpen]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const handleDeleteChat = async (id: string) => {
    try {
      const res = await fetch(`/api/chats/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setChats(chats.filter(c => c.id !== id));
      }
    } catch (error) {
      console.error('Failed to delete chat:', error);
    }
  };

  if (!isOpen) {
    return (
      <div className="fixed top-4 left-4 z-50">
        <Button variant="ghost" size="icon" onClick={onToggle} className="text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-xl" title="Open Sidebar">
          <PanelLeftOpen className="w-5 h-5" />
        </Button>
      </div>
    );
  }

  return (
    <div className="w-72 bg-sidebar border-r border-sidebar-border h-screen sticky top-0 flex flex-col transition-all duration-300 z-40 flex-shrink-0">
      <div className="p-4 flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={onToggle} className="text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-xl" title="Close Sidebar">
          <PanelLeftClose className="w-5 h-5" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => window.location.href = '/'} className="text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-xl" title="New Chat">
          <Plus className="w-5 h-5" />
        </Button>
      </div>

      <div className="px-4 pb-4">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input 
            placeholder="Search history..." 
            className="pl-9 bg-background/50 border-sidebar-border text-sm h-9 rounded-xl focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>
      </div>

      <ScrollArea className="flex-1 px-2">
        <div className="space-y-6 mt-2">
          <div className="space-y-1">
            <h4 className="text-xs font-semibold text-muted-foreground px-2 py-1 uppercase tracking-wider">Your Chats</h4>
            {chats.map((chat) => (
              <div key={chat.id} className="group relative flex items-center w-full">
                <Button 
                  variant="ghost" 
                  onClick={() => onSelectChat?.(chat.id)}
                  className="w-full justify-start text-sm font-normal text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded-xl px-2 h-10 pr-10 truncate"
                >
                  <MessageSquare className="w-4 h-4 mr-2 shrink-0 opacity-70" />
                  <span className="truncate">{chat.title || "New Chat"}</span>
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => handleDeleteChat(chat.id)}
                  className="absolute right-1 opacity-0 group-hover:opacity-100 h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-opacity"
                  title="Delete Chat"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
            {chats.length === 0 && (
              <div className="text-xs text-muted-foreground px-2 py-4 italic">No chats yet.</div>
            )}
          </div>
        </div>
      </ScrollArea>

      <div className="p-4 border-t border-sidebar-border mt-auto flex flex-col gap-2">
        <Button variant="ghost" className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded-xl">
          <Settings className="w-4 h-4 mr-2" />
          Settings
        </Button>
        <Button variant="ghost" onClick={handleLogout} className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10 rounded-xl">
          <LogOut className="w-4 h-4 mr-2" />
          Logout
        </Button>
      </div>
    </div>
  );
}
