"use client";

import { useState, useRef, useEffect } from "react";
import { Calculator, Menu } from "lucide-react";
import { Sidebar } from "@/components/Sidebar";
import { useChatSession } from "@/hooks/useChatSession";
import { ChatEmptyState } from "@/components/chat/ChatEmptyState";
import { ChatMessageList } from "@/components/chat/ChatMessageList";
import { ChatInput } from "@/components/chat/ChatInput";

export default function Home() {
  const [input, setInput] = useState("");
  const [files, setFiles] = useState<FileList | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  }, []);

  const {
    messages,
    status,
    sendMessage,
    addToolResult,
    handleSelectChat,
    sendRawMessage
  } = useChatSession();

  const isLoading = status === 'submitted' || status === 'streaming';
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    window.scrollTo({
      top: document.documentElement.scrollHeight,
      behavior: 'smooth'
    });
  }, [messages, status]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    await sendMessage(input, files);
    setInput("");
    setFiles(null);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  return (
    <div className="flex min-h-screen bg-background selection:bg-primary/20">
      <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} onSelectChat={handleSelectChat} />

      <main className="flex-1 flex flex-col relative min-h-screen min-w-0 bg-background transition-all duration-300">
        {/* Header (Mobile / Sidebar Toggle) */}
        <div className="sticky top-0 left-0 right-0 h-14 bg-background/80 backdrop-blur-md z-30 flex items-center justify-between px-4 md:hidden border-b border-border">
           <span className="font-semibold text-foreground flex items-center gap-2">
             <Calculator className="w-5 h-5 text-primary" />
             QuickInvoice AI
           </span>
           <button 
             onClick={() => setSidebarOpen(true)}
             className="p-2 -mr-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/50 transition-colors"
             aria-label="Open menu"
           >
             <Menu className="w-5 h-5" />
           </button>
        </div>

        <div className="flex-1 w-full" ref={scrollRef}>
          <div className="flex flex-col w-full pb-36 pt-16 md:pt-8 px-4">
            {messages.length === 0 ? (
              <ChatEmptyState onSelectExample={(text) => setInput(text)} />
            ) : (
              <ChatMessageList 
                messages={messages} 
                isLoading={isLoading} 
                addToolResult={addToolResult} 
                sendMessage={sendRawMessage} 
              />
            )}
          </div>
        </div>

        <ChatInput 
          input={input}
          setInput={setInput}
          files={files}
          setFiles={setFiles}
          isLoading={isLoading}
          onSubmit={handleSubmit}
          textareaRef={textareaRef}
        />
      </main>
    </div>
  );
}
