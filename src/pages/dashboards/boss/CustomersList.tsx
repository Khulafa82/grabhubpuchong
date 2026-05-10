import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useCustomers } from "@/hooks/useCustomers";
import { AllCustomersTable } from "@/components/admin/AllCustomersTable";
import { Customer } from "@/lib/customers";

interface Props {
  title?: string;
  description?: string;
}

const CustomersList = ({ title = "All customer data", description }: Props) => {
  const { data, loading, error, refetch } = useCustomers({ scope: "all" });
  const [, setActive] = useState<Customer | null>(null);
  const [searchParams] = useSearchParams();
  const initialCustomerId = searchParams.get("customer");

  const walkInCount = useMemo(() => data.filter((c) => !!c.walk_in_flag).length, [data]);
  const onlineCount = data.length - walkInCount;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-charcoal">{title}</h1>
          <p className="text-sm text-muted-foreground">
            {description ?? `Management workspace · ${data.length} records · ${walkInCount} walk-in · ${onlineCount} registered online · full read access.`}
          </p>
        </div>
        <Button variant="outline" onClick={refetch} disabled={loading}>Refresh</Button>
      </div>
      <AllCustomersTable
        rows={data}
        loading={loading}
        error={error}
        myId={null}
        onEdit={setActive}
        refetch={refetch}
        initialCustomerId={initialCustomerId}
      />
    </div>
  );
};

export default CustomersList;
