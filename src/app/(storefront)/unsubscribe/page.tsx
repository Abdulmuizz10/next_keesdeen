import Link from "next/link";
import { CheckCircle2, XCircle } from "lucide-react";

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const success = status === "success";

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center">
        {success ? (
          <CheckCircle2 size={40} className="mx-auto mb-4 text-[#04BB6E]" />
        ) : (
          <XCircle size={40} className="mx-auto mb-4 text-[#B3261E]" />
        )}
        <h1
          className="text-2xl font-medium mb-2"
          style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
        >
          {success ? "You're unsubscribed" : "That link didn't work"}
        </h1>
        <p className="text-sm text-neutral-500 leading-relaxed">
          {success
            ? "You won't receive any more marketing emails from us. You'll still get order and account updates."
            : "This unsubscribe link is invalid or has expired. If you'd rather not receive future emails, contact us and we'll take care of it."}
        </p>
        <Link
          href="/"
          className="inline-block mt-6 px-6 py-3 bg-neutral-900 text-white text-sm uppercase tracking-widest hover:bg-neutral-800 transition-colors"
        >
          Back to Keesdeen
        </Link>
      </div>
    </div>
  );
}
