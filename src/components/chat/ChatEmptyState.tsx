import { Calculator } from "lucide-react";

export function ChatEmptyState({ onSelectExample }: { onSelectExample: (text: string) => void }) {
  return (
    <div className="flex flex-col items-center justify-center text-center space-y-6 mt-[15vh]">
      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-2">
        <Calculator className="w-8 h-8 text-primary" />
      </div>
      <h1 className="text-3xl font-medium text-foreground tracking-tight">How can I help you today?</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm w-full max-w-2xl mt-8">
        <button 
          onClick={() => onSelectExample("Create an invoice for ABC Corp for 50 meters of Silk Fabric")} 
          className="p-4 bg-muted/30 hover:bg-muted/60 transition-colors rounded-2xl border border-border/50 text-left text-muted-foreground hover:text-foreground"
        >
          "Create an invoice for ABC Corp for 50 meters of Silk Fabric"
        </button>
        <button 
          onClick={() => onSelectExample("What is the phone number for XYZ Logistics?")} 
          className="p-4 bg-muted/30 hover:bg-muted/60 transition-colors rounded-2xl border border-border/50 text-left text-muted-foreground hover:text-foreground"
        >
          "What is the phone number for XYZ Logistics?"
        </button>
      </div>
    </div>
  );
}
