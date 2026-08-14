import ReactMarkdown from "react-markdown";

import privacyPolicy from "@/assets/legal/privacy-policy.md";
import termsOfService from "@/assets/legal/terms-of-service.md";
import shippingInfo from "@/assets/legal/shipping-info.md";
import Link from "next/link";

interface LegalPageProps {
  type: "privacy" | "terms" | "shipping";
}

const contentMap = {
  privacy: privacyPolicy,
  terms: termsOfService,
  shipping: shippingInfo,
};

const LegalPage: React.FC<LegalPageProps> = ({ type }) => {
  const content = contentMap[type];

  return (
    <section className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-12 py-14 mt-20 sm:mt-10">
      <article className="max-w-none">
        <ReactMarkdown
          components={{
            h1: ({ children }) => (
              <h1 className="text-3xl font-light tracking-tight mt-12 mb-6 first:mt-0">
                {children}
              </h1>
            ),

            h2: ({ children }) => (
              <h2 className="text-2xl font-light tracking-tight mt-10 mb-4 pb-2 border-b border-gray-100">
                {children}
              </h2>
            ),

            h3: ({ children }) => (
              <h3 className="text-xl font-normal mt-8 mb-3">{children}</h3>
            ),

            p: ({ children }) => (
              <p className="text-gray-700 leading-relaxed mb-4">{children}</p>
            ),

            ul: ({ children }) => (
              <ul className="space-y-2 mb-6 ml-6">{children}</ul>
            ),

            ol: ({ children }) => (
              <ol className="space-y-2 mb-6 ml-6 list-decimal">{children}</ol>
            ),

            li: ({ children }) => (
              <li className="text-gray-700 leading-relaxed pl-2">{children}</li>
            ),

            a: ({ href, children }) => (
              <a
                href={href}
                className="text-black underline hover:text-gray-600 transition-colors"
                target={href?.startsWith("http") ? "_blank" : undefined}
                rel={
                  href?.startsWith("http") ? "noopener noreferrer" : undefined
                }
              >
                {children}
              </a>
            ),

            strong: ({ children }) => (
              <strong className="font-medium text-gray-900">{children}</strong>
            ),

            hr: () => <hr className="my-8 border-t border-gray-200" />,

            blockquote: ({ children }) => (
              <blockquote className="border-l-4 border-gray-300 pl-4 my-6 italic text-gray-600">
                {children}
              </blockquote>
            ),

            code: ({ children }) => (
              <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono text-gray-800">
                {children}
              </code>
            ),
          }}
        >
          {content}
        </ReactMarkdown>
      </article>

      <div className="mt-16 pt-8 border-t border-gray-200 text-center">
        <p className="text-sm text-gray-600 mb-8">
          Have questions about our{" "}
          {type === "privacy"
            ? "privacy practices"
            : type === "terms"
              ? "terms"
              : "shipping and returns"}
          ?
        </p>

        <Link
          href="/contact"
          className="items-center gap-2 px-8 py-3 bg-primary-400 text-white font-sans font-semibold  hover:bg-primary-500 transition-colors"
        >
          Contact Us
        </Link>
      </div>
    </section>
  );
};

export default LegalPage;
