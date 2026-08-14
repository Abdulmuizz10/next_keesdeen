"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  ShoppingBag,
  Loader2,
  Lock,
  Tag,
  X,
} from "lucide-react";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { useCartStore } from "@/store/cartStore";
import { formatPrice } from "@/lib/format";
import { CountryStateCitySelect } from "@/components/shared/CountryStateCitySelect";

interface ShippingRate {
  name: string;
  description: string;
  price: number;
  estimatedDaysMin: number;
  estimatedDaysMax: number;
  minOrderAmount?: number;
  maxOrderAmount?: number;
}

interface SquareConfig {
  applicationId: string;
  locationId: string;
  environment: "sandbox" | "production";

  /**
   * These MUST match the currency/country of the Square seller location.
   *
   * Examples:
   * US -> USD
   * GB -> GBP
   * CA -> CAD
   * AU -> AUD
   *
   * Do NOT use NG/Naira with Square unless Square officially supports
   * payment processing for your seller location.
   */
  countryCode: string;
  currencyCode: string;
}

interface CheckoutFlowProps {
  user: {
    id: string;
    email: string;
    name: string;
  };
  squareConfig: SquareConfig | null;
}

type Step = "information" | "shipping" | "payment";

interface CheckoutData {
  email: string;
  phone: string;
  shippingAddress: {
    firstName: string;
    lastName: string;
    company: string;
    address1: string;
    address2: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    phone: string;
  };
  billingAddress: {
    firstName: string;
    lastName: string;
    company: string;
    address1: string;
    address2: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    phone: string;
  };
  sameAsShipping: boolean;
  shippingMethod: string;
  notes: string;
  checkoutIdempotencyKey: string;
}

const initialCheckoutData: CheckoutData = {
  email: "",
  phone: "",
  shippingAddress: {
    firstName: "",
    lastName: "",
    company: "",
    address1: "",
    address2: "",
    city: "",
    state: "",
    postalCode: "",
    country: "US",
    phone: "",
  },
  billingAddress: {
    firstName: "",
    lastName: "",
    company: "",
    address1: "",
    address2: "",
    city: "",
    state: "",
    postalCode: "",
    country: "US",
    phone: "",
  },
  sameAsShipping: true,
  shippingMethod: "",
  notes: "",
  checkoutIdempotencyKey: "",
};

interface SavedAddress {
  _id: string;
  label: string;
  fullName: string;
  line1: string;
  line2: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
  phone: string;
  isDefault: boolean;
}

const VISIBLE_ITEMS_COUNT = 4;
const VISIBLE_ADDRESSES_COUNT = 4;

const SQUARE_SCRIPT_SRC = {
  sandbox: "https://sandbox.web.squarecdn.com/v1/square.js",
  production: "https://web.squarecdn.com/v1/square.js",
} as const;

function ensureSquareScript(
  environment: SquareConfig["environment"],
): Promise<void> {
  return new Promise((resolve, reject) => {
    const win = window as typeof window & {
      Square?: {
        payments: (applicationId: string, locationId: string) => Promise<any>;
      };
    };

    if (win.Square) {
      resolve();
      return;
    }

    const src = SQUARE_SCRIPT_SRC[environment];

    const existing = document.querySelector(
      `script[src="${src}"]`,
    ) as HTMLScriptElement | null;

    if (existing) {
      const handleLoad = () => {
        cleanup();
        resolve();
      };

      const handleError = () => {
        cleanup();
        reject(new Error("Failed to load Square Web Payments SDK"));
      };

      const cleanup = () => {
        existing.removeEventListener("load", handleLoad);
        existing.removeEventListener("error", handleError);
      };

      existing.addEventListener("load", handleLoad);
      existing.addEventListener("error", handleError);

      return;
    }

    const script = document.createElement("script");

    script.src = src;
    script.async = true;

    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error("Failed to load Square Web Payments SDK"));

    document.head.appendChild(script);
  });
}

