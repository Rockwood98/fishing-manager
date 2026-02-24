"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export function RecordsCharts({
  byMonth,
  byHour,
}: {
  byMonth: Array<{ key: string; count: number }>;
  byHour: Array<{ key: string; count: number }>;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="h-64 rounded-xl border border-zinc-200 p-2">
        <p className="px-2 text-sm font-medium">Złowienia po miesiącach</p>
        <ResponsiveContainer width="100%" height="90%">
          <BarChart data={byMonth}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="key" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="count" fill="#0284c7" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="h-64 rounded-xl border border-zinc-200 p-2">
        <p className="px-2 text-sm font-medium">Złowienia po godzinach</p>
        <ResponsiveContainer width="100%" height="90%">
          <BarChart data={byHour}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="key" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="count" fill="#22c55e" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
