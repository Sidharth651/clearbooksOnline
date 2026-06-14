import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { User, Bot, Paperclip } from "lucide-react";
import { ToolInvocation } from './ToolInvocation';

interface ChatMessageListProps {
  messages: any[];
  isLoading: boolean;
  addToolResult: (params: any) => void;
  sendMessage: (msg: any, options?: any) => void;
}

export function ChatMessageList({ messages, isLoading, addToolResult, sendMessage }: ChatMessageListProps) {
  return (
    <div className="max-w-3xl mx-auto w-full space-y-6">
      {messages.filter((m) => {
        if (m.role === 'tool') return false;
        const text = typeof m.content === 'string' ? m.content : (Array.isArray(m.content) ? m.content.map((c: any) => c.text || '').join('') : '');
        if (text.includes('[System]:')) return false;
        return true;
      }).map((m) => (
        <div key={m.id} className="group w-full text-foreground">
          <div className="flex gap-4 md:gap-6">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1 ${m.role === 'user' ? 'bg-muted text-muted-foreground' : 'bg-primary/20 text-primary'}`}>
              {m.role === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
            </div>
            
            <div className="flex-1 space-y-2 min-w-0">
              <div className="font-semibold text-sm select-none">
                 {m.role === 'user' ? 'You' : 'QuickInvoice'}
              </div>
              
              {m.experimental_attachments && m.experimental_attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {m.experimental_attachments.map((attachment: any, i: number) => (
                    <div key={i} className="flex items-center gap-2 bg-muted/50 border border-border/50 rounded-lg p-2 text-xs">
                      {attachment.contentType?.startsWith('image/') ? (
                        <img src={attachment.url} alt={attachment.name || 'Attachment'} className="h-10 w-10 object-cover rounded" />
                      ) : (
                        <Paperclip className="w-4 h-4 text-muted-foreground" />
                      )}
                      <span className="max-w-[150px] truncate">{attachment.name || 'File'}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="prose prose-neutral dark:prose-invert max-w-none text-foreground leading-relaxed">
                {(() => {
                  const markdownComponents = {
                    table: ({node, ...props}: any) => <div className="overflow-x-auto my-4 rounded-lg border border-border"><table className="w-full text-sm text-left" {...props} /></div>,
                    thead: ({node, ...props}: any) => <thead className="text-xs bg-muted/80 text-muted-foreground uppercase" {...props} />,
                    th: ({node, ...props}: any) => <th className="px-4 py-3 font-semibold border-b border-border whitespace-nowrap" {...props} />,
                    td: ({node, ...props}: any) => <td className="px-4 py-3 border-b border-border/50" {...props} />,
                    tr: ({node, ...props}: any) => <tr className="hover:bg-muted/30 transition-colors last:border-b-0" {...props} />,
                  };

                  const parts = m.parts;
                  
                  if (parts && Array.isArray(parts) && parts.length > 0) {
                    return parts.map((part: any, i: number) => {
                      if (part.type === 'text') {
                        if (!part.text) return null;
                        return (
                          <div key={i} className="prose prose-neutral dark:prose-invert max-w-none prose-sm md:prose-base">
                            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>{part.text}</ReactMarkdown>
                          </div>
                        );
                      }

                      if (part.type === 'step-start' || part.type === 'source-url' || part.type === 'source-document' || part.type === 'reasoning') {
                        return null;
                      }

                      const isToolPart = (part?.type && (part.type.startsWith('tool-') || part.type === 'dynamic-tool'));
                      if (isToolPart) {
                        const toolName = part.type === 'dynamic-tool' ? part.toolName : part.type.replace(/^tool-/, '');
                        return (
                          <ToolInvocation 
                            key={i}
                            toolName={toolName}
                            toolInput={part.input}
                            toolOutput={part?.output}
                            toolState={part?.state}
                            toolCallId={part?.toolCallId}
                            part={part}
                            addToolResult={addToolResult}
                            sendMessage={sendMessage}
                          />
                        );
                      }

                      if (part.type === 'tool-call') {
                        const toolName = part.toolName;
                        const matchingResultMsg = messages.find(msg => 
                          msg.role === 'tool' && 
                          Array.isArray(msg.content) && 
                          msg.content.some((p: any) => p.type === 'tool-result' && p.toolCallId === part.toolCallId)
                        );
                        
                        const hasResult = !!matchingResultMsg;
                        const toolResultPart = hasResult ? matchingResultMsg.content.find((p: any) => p.type === 'tool-result' && p.toolCallId === part.toolCallId) : null;
                        
                        return (
                          <ToolInvocation 
                            key={i}
                            toolName={toolName}
                            toolInput={part.args}
                            toolOutput={toolResultPart?.result}
                            toolState={hasResult ? 'output-available' : 'input-available'}
                            toolCallId={part.toolCallId}
                            part={part}
                            addToolResult={addToolResult}
                            sendMessage={sendMessage}
                          />
                        );
                      }
                      
                      return null;
                    });
                  }
                  
                  const textContent = typeof m.content === 'string' ? m.content : (typeof m.text === 'string' ? m.text : "");
                  return (
                    <div className="prose prose-neutral dark:prose-invert max-w-none prose-sm md:prose-base">
                      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>{textContent}</ReactMarkdown>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      ))}
      
      {isLoading && (
        <div className="group w-full text-foreground animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex gap-4 md:gap-6">
            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1 bg-primary/20 text-primary">
              <Bot className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm select-none mb-2">QuickInvoice</div>
              <div className="flex gap-1 items-center h-6">
                <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce"></span>
                <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce delay-150"></span>
                <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce delay-300"></span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
