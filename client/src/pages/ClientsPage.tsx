import { useQuery } from "@tanstack/react-query";
import { api } from "../services/api";
import { Client } from "../types";
import { LoadingSkeleton, EmptyState } from "../components/States";

export default function ClientsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => (await api.get("/clients")).data.data as Client[],
  });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-slate-800">Clients</h1>
      {isLoading && <LoadingSkeleton />}
      {!isLoading && !data?.length && <EmptyState title="No clients yet" />}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-100 text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Company</th>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3">Email</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data?.map((c) => (
              <tr key={c.id}>
                <td className="px-4 py-3 font-medium text-slate-700">{c.company}</td>
                <td className="px-4 py-3 text-slate-500">{c.name}</td>
                <td className="px-4 py-3 text-slate-500">{c.email}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
