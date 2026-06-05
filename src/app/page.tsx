"use client";

import { useChat } from "@ai-sdk/react";
import { Send, Bot, User, Calculator, Search, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useEffect, useRef, useState } from "react";

export default function Home() {
  const [input, setInput] = useState("");
  const { messages, status, sendMessage } = useChat();
  
  const isLoading = status === 'submitted' || status === 'streaming';
  
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage({ text: input });
    setInput("");
  };

  return (
    <div className="flex h-screen bg-neutral-100 items-center justify-center p-4">
      <Card className="w-full max-w-4xl h-[90vh] flex flex-col shadow-xl border-neutral-200">
        <CardHeader className="border-b bg-white rounded-t-xl">
          <CardTitle className="flex items-center gap-2 text-primary">
            <Calculator className="w-6 h-6 text-blue-600" />
            <span className="font-bold text-xl text-neutral-800">QuickInvoice AI</span>
          </CardTitle>
          <p className="text-sm text-neutral-500">Your intelligent accounting assistant powered by Gemini 2.5</p>
        </CardHeader>
        
        <ScrollArea className="flex-1 p-4 bg-neutral-50" ref={scrollRef}>
          <div className="flex flex-col gap-4 max-w-3xl mx-auto w-full pb-4">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center text-center h-full space-y-4 mt-20 text-neutral-400">
                <Bot className="w-16 h-16 text-blue-200" />
                <h3 className="text-lg font-medium text-neutral-600">How can I help your business today?</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm w-full max-w-lg">
                  <div className="p-3 bg-white rounded-lg border shadow-sm text-left">
                    "Create an invoice for ABC Corp for 50 meters of Silk Fabric"
                  </div>
                  <div className="p-3 bg-white rounded-lg border shadow-sm text-left">
                    "What is the phone number for XYZ Logistics?"
                  </div>
                </div>
              </div>
            )}
            
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`flex gap-3 max-w-[80%] ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${m.role === 'user' ? 'bg-blue-600 text-white' : 'bg-green-600 text-white'}`}>
                    {m.role === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
                  </div>
                  <div className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                    <div className={`p-4 rounded-2xl shadow-sm ${m.role === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white border rounded-tl-none text-neutral-800'}`}>
                      
                      {/* Check if new v6 parts are available, fallback to old text otherwise */}
                      {m.parts ? m.parts.map((part, i) => {
                        if (part.type === 'text') {
                          return <p key={i} className="whitespace-pre-wrap leading-relaxed">{part.text}</p>;
                        }
                        if (part.type.startsWith('tool-')) {
                          const toolName = part.type.replace('tool-', '');
                          const toolPart = part as any;
                          return (
                            <div key={i} className="mt-3 space-y-2">
                              <div className="bg-neutral-100 rounded-md p-2 text-xs font-mono border text-neutral-600">
                                <div className="flex items-center gap-1 mb-1 font-semibold text-neutral-700">
                                  {toolName === 'createInvoice' ? <Calculator className="w-3 h-3" /> : <Search className="w-3 h-3" />}
                                  {toolName}
                                </div>
                                <div className="text-neutral-500 overflow-x-auto">
                                  {JSON.stringify(toolPart.input)}
                                </div>
                                {toolPart.state === 'output-available' && (
                                  <div className="mt-1 pt-1 border-t border-neutral-200 text-green-700">
                                    ✓ Result: {JSON.stringify(toolPart.output).substring(0, 100)}...
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }) : (
                        <p className="whitespace-pre-wrap leading-relaxed">{(m as any).content || ""}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
               <div className="flex justify-start">
                  <div className="flex gap-3 max-w-[80%]">
                     <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-green-600 text-white animate-pulse">
                        <Bot className="w-5 h-5" />
                     </div>
                     <div className="p-4 rounded-2xl bg-white border shadow-sm rounded-tl-none">
                        <span className="flex gap-1">
                           <span className="w-2 h-2 bg-neutral-300 rounded-full animate-bounce"></span>
                           <span className="w-2 h-2 bg-neutral-300 rounded-full animate-bounce delay-100"></span>
                           <span className="w-2 h-2 bg-neutral-300 rounded-full animate-bounce delay-200"></span>
                        </span>
                     </div>
                  </div>
               </div>
            )}
          </div>
        </ScrollArea>

        <CardFooter className="border-t bg-white p-4 rounded-b-xl">
          <form onSubmit={handleSubmit} className="flex w-full items-center gap-2 max-w-3xl mx-auto">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask the AI Accountant..."
              className="flex-1 border-neutral-300 focus-visible:ring-blue-500 text-base py-6 rounded-full px-6 shadow-inner"
            />
            <Button type="submit" disabled={isLoading || !input.trim()} size="icon" className="h-12 w-12 rounded-full bg-blue-600 hover:bg-blue-700 shadow-md">
              <Send className="w-5 h-5" />
            </Button>
          </form>
        </CardFooter>
      </Card>
    </div>
  );
}
