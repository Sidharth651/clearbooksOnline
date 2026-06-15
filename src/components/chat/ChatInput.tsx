import React, { useRef, KeyboardEvent } from "react";
import { Send, Paperclip, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ChatInputProps {
  input: string;
  setInput: (value: string) => void;
  files: FileList | null;
  setFiles: (files: FileList | null) => void;
  isLoading: boolean;
  onSubmit: (e?: React.FormEvent) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
}

export function ChatInput({
  input,
  setInput,
  files,
  setFiles,
  isLoading,
  onSubmit,
  textareaRef,
}: ChatInputProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFiles(e.target.files);
    } else {
      setFiles(null);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <div className="sticky bottom-0 left-0 right-0 bg-gradient-to-t from-background via-background/95 to-transparent pt-10 pb-4 sm:pb-6 px-4 z-20">
      <div className="max-w-3xl mx-auto relative">
        {files && files.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2 p-2 bg-muted/30 rounded-xl border border-border/50">
            {Array.from(files).map((file, i) => (
              <div key={i} className="flex items-center gap-2 bg-background border border-border rounded-lg pl-2 pr-1 py-1 text-xs">
                <span className="max-w-[150px] truncate">{file.name}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 hover:bg-muted"
                  onClick={() => {
                    const dt = new DataTransfer();
                    Array.from(files).forEach((f, index) => {
                      if (index !== i) dt.items.add(f);
                    });
                    setFiles(dt.files.length > 0 ? dt.files : null);
                    if (fileInputRef.current) fileInputRef.current.files = dt.files;
                  }}
                >
                  <X className="w-3 h-3 text-muted-foreground" />
                </Button>
              </div>
            ))}
          </div>
        )}
        <div className="relative flex flex-col w-full bg-card border border-border shadow-[0_0_15px_rgba(0,0,0,0.05)] dark:shadow-none rounded-3xl overflow-hidden focus-within:ring-1 focus-within:ring-primary/30 transition-all duration-200">
          <input
            type="file"
            multiple
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*,application/pdf"
          />
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your finances, generate invoices..."
            className="w-full resize-none bg-transparent border-0 focus:ring-0 text-foreground px-4 py-4 max-h-[200px] min-h-[56px] text-base placeholder:text-muted-foreground/70"
            rows={1}
            style={{ overflowY: input.length > 100 ? 'auto' : 'hidden' }}
          />
          <div className="flex justify-between items-center px-3 pb-3 pt-1">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-full text-muted-foreground hover:text-foreground"
                onClick={() => fileInputRef.current?.click()}
              >
                <Paperclip className="w-5 h-5" />
              </Button>
              <div className="text-xs text-muted-foreground hidden sm:block">
                Use <kbd className="font-sans bg-muted px-1 py-0.5 rounded border border-border/50 text-[10px]">Shift</kbd> + <kbd className="font-sans bg-muted px-1 py-0.5 rounded border border-border/50 text-[10px]">Return</kbd> for new line
              </div>
            </div>
            <Button 
              onClick={() => onSubmit()} 
              disabled={isLoading || (!input.trim() && (!files || files.length === 0))} 
              size="icon" 
              className="h-10 w-10 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm disabled:opacity-50 transition-all"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <div className="text-center text-xs text-muted-foreground mt-3 select-none">
          AI can make mistakes. Check important financial info.
        </div>
      </div>
    </div>
  );
}
