import LoadingSpinner from "@/components/ui/UIStates";

export default function AdminLoading() {
  return (
    <div className="admin-page">
      <LoadingSpinner message="Loading admin page..." />
    </div>
  );
}
