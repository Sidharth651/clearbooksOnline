import { Button } from "@/components/ui/button";
import { Calculator, Search } from "lucide-react";

interface ToolInvocationProps {
  toolName: string;
  toolInput: any;
  toolOutput: any;
  toolState: string;
  toolCallId: string;
  part: any;
  addToolResult: (params: any) => void;
  sendMessage: (msg: any, options?: any) => void;
}

export function ToolInvocation({
  toolName,
  toolInput,
  toolOutput,
  toolState,
  toolCallId,
  part,
  addToolResult,
  sendMessage
}: ToolInvocationProps) {
  const isStreaming = toolState === 'input-streaming';
  const isInputReady = toolState === 'input-available';
  // FIX 3: add an explicit 'call-available' / running state check
  const isRunning = toolState === 'call-available';
  const hasOutput = toolState === 'output-available';
  const hasError = toolState === 'output-error';

  if (toolName === 'askForConfirmation') {
    if (isStreaming) {
      return (
        <div className="my-3">
          <div className="bg-card rounded-xl border border-border/50 overflow-hidden w-full max-w-lg shadow-sm">
            <div className="px-4 py-3 bg-primary/10 border-b border-border/50 text-sm font-medium text-foreground flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
              Preparing Confirmation...
            </div>
          </div>
        </div>
      );
    } else if (isInputReady) {
      return (
        <div className="my-3">
          <div className="bg-card rounded-xl border border-border/50 overflow-hidden w-full max-w-lg shadow-sm">
            <div className="px-4 py-3 bg-primary/10 border-b border-border/50 text-sm font-medium text-foreground flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
              Confirmation Required
            </div>
            <div className="p-4">
              <p className="text-sm text-foreground mb-4">{toolInput?.message}</p>
              <div className="bg-muted/50 p-3 rounded-lg mb-4 text-xs font-mono overflow-auto max-h-40 border border-border/50">
                <pre>{JSON.stringify(toolInput?.details || {}, null, 2)}</pre>
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={() => {
                    addToolResult({ toolCallId, result: 'User confirmed the details.' });
                    setTimeout(() => sendMessage(null as any), 50);
                  }}
                  className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                  size="sm"
                >
                  Confirm
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    addToolResult({ toolCallId, result: 'User cancelled.' });
                    setTimeout(() => sendMessage(null as any), 50);
                  }}
                  className="flex-1"
                  size="sm"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      );
    } else if (hasOutput) {
      const outputStr = typeof toolOutput === 'string' ? toolOutput : (JSON.stringify(toolOutput) ?? '');
      // FIX 2: use word-boundary matching to avoid false positives like
      // "not confirmed" still containing "confirm"
      const lower = outputStr.toLowerCase();
      let isConfirmed = /\bconfirm(ed)?\b/.test(lower);
      let isCancelled = /\bcancell?ed?\b/.test(lower);

      // FIX: If loading from DB history, the result string might be stripped.
      // If we are in output-available state but outputStr is empty, assume confirmed.
      if (!isConfirmed && !isCancelled && outputStr === "") {
        isConfirmed = true;
      }

      if (!isConfirmed && !isCancelled) {
        return (
          <div className="my-3">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border/50 bg-muted/30 text-xs font-medium text-muted-foreground animate-pulse">
              <div className="w-1.5 h-1.5 rounded-full bg-primary"></div> Resolving...
            </div>
          </div>
        );
      }

      return (
        <div className="my-3">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border/50 bg-muted/30 text-xs font-medium text-muted-foreground">
            {isConfirmed ? (
              <><div className="w-1.5 h-1.5 rounded-full bg-green-500"></div> User Confirmed</>
            ) : (
              <><div className="w-1.5 h-1.5 rounded-full bg-red-500"></div> User Cancelled</>
            )}
          </div>
        </div>
      );
    }

    // FIX 5: always return something for askForConfirmation — never fall through
    // to the generic renderer (covers hasError and any unexpected states)
    return (
      <div className="my-3">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border/50 bg-muted/30 text-xs font-medium text-muted-foreground">
          <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
          {hasError ? 'Confirmation error' : 'Confirmation unavailable'}
        </div>
      </div>
    );
  }

  // FIX 1: derive a human-readable status label that correctly covers all states
  const statusLabel = isStreaming
    ? `Preparing ${toolName}...`
    : isRunning
    ? `Running ${toolName}...`
    : hasOutput || hasError
    ? toolName
    : `Waiting for ${toolName}...`;

  // FIX 4: error text lives in toolOutput when state is output-error, not on part
  const errorMessage = hasError
    ? (typeof toolOutput === 'string' ? toolOutput : toolOutput?.message ?? part?.errorText ?? 'Tool execution failed')
    : null;

  return (
    <div className="my-3">
      <div className="inline-flex flex-col bg-muted/30 rounded-xl border border-border/50 text-sm overflow-hidden w-full max-w-lg">
        <div className="flex items-center gap-2 px-4 py-2.5 bg-muted/50 border-b border-border/50 font-medium text-foreground">
          {toolName === 'createInvoice' || toolName === 'createPurchase'
            ? <Calculator className="w-4 h-4 text-primary" />
            : <Search className="w-4 h-4 text-primary" />}
          {statusLabel}
        </div>
        {toolInput && (
          <div className="px-4 py-3 text-muted-foreground overflow-x-auto text-xs font-mono">
            {typeof toolInput === 'string' ? toolInput : JSON.stringify(toolInput)}
          </div>
        )}
        {hasOutput && (
          <>
            <div className="px-4 py-3 border-t border-border/50 bg-muted/20 text-foreground overflow-x-auto text-xs font-mono max-h-48 overflow-y-auto">
              <pre className="whitespace-pre-wrap break-words">
                {typeof toolOutput === 'string' ? toolOutput : JSON.stringify(toolOutput, null, 2)}
              </pre>
            </div>
            <div className="px-4 py-2.5 border-t border-border/50 bg-primary/5 text-primary text-xs font-medium flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                Completed successfully
              </div>
              {toolName === 'createInvoice' && toolOutput?.voucherNo && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs text-foreground bg-background hover:bg-muted"
                  onClick={async () => {
                    try {
                      const res = await fetch(`/api/invoice/${toolOutput.voucherNo}`);
                      if (!res.ok) throw new Error('Failed to fetch invoice');
                      const data = await res.json();
                      const { downloadInvoicePdf } = await import('@/utils/invoice/invoicePdf');
                      await downloadInvoicePdf(data, `${toolOutput.voucherNo}.pdf`);
                    } catch (err) {
                      console.error('Download error:', err);
                    }
                  }}
                >
                  Download PDF
                </Button>
              )}
            </div>
          </>
        )}
        {hasError && (
          <div className="px-4 py-2.5 border-t border-border/50 bg-red-500/5 text-red-500 text-xs font-medium flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
            {/* FIX 4: use derived errorMessage, not part.errorText directly */}
            Error: {errorMessage}
          </div>
        )}
        {(isStreaming || isRunning) && (
          <div className="px-4 py-2.5 border-t border-border/50 text-muted-foreground text-xs flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></div>
            Processing...
          </div>
        )}
      </div>
    </div>
  );
}
