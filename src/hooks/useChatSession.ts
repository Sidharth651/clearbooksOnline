import { useState, useRef, useEffect } from 'react';
import { useChat } from '@ai-sdk/react';

export function useChatSession() {
  const [chatId, setChatId] = useState(() => crypto.randomUUID());
  
  const { messages, status, sendMessage, setMessages, addToolResult } = useChat({
    id: chatId,
    maxSteps: 10,
    body: { chatId },
    onFinish: () => {
      window.dispatchEvent(new Event('chat-updated'));
    }
  } as any);

  const handleSelectChat = async (id: string) => {
    setChatId(id);
    try {
      const res = await fetch(`/api/chats/${id}`);
      if (res.ok) {
        const data = await res.json();
        if (data.messages) {
          const dbMessages = data.messages;
          
          const toolResultMap: Record<string, any> = {};
          for (const m of dbMessages) {
            const content = m.content || {};
            if (content.role === 'tool' && Array.isArray(content.content)) {
              for (const part of content.content) {
                if (part.type === 'tool-result' && part.toolCallId) {
                  toolResultMap[part.toolCallId] = part;
                }
              }
            }
          }
          
          const uiMessages = dbMessages
            .filter((m: any) => {
              const role = m.content?.role || m.role;
              return role === 'user' || role === 'assistant';
            })
            .map((m: any) => {
              const content = m.content || {};
              const role = content.role || m.role;
              
              let parts: any[] = [];
              
              if (Array.isArray(content.content)) {
                for (const part of content.content) {
                  if (part.type === 'text') {
                    parts.push({ type: 'text', text: part.text || '' });
                  } else if (part.type === 'tool-call') {
                    const toolResult = toolResultMap[part.toolCallId];
                    parts.push({
                      type: `tool-${part.toolName}`,
                      toolCallId: part.toolCallId,
                      state: toolResult ? 'output-available' : 'input-available',
                      input: part.input || part.args,
                      ...(toolResult ? { output: toolResult.output !== undefined ? toolResult.output : toolResult.result } : {}),
                    });
                  }
                }
              } else if (typeof content.content === 'string') {
                parts.push({ type: 'text', text: content.content });
              }
              
              if (parts.length === 0 && content.parts) {
                parts = content.parts;
              }
              if (parts.length === 0) {
                parts = [{ type: 'text', text: '' }];
              }
              
              return {
                id: m.id,
                role,
                parts,
              };
            });
          
          setMessages(uiMessages);
        }
      }
    } catch (err) {
      console.error("Failed to fetch chat history", err);
    }
  };

  const handleSendMessage = async (input: string, files: FileList | null) => {
    if ((!input.trim() && (!files || files.length === 0))) return;
    
    let processedFiles: any[] = [];
    if (files && files.length > 0) {
      processedFiles = await Promise.all(Array.from(files).map(async (file) => {
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve({
            name: file.name,
            contentType: file.type,
            url: reader.result
          });
          reader.readAsDataURL(file);
        });
      }));
    }

    sendMessage({ text: input }, { body: { customFiles: processedFiles } } as any);
    
    setMessages((currentMessages: any[]) => {
      const msgs = [...currentMessages];
      if (msgs.length > 0) {
        const last = msgs[msgs.length - 1];
        if (last.role === 'user') {
          last.experimental_attachments = processedFiles;
        }
      }
      return msgs;
    });
  };

  return {
    chatId,
    messages,
    status,
    sendMessage: handleSendMessage,
    addToolResult,
    handleSelectChat,
    sendRawMessage: sendMessage
  };
}
