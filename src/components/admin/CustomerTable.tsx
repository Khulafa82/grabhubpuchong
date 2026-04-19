import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Phone, MessageCircle, Pencil, Loader2 } from "lucide-react";
import { Customer, statusBadgeClass, isOverdue, telLink, waLink } from "@/lib/customers";

interface Props {
  rows: Customer[];
  loading: boolean;
  error: string | null;
  empty?: string;
  canEdit?: (c: Customer) => boolean;
  onEdit?: (c: Customer) => void;
}

export const CustomerTable = ({ rows, loading, error, empty = "No customers found.", canEdit, onEdit }: Props) => {
  if (loading) {
    return (
      <Card className="p-10 flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-brand" />
      </Card>
    );
  }
  if (error) {
    return <Card className="p-6 border-destructive/40 bg-destructive/5 text-sm text-destructive">{error}</Card>;
  }
  if (!rows.length) {
    return <Card className="p-10 text-center text-sm text-muted-foreground">{empty}</Card>;
  }
  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Applicant ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Service</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Follow-up</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((c) => {
              const overdue = isOverdue(c.next_follow_up_date);
              const editable = canEdit ? canEdit(c) : false;
              return (
                <TableRow key={c.id}>
                  <TableCell className="font-mono text-xs">{c.applicant_id ?? "—"}</TableCell>
                  <TableCell className="font-medium">{c.full_name ?? "—"}</TableCell>
                  <TableCell>{c.phone_number ?? "—"}</TableCell>
                  <TableCell className="capitalize">{c.user_role ?? "—"}</TableCell>
                  <TableCell className="capitalize text-xs">{c.location_choice ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={statusBadgeClass(c.customer_status)}>
                      {c.customer_status ?? "new"}
                    </Badge>
                  </TableCell>
                  <TableCell className="capitalize text-xs">{c.priority_status ?? "—"}</TableCell>
                  <TableCell className={overdue ? "text-destructive font-medium" : ""}>
                    {c.next_follow_up_date ? new Date(c.next_follow_up_date).toLocaleDateString() : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button asChild size="icon" variant="ghost" title="Call">
                        <a href={telLink(c.phone_number)}><Phone className="w-4 h-4" /></a>
                      </Button>
                      <Button asChild size="icon" variant="ghost" title="WhatsApp">
                        <a href={waLink(c.phone_number)} target="_blank" rel="noreferrer">
                          <MessageCircle className="w-4 h-4" />
                        </a>
                      </Button>
                      {editable && onEdit && (
                        <Button size="icon" variant="ghost" title="Edit" onClick={() => onEdit(c)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
};
