"use client";

import { useState, useEffect } from "react";
import { Brain, Trash2, AlertTriangle, X, Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";

type Memory = {
  id: string;
  content: string;
  category: string;
  created_at: string;
};

const categoryStyles: Record<string, { bg: string; text: string; label: string }> = {
  preference: { bg: "bg-blue-500/15", text: "text-blue-400", label: "Preference" },
  fact: { bg: "bg-emerald-500/15", text: "text-emerald-400", label: "Fact" },
  relationship: { bg: "bg-purple-500/15", text: "text-purple-400", label: "Relationship" },
  instruction: { bg: "bg-amber-500/15", text: "text-amber-400", label: "Instruction" },
};

export function MemoryPanel({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(false);
  const [clearConfirm, setClearConfirm] = useState(false);

  const fetchMemories = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/memories");
      if (res.ok) {
        const data = await res.json();
        setMemories(data);
      }
    } catch (err) {
      console.error("Failed to fetch memories:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchMemories();
      setClearConfirm(false);
    }
  }, [isOpen]);

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch("/api/memories", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        setMemories((prev) => prev.filter((m) => m.id !== id));
      }
    } catch (err) {
      console.error("Failed to delete memory:", err);
    }
  };

  const handleClearAll = async () => {
    try {
      const res = await fetch("/api/memories?all=true", { method: "DELETE" });
      if (res.ok) {
        setMemories([]);
        setClearConfirm(false);
      }
    } catch (err) {
      console.error("Failed to clear memories:", err);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative ml-auto w-full max-w-md bg-card border-l border-border h-full flex flex-col animate-in slide-in-from-right-full duration-300">
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Brain className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground text-sm">AI Memory</h2>
              <p className="text-xs text-muted-foreground">{memories.length} memories stored</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-muted-foreground hover:text-foreground rounded-xl h-8 w-8">
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-3">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Loader2 className="w-6 h-6 animate-spin mb-2" />
                <p className="text-sm">Loading memories...</p>
              </div>
            ) : memories.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Brain className="w-10 h-10 mb-3 opacity-30" />
                <p className="text-sm font-medium">No memories yet</p>
                <p className="text-xs mt-1 text-center max-w-[250px]">
                  As you chat, the AI will automatically remember important facts about you and your business.
                </p>
              </div>
            ) : (
              memories.map((memory) => {
                const style = categoryStyles[memory.category] || categoryStyles.fact;
                return (
                  <div
                    key={memory.id}
                    className="group relative bg-background/50 border border-border/50 rounded-xl p-3 hover:bg-background/80 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground leading-relaxed">{memory.content}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${style.bg} ${style.text}`}>
                            {style.label}
                          </span>
                          <span className="text-[10px] text-muted-foreground">{formatDate(memory.created_at)}</span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(memory.id)}
                        className="opacity-0 group-hover:opacity-100 h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all shrink-0"
                        title="Delete memory"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        {memories.length > 0 && (
          <div className="p-4 border-t border-border">
            {clearConfirm ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 text-xs text-destructive flex-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Clear all memories?
                </div>
                <Button size="sm" variant="destructive" onClick={handleClearAll} className="h-7 text-xs rounded-lg">
                  Yes, clear
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setClearConfirm(false)} className="h-7 text-xs rounded-lg">
                  Cancel
                </Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                onClick={() => setClearConfirm(true)}
                className="w-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 text-xs rounded-xl"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                Clear All Memories
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
