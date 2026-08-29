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
        user={
          session?.user
            ? {
                id: session.user.id,
                email: session.user.email,
                name: session.user.name,
                role: session.user.role,
              }
            : null
        }
        squareConfig={squareConfig}
      />
    </main>
  );
}