export function CheckoutFlow({ user, squareConfig }: CheckoutFlowProps) {
  const router = useRouter();

  const {
    lines,
    clearCart,
    hydrateCart,
    isHydrated,
    couponCode,
    couponValid,
    couponError,
    couponDiscount,
    freeShipping,
    setCouponCode,
  } = useCartStore();

  const [currentStep, setCurrentStep] = useState<Step>("information");

  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);

  const [saveNewAddress, setSaveNewAddress] = useState(false);

  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(
    null,
  );

  const [data, setData] = useState<CheckoutData>({
    ...initialCheckoutData,
    email: user.email,
    shippingAddress: {
      ...initialCheckoutData.shippingAddress,
      firstName: user.name.split(" ")[0] || "",
      lastName: user.name.split(" ").slice(1).join(" ") || "",
    },
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [cardReady, setCardReady] = useState(false);
  const [applePayAvailable, setApplePayAvailable] = useState(false);
  const [googlePayAvailable, setGooglePayAvailable] = useState(false);

  const [couponInput, setCouponInput] = useState("");
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [showAllItems, setShowAllItems] = useState(false);

  const [shippingRates, setShippingRates] = useState<ShippingRate[]>([]);

  const [serverTaxRate, setServerTaxRate] = useState(0);
  const [ratesLoading, setRatesLoading] = useState(false);

  /*
   * -----------------------------------------------------------
   * CART
   * -----------------------------------------------------------
   */

  useEffect(() => {
    hydrateCart();
  }, [hydrateCart]);

  /*
   * -----------------------------------------------------------
   * SAVED ADDRESSES
   * -----------------------------------------------------------
   */

  useEffect(() => {
    let cancelled = false;

    async function loadAddresses() {
      try {
        const response = await fetch("/api/addresses");

        if (!response.ok) return;

        const addresses = await response.json();

        if (cancelled || !Array.isArray(addresses) || addresses.length === 0) {
          return;
        }

        setSavedAddresses(addresses);

        const defaultAddress =
          addresses.find((address: SavedAddress) => address.isDefault) ||
          addresses[0];

        if (!defaultAddress) return;

        const [firstName, ...lastNameParts] =
          defaultAddress.fullName.split(" ");

        setSelectedAddressId(defaultAddress._id);

        setData((previous) => ({
          ...previous,
          shippingAddress: {
            ...previous.shippingAddress,
            firstName: firstName || "",
            lastName: lastNameParts.join(" ") || "",
            address1: defaultAddress.line1,
            address2: defaultAddress.line2 || "",
            city: defaultAddress.city,
            state: defaultAddress.region,
            postalCode: defaultAddress.postalCode,
            country: defaultAddress.country,
            phone: defaultAddress.phone || "",
          },
        }));
      } catch {
        // Saved addresses are optional.
      }
    }

    loadAddresses();

    return () => {
      cancelled = true;
    };
  }, []);

  /*
   * -----------------------------------------------------------
   * TOTALS
   * -----------------------------------------------------------
   */

  const subtotal = lines.reduce(
    (sum, line) => sum + line.unitPrice * line.quantity,
    0,
  );

  const selectedRate = shippingRates.find(
    (rate) => rate.name === data.shippingMethod,
  );

  const shippingTotal = freeShipping ? 0 : selectedRate?.price || 0;

  const taxTotal = Math.round((subtotal * serverTaxRate) / 100);

  const appliedCouponDiscount = couponValid ? couponDiscount : 0;

  const grandTotal = Math.max(
    subtotal + shippingTotal + taxTotal - appliedCouponDiscount,
    0,
  );

  /*
   * -----------------------------------------------------------
   * SHIPPING RATES
   * -----------------------------------------------------------
   */

  useEffect(() => {
    const address = data.shippingAddress;

    if (
      !address.country ||
      !address.state ||
      !address.postalCode ||
      subtotal <= 0
    ) {
      return;
    }

    const controller = new AbortController();

    let active = true;

    async function loadShippingRates() {
      setRatesLoading(true);

      try {
        const response = await fetch("/api/checkout/shipping-rates", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            country: address.country,
            state: address.state,
            postalCode: address.postalCode,
            subtotal,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Failed to load shipping rates");
        }

        const result = await response.json();

        if (!active) return;

        const rates = Array.isArray(result.shipping?.rates)
          ? result.shipping.rates
          : [];

        setShippingRates(
          rates.map((rate: ShippingRate) => ({
            name: rate.name,
            description: rate.description,
            price: rate.price,
            estimatedDaysMin: rate.estimatedDaysMin,
            estimatedDaysMax: rate.estimatedDaysMax,
            minOrderAmount: rate.minOrderAmount,
            maxOrderAmount: rate.maxOrderAmount,
          })),
        );

        setServerTaxRate(Number(result.tax?.rate || 0));
      } catch (err) {
        if ((err as Error).name === "AbortError") return;

        if (active) {
          setShippingRates([]);
          setServerTaxRate(0);
        }
      } finally {
        if (active) {
          setRatesLoading(false);
        }
      }
    }

    loadShippingRates();

    return () => {
      active = false;
      controller.abort();
    };
  }, [data.shippingAddress, subtotal]);

  /*
   * -----------------------------------------------------------
   * SQUARE REFS
   * -----------------------------------------------------------
   */

  const cardInstanceRef = useRef<any>(null);
  const googlePayInstanceRef = useRef<any>(null);
  const applePayInstanceRef = useRef<any>(null);
  const paymentRequestRef = useRef<any>(null);

  const cardContainerRef = useRef<HTMLDivElement | null>(null);

  const googlePayContainerRef = useRef<HTMLDivElement | null>(null);

  const squareGenerationRef = useRef(0);
  const squareInitializingRef = useRef(false);

  const stepsTopRef = useRef<HTMLDivElement | null>(null);
  const isFirstStepRender = useRef(true);

  /*
   * -----------------------------------------------------------
   * KEEP LATEST TOTAL
   * -----------------------------------------------------------
   */

  const grandTotalRef = useRef(grandTotal);

  useEffect(() => {
    grandTotalRef.current = grandTotal;
  }, [grandTotal]);

  /*
   * -----------------------------------------------------------
   * DESTROY SQUARE
   * -----------------------------------------------------------
   */

  const destroySquare = useCallback(async () => {
    squareGenerationRef.current += 1;
    squareInitializingRef.current = false;

    const cardInstance = cardInstanceRef.current;
    const googlePayInstance = googlePayInstanceRef.current;
    const applePayInstance = applePayInstanceRef.current;

    cardInstanceRef.current = null;
    googlePayInstanceRef.current = null;
    applePayInstanceRef.current = null;
    paymentRequestRef.current = null;

    setCardReady(false);
    setApplePayAvailable(false);
    setGooglePayAvailable(false);

    try {
      await cardInstance?.destroy?.();
    } catch {}

    try {
      await googlePayInstance?.destroy?.();
    } catch {}

    try {
      await applePayInstance?.destroy?.();
    } catch {}
  }, []);

  /*
   * -----------------------------------------------------------
   * SUBMIT CHECKOUT
   * -----------------------------------------------------------
   */

  const submitToCheckout = useCallback(
    async (sourceId: string) => {
      const idempotencyKey = data.checkoutIdempotencyKey || crypto.randomUUID();

      if (!data.checkoutIdempotencyKey) {
        setData((previous) => ({
          ...previous,
          checkoutIdempotencyKey: idempotencyKey,
        }));
      }

      const billingAddress = data.sameAsShipping
        ? data.shippingAddress
        : data.billingAddress;

      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: data.email,
          phone: data.phone,
          idempotencyKey,

          shippingAddress: {
            firstName: data.shippingAddress.firstName,
            lastName: data.shippingAddress.lastName,
            company: data.shippingAddress.company || undefined,
            address1: data.shippingAddress.address1,
            address2: data.shippingAddress.address2 || undefined,
            city: data.shippingAddress.city,
            state: data.shippingAddress.state,
            postalCode: data.shippingAddress.postalCode,
            country: data.shippingAddress.country,
            phone: data.shippingAddress.phone || undefined,
          },

          billingAddress: {
            firstName: billingAddress.firstName,
            lastName: billingAddress.lastName,
            company: billingAddress.company || undefined,
            address1: billingAddress.address1,
            address2: billingAddress.address2 || undefined,
            city: billingAddress.city,
            state: billingAddress.state,
            postalCode: billingAddress.postalCode,
            country: billingAddress.country,
            phone: billingAddress.phone || undefined,
          },

          shippingMethod: data.shippingMethod,

          couponCode: couponValid ? couponCode || undefined : undefined,

          notes: data.notes || undefined,

          sourceId,

          cartLines: lines.map((line) => ({
            productId: line.productId,
            variantSku: line.variantSku,
            quantity: line.quantity,
          })),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Payment failed");
      }

      if (saveNewAddress) {
        const address = data.shippingAddress;

        fetch("/api/addresses", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            label: "Shipping",
            fullName: `${address.firstName} ${address.lastName}`,
            line1: address.address1,
            line2: address.address2 || undefined,
            city: address.city,
            region: address.state,
            postalCode: address.postalCode,
            country: address.country,
            phone: address.phone || undefined,
          }),
        }).catch(() => {});
      }

      clearCart();

      router.push(
        `/order-confirmation?order=${encodeURIComponent(result.orderNumber)}`,
      );
    },
    [data, couponCode, couponValid, lines, saveNewAddress, clearCart, router],
  );

  /*
   * -----------------------------------------------------------
   * DIGITAL WALLET PAYMENT
   * -----------------------------------------------------------
   */

  const handleDigitalWalletPayment = useCallback(
    async (walletInstance: any) => {
      if (!walletInstance || isProcessing) return;

      setIsProcessing(true);
      setError(null);

      try {
        const tokenResult = await walletInstance.tokenize();

        if (tokenResult.status !== "OK" || !tokenResult.token) {
          setError(
            tokenResult.errors?.[0]?.message ||
              "Digital wallet payment failed. Try card instead.",
          );

          setIsProcessing(false);
          return;
        }

        await submitToCheckout(tokenResult.token);
      } catch (err) {
        console.error("Digital wallet payment error:", err);

        setError("An error occurred during payment. Please try again.");

        setIsProcessing(false);
      }
    },
    [isProcessing, submitToCheckout],
  );

  const digitalWalletHandlerRef = useRef(handleDigitalWalletPayment);

  useEffect(() => {
    digitalWalletHandlerRef.current = handleDigitalWalletPayment;
  }, [handleDigitalWalletPayment]);

  /*
   * -----------------------------------------------------------
   * INITIALIZE SQUARE
   * -----------------------------------------------------------
   */

  const initializeSquare = useCallback(
    async (cardElement: HTMLDivElement) => {
      if (!squareConfig) return;

      if (squareInitializingRef.current) {
        return;
      }

      squareInitializingRef.current = true;

      const generation = ++squareGenerationRef.current;

      const stale = () => generation !== squareGenerationRef.current;

      try {
        await ensureSquareScript(squareConfig.environment);

        if (stale()) return;

        const win = window as typeof window & {
          Square?: {
            payments: (
              applicationId: string,
              locationId: string,
            ) => Promise<any>;
          };
        };

        if (!win.Square) {
          throw new Error("Square Web Payments SDK is unavailable");
        }

        const payments = await win.Square.payments(
          squareConfig.applicationId,
          squareConfig.locationId,
        );

        if (stale()) return;

        /*
         * CARD
         *
         * The DOM node is passed directly to attach().
         * Therefore Square cannot race with querySelector()
         * looking for #card-container.
         */
        const card = await payments.card();

        if (stale()) {
          await card.destroy?.();
          return;
        }

        await card.attach(cardElement);

        if (stale()) {
          await card.destroy?.();
          return;
        }

        cardInstanceRef.current = card;
        setCardReady(true);

        /*
         * PAYMENT REQUEST
         *
         * Square expects the wallet amount in major units:
         * e.g. 12.99, not 1299.
         */
        const paymentRequest = payments.paymentRequest({
          // countryCode: squareConfig.countryCode,
          // currencyCode: squareConfig.currencyCode,

          countryCode: "GB",
          currencyCode: "GBP",

          total: {
            amount: (grandTotalRef.current / 100).toFixed(2),
            label: "Keesdeen",
          },
        });

        paymentRequestRef.current = paymentRequest;

        /*
         * APPLE PAY
         */
        try {
          const applePay = await payments.applePay(paymentRequest);

          if (!stale() && applePay) {
            applePayInstanceRef.current = applePay;

            setApplePayAvailable(true);
          } else {
            await applePay?.destroy?.();
          }
        } catch (err) {
          console.debug("Apple Pay unavailable:", err);
        }

        /*
         * GOOGLE PAY
         */
        try {
          const googlePay = await payments.googlePay(paymentRequest);

          if (stale()) {
            await googlePay?.destroy?.();
            return;
          }

          const googleContainer = googlePayContainerRef.current;

          if (!googleContainer) {
            await googlePay?.destroy?.();
            throw new Error("Google Pay container is not mounted");
          }

          await googlePay.attach(googleContainer, {
            buttonSizeMode: "fill",
          });

          if (stale()) {
            await googlePay.destroy?.();
            return;
          }

          googlePayInstanceRef.current = googlePay;

          setGooglePayAvailable(true);

          /*
           * Square's Google Pay attach() renders the
           * button into our container. We listen on the
           * container because clicks bubble from the
           * generated button.
           */
          const handleGooglePayClick = async (event: MouseEvent) => {
            const target = event.target as HTMLElement | null;

            if (!target || !googleContainer.contains(target)) {
              return;
            }

            await digitalWalletHandlerRef.current(googlePay);
          };

          googleContainer.addEventListener("click", handleGooglePayClick);

          (
            googleContainer as HTMLDivElement & {
              __squareGooglePayCleanup?: () => void;
            }
          ).__squareGooglePayCleanup = () => {
            googleContainer.removeEventListener("click", handleGooglePayClick);
          };
        } catch (err) {
          console.debug("Google Pay unavailable:", err);
        }
      } catch (err) {
        console.error("Failed to initialize Square:", err);

        if (!stale()) {
          setError(
            "Failed to load payment form. Please refresh and try again.",
          );
        }
      } finally {
        if (!stale()) {
          squareInitializingRef.current = false;
        }
      }
    },
    [squareConfig],
  );

  /*
   * -----------------------------------------------------------
   * CARD CONTAINER REF
   * -----------------------------------------------------------
   */

  const setCardContainerNode = useCallback(
    (node: HTMLDivElement | null) => {
      cardContainerRef.current = node;

      if (!node) {
        void destroySquare();
        return;
      }

      void initializeSquare(node);
    },
    [initializeSquare, destroySquare],
  );

  /*
   * -----------------------------------------------------------
   * GOOGLE PAY CONTAINER REF
   * -----------------------------------------------------------
   */

  const setGooglePayContainerNode = useCallback(
    (node: HTMLDivElement | null) => {
      googlePayContainerRef.current = node;
    },
    [],
  );

  /*
   * -----------------------------------------------------------
   * UPDATE WALLET TOTAL
   * -----------------------------------------------------------
   */

  useEffect(() => {
    const paymentRequest = paymentRequestRef.current;

    if (!paymentRequest) return;

    try {
      paymentRequest.update({
        total: {
          amount: (grandTotal / 100).toFixed(2),
          label: "Keesdeen",
        },
      });
    } catch {
      // Wallet sheet may currently be open.
    }
  }, [grandTotal]);

  /*
   * -----------------------------------------------------------
   * FINAL CLEANUP
   * -----------------------------------------------------------
   */

  useEffect(() => {
    return () => {
      const googleContainer = googlePayContainerRef.current;

      if (googleContainer) {
        (
          googleContainer as HTMLDivElement & {
            __squareGooglePayCleanup?: () => void;
          }
        ).__squareGooglePayCleanup?.();
      }

      void destroySquare();
    };
  }, [destroySquare]);

  /*
   * -----------------------------------------------------------
   * SCROLL TO STEP ON CHANGE
   * -----------------------------------------------------------
   */

  useEffect(() => {
    if (isFirstStepRender.current) {
      isFirstStepRender.current = false;
      return;
    }

    const headerOffset = 96; // roughly matches the mt-20/mt-10 top offset

    const target = stepsTopRef.current;

    if (!target) return;

    const top =
      target.getBoundingClientRect().top + window.scrollY - headerOffset;

    window.scrollTo({ top, behavior: "smooth" });
  }, [currentStep]);

  /*
   * -----------------------------------------------------------
   * INPUTS
   * -----------------------------------------------------------
   */

  const handleInputChange = useCallback(
    (
      field: string,
      value: string | boolean,
      addressType?: "shippingAddress" | "billingAddress",
    ) => {
      setData((previous) => {
        if (addressType) {
          return {
            ...previous,
            [addressType]: {
              ...previous[addressType],
              [field]: value,
            },
          };
        }

        return {
          ...previous,
          [field]: value,
        };
      });
    },
    [],
  );

  /*
   * -----------------------------------------------------------
   * COUPON
   * -----------------------------------------------------------
   */

  const handleApplyCoupon = async () => {
    const code = couponInput.trim().toUpperCase();

    if (!code || applyingCoupon) return;

    setApplyingCoupon(true);

    try {
      await setCouponCode(code);
    } finally {
      setApplyingCoupon(false);
    }
  };

  const handleRemoveCoupon = async () => {
    setCouponInput("");
    await setCouponCode(null);
  };

  /*
   * -----------------------------------------------------------
   * VALIDATION
   * -----------------------------------------------------------
   */

  const validateInformation = () => {
    const { email, shippingAddress } = data;

    if (
      !email.trim() ||
      !shippingAddress.firstName.trim() ||
      !shippingAddress.lastName.trim()
    ) {
      setError("Please fill in all required fields.");
      return false;
    }

    if (
      !shippingAddress.address1.trim() ||
      !shippingAddress.city.trim() ||
      !shippingAddress.state.trim() ||
      !shippingAddress.postalCode.trim()
    ) {
      setError("Please complete the shipping address.");
      return false;
    }

    return true;
  };

  const validateShipping = () => {
    if (ratesLoading) {
      setError("Please wait for shipping rates to finish loading.");
      return false;
    }

    if (shippingRates.length === 0) {
      setError("No shipping methods are available for this location.");
      return false;
    }

    if (!data.shippingMethod) {
      setError("Please select a shipping method.");
      return false;
    }

    return true;
  };

  /*
   * -----------------------------------------------------------
   * NAVIGATION
   * -----------------------------------------------------------
   */

  const handleNext = () => {
    setError(null);

    if (currentStep === "information") {
      if (validateInformation()) {
        setCurrentStep("shipping");
      }

      return;
    }

    if (currentStep === "shipping") {
      if (!validateShipping()) return;

      setData((previous) => ({
        ...previous,
        checkoutIdempotencyKey:
          previous.checkoutIdempotencyKey || crypto.randomUUID(),
      }));

      setCurrentStep("payment");
    }
  };

  const handleBack = () => {
    setError(null);

    if (currentStep === "shipping") {
      setCurrentStep("information");
    }

    if (currentStep === "payment") {
      setCurrentStep("shipping");
    }
  };

  /*
   * -----------------------------------------------------------
   * CARD PAYMENT
   * -----------------------------------------------------------
   */

  const handleSubmitPayment = async () => {
    const card = cardInstanceRef.current;

    if (!card || !cardReady) {
      setError(
        "Payment form is not ready. Please wait a moment and try again.",
      );
      return;
    }

    if (isProcessing) return;

    setIsProcessing(true);
    setError(null);

    try {
      const tokenResult = await card.tokenize();

      if (tokenResult.status !== "OK" || !tokenResult.token) {
        setError(
          tokenResult.errors?.[0]?.message ||
            "Payment failed. Please check your card details.",
        );

        setIsProcessing(false);
        return;
      }

      await submitToCheckout(tokenResult.token);
    } catch (err) {
      console.error("Card payment error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "An error occurred during payment. Please try again.",
      );

      setIsProcessing(false);
    }
  };

  /*
   * -----------------------------------------------------------
   * EMPTY CART
   * -----------------------------------------------------------
   */

  if (isHydrated && lines.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <ShoppingBag size={48} className="mx-auto text-neutral-200 mb-4" />

          <h1 className="font-serif text-2xl text-neutral-600 mb-2">
            Your cart is empty
          </h1>

          <Link
            href="/category/bags"
            className="text-primary-500 hover:text-primary-600"
          >
            Continue shopping
          </Link>
        </div>
      </div>
    );
  }

  const visibleLines = showAllItems
    ? lines
    : lines.slice(0, VISIBLE_ITEMS_COUNT);

  const hiddenItemCount = Math.max(lines.length - VISIBLE_ITEMS_COUNT, 0);

  const steps: {
    key: Step;
    label: string;
  }[] = [
    {
      key: "information",
      label: "Information",
    },
    {
      key: "shipping",
      label: "Shipping",
    },
    {
      key: "payment",
      label: "Payment",
    },
  ];

  const currentStepIndex = steps.findIndex((step) => step.key === currentStep);

  const applePayInstance = applePayInstanceRef.current;

  const anyWalletAvailable = applePayAvailable || googlePayAvailable;

  return (
    <div className="bg-white mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-12 py-14 mt-20 sm:mt-10">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 lg:gap-12">
        {/* LEFT — ORDER SUMMARY */}
        <div className="mb-12 lg:mb-0">
          <div className="bg-neutral-100 p-6 lg:sticky lg:top-8">
            <h2 className="font-serif text-xl font-semibold text-neutral-600 mb-6">
              Order Summary
            </h2>

            <div className="space-y-4 mb-6">
              {visibleLines.map((line) => (
                <div
                  key={`${line.productId}::${line.variantSku}`}
                  className="flex gap-4"
                >
                  <div className="relative w-16 h-20 bg-white overflow-hidden shrink-0">
                    {line.image && (
                      <Image
                        src={line.image}
                        alt={line.title}
                        fill
                        className="object-cover"
                        sizes="64px"
                      />
                    )}

                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-neutral-500 text-white text-xs flex items-center justify-center">
                      {line.quantity}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-neutral-600 truncate">
                      {line.title}
                    </p>

                    <p className="text-xs text-neutral-400">
                      {line.variantTitle}
                    </p>
                  </div>

                  <p className="text-sm font-medium text-neutral-600">
                    {formatPrice(line.unitPrice * line.quantity)}
                  </p>
                </div>
              ))}

              {hiddenItemCount > 0 && (
                <button
                  type="button"
                  onClick={() => setShowAllItems((previous) => !previous)}
                  className="text-xs font-sans font-medium text-neutral-500 hover:text-primary-500 border-b border-neutral-300 hover:border-primary-500 transition-colors pb-0.5"
                >
                  {showAllItems
                    ? "View less"
                    : `View ${hiddenItemCount} more item${
                        hiddenItemCount === 1 ? "" : "s"
                      }`}
                </button>
              )}
            </div>

            {/* COUPON */}
            <div className="mb-6">
              {couponCode && couponValid ? (
                <div className="flex items-center justify-between px-3 py-2 border border-primary-200 bg-primary-50 text-sm">
                  <span className="font-mono font-medium text-primary-600">
                    {couponCode}
                  </span>

                  <button
                    type="button"
                    onClick={handleRemoveCoupon}
                    className="text-neutral-400 hover:text-red-500 transition-colors"
                    aria-label="Remove coupon"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Coupon code"
                    value={couponInput}
                    onChange={(event) =>
                      setCouponInput(event.target.value.toUpperCase())
                    }
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        void handleApplyCoupon();
                      }
                    }}
                    className="flex-1 px-4 py-2 border border-neutral-200 text-sm bg-white focus:outline-none focus:border-primary-400 uppercase"
                  />

                  <button
                    type="button"
                    onClick={() => void handleApplyCoupon()}
                    disabled={applyingCoupon || !couponInput.trim()}
                    className="px-4 py-2 border border-neutral-200 text-sm font-medium bg-white hover:bg-neutral-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {applyingCoupon ? "..." : "Apply"}
                  </button>
                </div>
              )}

              {couponError && (
                <p className="text-xs text-red-500 mt-2">{couponError}</p>
              )}
            </div>

            {/* TOTALS */}
            <div className="space-y-3 border-t border-neutral-200 pt-4">
              <div className="flex justify-between text-sm">
                <span className="text-neutral-500">Subtotal</span>

                <span className="text-neutral-600">
                  {formatPrice(subtotal)}
                </span>
              </div>

              {couponValid && couponDiscount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-secondary-400 flex items-center gap-1">
                    <Tag size={14} />
                    Coupon ({couponCode})
                  </span>

                  <span className="text-secondary-400 font-medium">
                    −{formatPrice(couponDiscount)}
                  </span>
                </div>
              )}

              <div className="flex justify-between text-sm">
                <span className="text-neutral-500">Shipping</span>

                <span className="text-neutral-600">
                  {freeShipping
                    ? "Free"
                    : data.shippingMethod
                      ? shippingTotal === 0
                        ? "Free"
                        : formatPrice(shippingTotal)
                      : "Calculated next step"}
                </span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-neutral-500">Tax</span>

                <span className="text-neutral-600">
                  {formatPrice(taxTotal)}
                </span>
              </div>

              <div className="flex justify-between text-lg font-semibold pt-3 border-t border-neutral-200">
                <span className="text-neutral-600">Total</span>

                <span className="text-neutral-600">
                  {formatPrice(grandTotal)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT — CHECKOUT */}
        <div>
          <div
            ref={stepsTopRef}
            className="flex items-center gap-2 mb-8 text-sm"
          >
            {steps.map((step, index) => (
              <div key={step.key} className="flex items-center gap-2">
                <span
                  className={
                    index < currentStepIndex
                      ? "text-primary-500"
                      : index === currentStepIndex
                        ? "text-neutral-600 font-medium"
                        : "text-neutral-300"
                  }
                >
                  {step.label}
                </span>

                {index < steps.length - 1 && (
                  <ArrowRight size={14} className="text-neutral-300" />
                )}
              </div>
            ))}
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 text-sm text-red-600">
              {error}
            </div>
          )}

          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{
                opacity: 0,
                x: 20,
              }}
              animate={{
                opacity: 1,
                x: 0,
              }}
              exit={{
                opacity: 0,
                x: -20,
              }}
              transition={{
                duration: 0.2,
              }}
            >
              {currentStep === "information" && (
                <InformationStep
                  data={data}
                  onChange={handleInputChange}
                  savedAddresses={savedAddresses}
                  saveNewAddress={saveNewAddress}
                  setSaveNewAddress={setSaveNewAddress}
                  selectedAddressId={selectedAddressId}
                  setSelectedAddressId={setSelectedAddressId}
                />
              )}

              {currentStep === "shipping" && (
                <ShippingStep
                  data={data}
                  shippingRates={shippingRates}
                  subtotal={subtotal}
                  ratesLoading={ratesLoading}
                  onChange={handleInputChange}
                />
              )}

              {currentStep === "payment" && (
                <PaymentStep
                  data={data}
                  cardReady={cardReady}
                  squareConfig={squareConfig}
                  onChange={handleInputChange}
                  applePayAvailable={applePayAvailable}
                  googlePayAvailable={googlePayAvailable}
                  onApplePay={() =>
                    handleDigitalWalletPayment(applePayInstance)
                  }
                  cardContainerRef={setCardContainerNode}
                  googlePayContainerRef={setGooglePayContainerNode}
                  anyWalletAvailable={anyWalletAvailable}
                />
              )}
            </motion.div>
          </AnimatePresence>

          <div className="mt-8 flex items-center justify-between">
            {currentStep === "information" ? (
              <Link
                href="/cart"
                className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-primary-500"
              >
                <ArrowLeft size={16} />
                Return to cart
              </Link>
            ) : (
              <button
                type="button"
                onClick={handleBack}
                className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-primary-500"
              >
                <ArrowLeft size={16} />
                Back
              </button>
            )}

            {currentStep === "payment" ? (
              <button
                type="button"
                onClick={() => void handleSubmitPayment()}
                disabled={isProcessing || !cardReady}
                className="inline-flex items-center gap-2 px-8 py-3 bg-primary-400 text-white font-semibold hover:bg-primary-500 disabled:bg-primary-200 disabled:cursor-not-allowed transition-colors"
              >
                {isProcessing ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Lock size={18} />
                    Pay {formatPrice(grandTotal)}
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleNext}
                className="inline-flex items-center gap-2 px-8 py-3 bg-primary-400 text-white font-semibold hover:bg-primary-500 transition-colors"
              >
                Continue
                <ArrowRight size={18} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   INFORMATION STEP
   ============================================================ */

function InformationStep({
  data,
  onChange,
  savedAddresses,
  saveNewAddress,
  setSaveNewAddress,
  selectedAddressId,
  setSelectedAddressId,
}: {
  data: CheckoutData;
  onChange: (
    field: string,
    value: string | boolean,
    addressType?: "shippingAddress" | "billingAddress",
  ) => void;
  savedAddresses: SavedAddress[];
  saveNewAddress: boolean;
  setSaveNewAddress: (value: boolean) => void;
  selectedAddressId: string | null;
  setSelectedAddressId: (id: string | null) => void;
}) {
  const [showAllAddresses, setShowAllAddresses] = useState(false);

  const visibleAddresses = showAllAddresses
    ? savedAddresses
    : savedAddresses.slice(0, VISIBLE_ADDRESSES_COUNT);

  const hiddenAddressCount = Math.max(
    savedAddresses.length - VISIBLE_ADDRESSES_COUNT,
    0,
  );

  const selectSavedAddress = (address: SavedAddress) => {
    setSelectedAddressId(address._id);

    const [firstName, ...lastNameParts] = address.fullName.split(" ");

    onChange("firstName", firstName || "", "shippingAddress");

    onChange("lastName", lastNameParts.join(" ") || "", "shippingAddress");

    onChange("address1", address.line1, "shippingAddress");

    onChange("address2", address.line2 || "", "shippingAddress");

    onChange("city", address.city, "shippingAddress");

    onChange("state", address.region, "shippingAddress");

    onChange("postalCode", address.postalCode, "shippingAddress");

    onChange("country", address.country, "shippingAddress");

    onChange("phone", address.phone || "", "shippingAddress");
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-xl font-semibold text-neutral-600 mb-4">
          Contact Information
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-600 mb-1">
              Email
            </label>

            <input
              type="email"
              value={data.email}
              onChange={(event) => onChange("email", event.target.value)}
              className="w-full px-4 py-3 border border-neutral-200 focus:outline-none focus:border-primary-400"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-600 mb-1">
              Phone (optional)
            </label>

            <PhoneInput
              international
              defaultCountry="NG"
              value={data.phone}
              onChange={(value) => onChange("phone", value || "")}
              className="keesdeen-phone-input"
              placeholder="Enter phone number"
            />
          </div>
        </div>
      </div>

      <div>
        <h2 className="font-serif text-xl font-semibold text-neutral-600 mb-4">
          Shipping Address
        </h2>

        {savedAddresses.length > 0 && (
          <div className="mb-6">
            <p className="text-[10px] font-sans font-semibold uppercase tracking-[0.12em] text-neutral-400 mb-3">
              Saved Addresses
            </p>

            <div className="space-y-2">
              {visibleAddresses.map((address) => (
                <button
                  type="button"
                  key={address._id}
                  onClick={() => selectSavedAddress(address)}
                  className={`w-full text-left p-3 border transition-colors ${
                    selectedAddressId === address._id
                      ? "bg-neutral-200 border-black"
                      : "border-neutral-200 hover:bg-neutral-50"
                  }`}
                >
                  <span className="text-xs font-sans font-medium text-neutral-600">
                    {address.label}
                  </span>

                  {address.isDefault && (
                    <span className="ml-2 text-[9px] text-primary-500">
                      Default
                    </span>
                  )}

                  <p className="text-xs font-sans text-neutral-400 mt-0.5">
                    {address.fullName} — {address.line1}, {address.city},{" "}
                    {address.region} {address.postalCode}
                  </p>
                </button>
              ))}
            </div>

            {hiddenAddressCount > 0 && (
              <button
                type="button"
                onClick={() => setShowAllAddresses((previous) => !previous)}
                className="mt-3 text-[10px] font-sans font-semibold uppercase tracking-[0.12em] text-neutral-500 hover:text-primary-500 border-b border-neutral-300 hover:border-primary-500 transition-colors pb-0.5"
              >
                {showAllAddresses
                  ? "View less"
                  : `View ${hiddenAddressCount} more`}
              </button>
            )}

            <p className="text-[10px] font-sans text-neutral-400 mt-3 mb-4">
              Or enter a new address below:
            </p>
          </div>
        )}

        <div className="mb-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={saveNewAddress}
              onChange={(event) => setSaveNewAddress(event.target.checked)}
            />

            <span className="text-xs font-sans text-neutral-500">
              Save this address for future orders
            </span>
          </label>
        </div>

        <AddressForm
          address={data.shippingAddress}
          onChange={(field, value) => {
            if (selectedAddressId) {
              setSelectedAddressId(null);
            }

            onChange(field, value, "shippingAddress");
          }}
        />
      </div>
    </div>
  );
}

/* ============================================================
   SHIPPING STEP
   ============================================================ */

function ShippingStep({
  data,
  shippingRates,
  subtotal,
  ratesLoading,
  onChange,
}: {
  data: CheckoutData;
  shippingRates: ShippingRate[];
  subtotal: number;
  ratesLoading: boolean;
  onChange: (field: string, value: string | boolean) => void;
}) {
  const availableRates = shippingRates.filter(
    (rate) =>
      (!rate.minOrderAmount || subtotal >= rate.minOrderAmount) &&
      (!rate.maxOrderAmount || subtotal <= rate.maxOrderAmount),
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-xl font-semibold text-neutral-600 mb-4">
          Shipping Method
        </h2>

        {ratesLoading ? (
          <div className="flex items-center gap-2 text-sm text-neutral-400">
            <Loader2 size={16} className="animate-spin" />
            Calculating shipping rates...
          </div>
        ) : (
          <div className="space-y-3">
            {availableRates.length === 0 ? (
              <p className="text-neutral-400">
                No shipping methods available for your location.
              </p>
            ) : (
              availableRates.map((rate) => (
                <label
                  key={rate.name}
                  className={`flex items-center justify-between p-4 border cursor-pointer transition-colors ${
                    data.shippingMethod === rate.name
                      ? "border-primary-400 bg-primary-50"
                      : "border-neutral-200 hover:border-neutral-300"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="shippingMethod"
                      value={rate.name}
                      checked={data.shippingMethod === rate.name}
                      onChange={(event) =>
                        onChange("shippingMethod", event.target.value)
                      }
                      className="w-4 h-4 text-primary-500"
                    />

                    <div>
                      <p className="font-medium text-neutral-600">
                        {rate.name}
                      </p>

                      <p className="text-sm text-neutral-400">
                        {rate.description ||
                          `${rate.estimatedDaysMin}-${rate.estimatedDaysMax} business days`}
                      </p>
                    </div>
                  </div>

                  <span className="font-medium text-neutral-600">
                    {rate.price === 0 ? "Free" : formatPrice(rate.price)}
                  </span>
                </label>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   PAYMENT STEP
   ============================================================ */

function PaymentStep({
  data,
  cardReady,
  squareConfig,
  onChange,
  applePayAvailable,
  googlePayAvailable,
  onApplePay,
  cardContainerRef,
  googlePayContainerRef,
  anyWalletAvailable,
}: {
  data: CheckoutData;
  cardReady: boolean;
  squareConfig: SquareConfig | null;
  onChange: (
    field: string,
    value: string | boolean,
    addressType?: "shippingAddress" | "billingAddress",
  ) => void;
  applePayAvailable: boolean;
  googlePayAvailable: boolean;
  onApplePay: () => void;
  cardContainerRef: (node: HTMLDivElement | null) => void;
  googlePayContainerRef: (node: HTMLDivElement | null) => void;
  anyWalletAvailable: boolean;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-xl font-semibold text-neutral-600 mb-4">
          Payment
        </h2>

        {!squareConfig ? (
          <div className="p-4 bg-yellow-50 border border-yellow-200 text-sm text-yellow-700">
            Payment system is not configured. Please contact support.
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-neutral-500">
              All transactions are secure and encrypted.
            </p>

            {/* WALLET AREA */}
            <div className={anyWalletAvailable ? "space-y-3" : "hidden"}>
              {applePayAvailable && (
                <button
                  type="button"
                  onClick={onApplePay}
                  className="w-full py-3.5 bg-black text-white font-sans text-sm font-medium flex items-center justify-center gap-2 hover:bg-neutral-800 transition-colors"
                >
                  <svg
                    width="16"
                    height="20"
                    viewBox="0 0 17 21"
                    fill="white"
                    aria-hidden="true"
                  >
                    <path d="M13.307 11.17c-.02-2.157 1.762-3.196 1.842-3.246-.999-1.465-2.563-1.665-3.117-1.688-1.33-.136-2.598.786-3.274.786-.672 0-1.71-.768-2.813-.746-1.448.02-2.782.843-3.527 2.141-1.502 2.61-.384 6.479 1.08 8.6.716 1.037 1.567 2.2 2.688 2.159 1.079-.043 1.486-.699 2.79-.699 1.307 0 1.672.699 2.81.676 1.16-.02 1.893-1.056 2.604-2.098.82-1.204 1.158-2.37 1.176-2.432-.025-.01-2.257-.866-2.279-3.433z" />
                    <path d="M11.148 4.344c.595-.722 .997-1.726.887-2.727-.858.035-1.896.572-2.512 1.292-.554.641-1.038 1.663-.908 2.644.957.075 1.933-.487 2.533-1.209z" />
                  </svg>
                  Pay
                </button>
              )}

              {/* IMPORTANT:
                  Never conditionally remove this DOM node after
                  Square has initialized Google Pay. */}
              <div
                id="google-pay-container"
                ref={googlePayContainerRef}
                className="w-full min-h-12"
              />

              <div className="flex items-center gap-4">
                <div className="flex-1 h-px bg-neutral-200" />

                <span className="text-[10px] font-sans uppercase tracking-widest text-neutral-400">
                  or pay with card
                </span>

                <div className="flex-1 h-px bg-neutral-200" />
              </div>
            </div>

            {/* CARD */}
            <div className="border border-neutral-200 p-4 bg-white">
              <div
                id="card-container"
                ref={cardContainerRef}
                className="min-h-[100px]"
              >
                {!cardReady && (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
                  </div>
                )}
              </div>
            </div>

            {squareConfig.environment === "sandbox" && (
              <p className="text-xs text-neutral-400">
                Test mode: Use card 4532 0123 4567 8901, any future expiry, any
                CVV.
              </p>
            )}
          </div>
        )}
      </div>

      {/* BILLING */}
      <div>
        <h2 className="font-serif text-xl font-semibold text-neutral-600 mb-4">
          Billing Address
        </h2>

        <label className="flex items-center gap-2 mb-4 cursor-pointer">
          <input
            type="checkbox"
            checked={data.sameAsShipping}
            onChange={(event) =>
              onChange("sameAsShipping", event.target.checked)
            }
            className="w-4 h-4 text-primary-500"
          />

          <span className="text-sm text-neutral-600">
            Same as shipping address
          </span>
        </label>

        {!data.sameAsShipping && (
          <AddressForm
            address={data.billingAddress}
            onChange={(field, value) =>
              onChange(field, value, "billingAddress")
            }
          />
        )}
      </div>

      {/* NOTES */}
      <div>
        <label className="block text-sm font-medium text-neutral-600 mb-1">
          Order notes (optional)
        </label>

        <textarea
          value={data.notes}
          onChange={(event) => onChange("notes", event.target.value)}
          rows={3}
          className="w-full px-4 py-3 border border-neutral-200 focus:outline-none focus:border-primary-400 resize-none"
          placeholder="Special instructions for your order"
        />
      </div>
    </div>
  );
}

/* ============================================================
   ADDRESS FORM
   ============================================================ */

function AddressForm({
  address,
  onChange,
}: {
  address: CheckoutData["shippingAddress"];
  onChange: (field: string, value: string) => void;
}) {
  const inputCls =
    "w-full px-0 py-3 border-0 border-b border-neutral-200 text-neutral-600 font-sans text-sm focus:outline-none focus:border-neutral-600 transition-colors bg-transparent";

  const labelCls =
    "block text-[10px] font-sans font-semibold uppercase tracking-[0.12em] text-neutral-400 mb-1";

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>First name</label>

          <input
            type="text"
            value={address.firstName}
            onChange={(event) => onChange("firstName", event.target.value)}
            className={inputCls}
            required
          />
        </div>

        <div>
          <label className={labelCls}>Last name</label>

          <input
            type="text"
            value={address.lastName}
            onChange={(event) => onChange("lastName", event.target.value)}
            className={inputCls}
            required
          />
        </div>
      </div>

      <div>
        <label className={labelCls}>Address</label>

        <input
          type="text"
          value={address.address1}
          onChange={(event) => onChange("address1", event.target.value)}
          className={inputCls}
          required
          placeholder="Street address"
        />
      </div>

      <div>
        <label className={labelCls}>Apt / Suite (optional)</label>

        <input
          type="text"
          value={address.address2}
          onChange={(event) => onChange("address2", event.target.value)}
          className={inputCls}
        />
      </div>

      <CountryStateCitySelect
        country={address.country}
        state={address.state}
        city={address.city}
        onCountryChange={(code) => onChange("country", code)}
        onStateChange={(code) => onChange("state", code)}
        onCityChange={(name) => onChange("city", name)}
        inputClassName={inputCls}
        labelClassName={labelCls}
      />

      <div>
        <label className={labelCls}>Postal / ZIP code</label>

        <input
          type="text"
          value={address.postalCode}
          onChange={(event) => onChange("postalCode", event.target.value)}
          className={inputCls}
          required
        />
      </div>
    </div>
  );
}
