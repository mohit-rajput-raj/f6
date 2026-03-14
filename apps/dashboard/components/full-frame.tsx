import { Card, CardContent } from "@repo/ui/components/ui/card";
import { cn } from "@repo/ui/lib/utils";
import { Building2 } from "lucide-react";


export const MessageModal = ({ title, description, className }: { title: string, className?: string, description: string }) => {
  return (
    <div className={cn("flex items-center justify-center min-full ", className)}>
      <Card className="w-full  shadow-lg rounded-2xl border-dashed border-2">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center space-y-4">
          <Building2 className="w-12 h-12 text-muted-foreground" />

          <h2 className="text-2xl font-semibold tracking-tight">
            {title}
          </h2>

          <p className="text-sm text-muted-foreground">
            {description}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
