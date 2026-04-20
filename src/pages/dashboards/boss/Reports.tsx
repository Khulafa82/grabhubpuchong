import { Loader2 } from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend, Tooltip,
} from "recharts";
import { Card } from "@/components/ui/card";
import { useBossAnalytics } from "@/hooks/useBossAnalytics";

const CHART_COLORS = [
  "hsl(var(--brand))",
  "hsl(var(--charcoal))",
  "hsl(var(--muted-foreground))",
  "hsl(var(--brand) / 0.6)",
  "hsl(var(--charcoal) / 0.6)",
];

const LoadingBlock = () => (
  <div className="flex items-center gap-2 text-sm text-muted-foreground py-12 justify-center">
    <Loader2 className="w-4 h-4 animate-spin" /> Loading…
  </div>
);
const EmptyBlock = ({ msg }: { msg: string }) => (
  <div className="py-12 text-center text-sm text-muted-foreground">{msg}</div>
);

export default function BossReports() {
  const a = useBossAnalytics();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-charcoal">Reports & Analytics</h1>
          <p className="text-sm text-muted-foreground">Live analytics across admins, services and locations.</p>
        </div>
        {a.loading && <Loader2 className="w-4 h-4 animate-spin text-brand" />}
      </div>

      {a.error && (
        <Card className="p-4 border-destructive/40 bg-destructive/5 text-sm text-destructive">
          Failed to load analytics: {a.error}
        </Card>
      )}

      {/* KPI rates */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Overall success rate</div>
          <div className="mt-2 flex items-baseline gap-2">
            <div className="text-3xl font-bold text-charcoal">{a.loading ? "…" : `${a.overallRate.rate}%`}</div>
            <div className="text-xs text-muted-foreground">{a.overallRate.completed} / {a.overallRate.total}</div>
          </div>
        </Card>
        <Card className="p-6">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Pending</div>
          <div className="mt-2 text-3xl font-bold text-charcoal">{a.loading ? "…" : a.pendingVsCompleted.pending.toLocaleString()}</div>
        </Card>
        <Card className="p-6">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Completed</div>
          <div className="mt-2 text-3xl font-bold text-charcoal">{a.loading ? "…" : a.pendingVsCompleted.completed.toLocaleString()}</div>
        </Card>
      </div>

      {/* Admin Performance Line */}
      <Card className="p-6">
        <h3 className="font-semibold text-charcoal mb-4">Admin performance over time (weekly)</h3>
        {a.loading ? <LoadingBlock /> : a.perfSeries.length === 0 ? (
          <EmptyBlock msg="No customer history yet." />
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={a.perfSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {a.perfAdmins.map((name, i) => (
                  <Line key={name} type="monotone" dataKey={name} stroke={CHART_COLORS[i % CHART_COLORS.length]} strokeWidth={2} dot={false} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      {/* Assigned vs Completed */}
      <Card className="p-6">
        <h3 className="font-semibold text-charcoal mb-4">Admin assignment vs completion</h3>
        {a.loading ? <LoadingBlock /> : a.assignVsComplete.length === 0 ? (
          <EmptyBlock msg="No admin data." />
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={a.assignVsComplete}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="admin" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="assigned" fill="hsl(var(--brand))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="completed" fill="hsl(var(--charcoal))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      {/* Workload */}
      <Card className="p-6">
        <h3 className="font-semibold text-charcoal mb-4">Admin workload</h3>
        {a.loading ? <LoadingBlock /> : a.workload.length === 0 ? (
          <EmptyBlock msg="No admin data." />
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={a.workload}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="admin" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="customers" fill="hsl(var(--brand))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      {/* Location & Service success rates */}
      <div className="grid lg:grid-cols-2 gap-5">
        <Card className="p-6">
          <h3 className="font-semibold text-charcoal mb-4">Success rate by location</h3>
          {a.loading ? <LoadingBlock /> : (
            <div className="space-y-3">
              {a.locationRates.map((r) => (
                <div key={r.label}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-charcoal">{r.label}</span>
                    <span className="font-medium">{r.rate}% <span className="text-muted-foreground font-normal">({r.completed}/{r.total})</span></span>
                  </div>
                  <div className="h-2 rounded-full bg-surface-muted overflow-hidden">
                    <div className="h-full bg-brand" style={{ width: `${r.rate}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold text-charcoal mb-4">Success rate by service type</h3>
          {a.loading ? <LoadingBlock /> : (
            <div className="space-y-3">
              {a.serviceRates.map((r) => (
                <div key={r.label}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-charcoal">{r.label}</span>
                    <span className="font-medium">{r.rate}% <span className="text-muted-foreground font-normal">({r.completed}/{r.total})</span></span>
                  </div>
                  <div className="h-2 rounded-full bg-surface-muted overflow-hidden">
                    <div className="h-full bg-charcoal" style={{ width: `${r.rate}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Pending vs Completed */}
      <Card className="p-6">
        <h3 className="font-semibold text-charcoal mb-4">Pending vs completed</h3>
        {a.loading ? <LoadingBlock /> : (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={[
                  { label: "Pending", value: a.pendingVsCompleted.pending },
                  { label: "Completed", value: a.pendingVsCompleted.completed },
                ]}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="value" fill="hsl(var(--brand))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>
    </div>
  );
}
