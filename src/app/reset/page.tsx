// app/reset/page.tsx  (server component)
import ResetClient from "./reset-client";

export default function ResetPage({
  searchParams,
}: { searchParams: { token?: string } }) {
  const token = searchParams?.token ?? "";
  return <ResetClient token={token} />;
}
