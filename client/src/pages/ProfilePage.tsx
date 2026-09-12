import { useAuthStore } from "../store/authStore";

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  return (
    <div className="max-w-md rounded-xl border border-slate-200 bg-white p-6">
      <div className="mb-4 grid h-16 w-16 place-items-center rounded-full bg-brand-100 text-2xl font-semibold text-brand-700">
        {user?.name?.charAt(0)}
      </div>
      <h1 className="text-lg font-semibold text-slate-800">{user?.name}</h1>
      <p className="text-sm text-slate-500">{user?.email}</p>
      <p className="mt-2 inline-block rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
        {user?.role.replace("_", " ")}
      </p>
    </div>
  );
}
