import { useQuery } from "@tanstack/react-query";
import { Circle } from "lucide-react";

export function PresenceDot() {
  // Populated live by useSocket() writing into the ["presence"] query key —
  // this component just renders whatever's currently cached, no polling.
  const { data: onlineUserIds } = useQuery<string[]>({
    queryKey: ["presence"],
    queryFn: async () => [],
    staleTime: Infinity,
  });

  const count = onlineUserIds?.length ?? 0;

  return (
    <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
      <Circle className="h-2 w-2 fill-emerald-500 text-emerald-500" />
      {count} online
    </div>
  );
}
