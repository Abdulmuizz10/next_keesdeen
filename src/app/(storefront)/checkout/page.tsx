import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import {
  getSquareApplicationId,
  getSquareEnvironment,
  getSquareLocationId,
  isSquareConfigured,
} from "@/lib/square";
import { CheckoutFlow } from "./CheckoutFlow";

export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/login?callbackUrl=/checkout");
  }

  // Square configuration for client
  const squareConfig = isSquareConfigured()
    ? {
        applicationId: getSquareApplicationId(),
        locationId: getSquareLocationId(),
        environment: getSquareEnvironment(),
        countryCode: "GB",
        currencyCode: "GBP",
      }
    : null;

  return (
    <main className="min-h-screen">
      <CheckoutFlow
        user={{
          id: session.user.id,
          email: session.user.email,
          name: session.user.name,
        }}
        squareConfig={squareConfig}
      />
    </main>
  );
}
