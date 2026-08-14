import { Suspense } from "react";
import { ResetPasswordForm } from "./ResetPasswordForm";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-full max-w-sm px-6 text-center">
          <div className="h-9 w-36 bg-neutral-100 mx-auto animate-pulse" />
        </div>
      </main>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
