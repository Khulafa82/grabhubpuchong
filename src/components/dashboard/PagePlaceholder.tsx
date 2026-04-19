import { Card } from "@/components/ui/card";
import { Construction } from "lucide-react";

export const PagePlaceholder = ({ title, description }: { title: string; description?: string }) => (
  <div>
    <h1 className="text-2xl font-bold text-charcoal mb-1">{title}</h1>
    {description && <p className="text-sm text-muted-foreground mb-6">{description}</p>}
    <Card className="p-12 text-center border-dashed">
      <div className="w-12 h-12 rounded-full bg-brand/10 text-brand flex items-center justify-center mx-auto mb-4">
        <Construction className="w-5 h-5" />
      </div>
      <h3 className="font-semibold text-charcoal">Module ready for backend integration</h3>
      <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
        UI structure prepared. Connect Supabase tables and queries to populate this module.
      </p>
    </Card>
  </div>
);
