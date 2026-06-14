"use client";

import { X, Brain, LogOut, Settings } from "lucide-react";
import { Button } from "./ui/button";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenMemory: () => void;
  onLogout: () => void;
}

export function SettingsModal({ isOpen, onClose, onOpenMemory, onLogout }: SettingsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-sm bg-card border border-border rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-muted/30">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-foreground" />
            <h2 className="font-semibold text-foreground">Settings</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-muted-foreground hover:text-foreground rounded-xl h-8 w-8 -mr-2">
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-3 flex flex-col gap-1">
          <Button
            variant="ghost"
            onClick={() => {
              onOpenMemory();
              onClose();
            }}
            className="w-full justify-start text-foreground hover:bg-muted/80 rounded-xl px-4 h-12"
          >
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center mr-3">
              <Brain className="w-4 h-4 text-primary" />
            </div>
            <div className="flex flex-col items-start">
              <span className="font-medium">AI Memory</span>
              <span className="text-xs text-muted-foreground font-normal">Manage what the AI remembers</span>
            </div>
          </Button>

          <div className="my-1 border-t border-border" />

          <Button
            variant="ghost"
            onClick={onLogout}
            className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10 rounded-xl px-4 h-12"
          >
            <div className="w-8 h-8 rounded-lg flex items-center justify-center mr-3">
              <LogOut className="w-4 h-4" />
            </div>
            <span className="font-medium">Logout</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
