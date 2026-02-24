import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ registered?: string; invite?: string }>;
}) {
  const params = await searchParams;
  return (
    <LoginForm
      registered={params.registered === "1"}
      inviteToken={params.invite ?? null}
    />
  );
}
