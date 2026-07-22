import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
}

export function EmptyState({ title, description, icon: Icon = Inbox, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <Icon className="h-8 w-8 text-fg-subtle" strokeWidth={1.5} />
      <div className="space-y-1">
        <p className="font-medium text-fg">{title}</p>
        {description && <p className="text-sm text-fg-muted max-w-sm">{description}</p>}
      </div>
      {action}
    </div>
  );
}
