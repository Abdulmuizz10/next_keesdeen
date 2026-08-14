"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Search,
  ShoppingBag,
  Heart,
  User,
  Menu,
  X,
  Shield,
  LogOut,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useUIStore } from "@/store/ui";
import { useCartStore } from "@/store/cartStore";
import Image from "next/image";
import { mainLogo, mainLogoWhite } from "@/assets";

const ADMIN_ROLES = ["super_admin", "staff", "support"];

export function SiteHeader() {
  const { data: session } = useSession();
  const { setSearchOverlayOpen } = useUIStore();
  const { setCartDrawerOpen, lines } = useCartStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  // const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  // const accountRef = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(false);

  const pathname = usePathname();
  const isHomePage = pathname === "/";

  const cartCount = lines.reduce((sum, l) => sum + l.quantity, 0);
  const isAdmin =
    session?.user?.role && ADMIN_ROLES.includes(session.user.role);

  // Close account dropdown on click outside
  // useEffect(() => {
  //   const handle = (e: MouseEvent) => {
  //     if (accountRef.current && !accountRef.current.contains(e.target as Node))
  //       setAccountMenuOpen(false);
  //   };
  //   document.addEventListener("mousedown", handle);
  //   return () => document.removeEventListener("mousedown", handle);
  // }, []);

  const navLinks = [
    { label: "Shop", href: "/shop" },
    { label: "Active Wears", href: "/category/active-wears" },
    { label: "Fitness Accessories", href: "/category/fitness-accessories" },
  ];

  // Track scroll position. On the homepage the header starts transparent and
  // switches to a solid white bar once the page has scrolled at all; every
  // other route is always solid white.
  useEffect(() => {
    if (!isHomePage) return;
    const handleScroll = () => setScrolled(window.scrollY > 0);
    handleScroll();
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isHomePage]);

  // Transparent only while on the homepage and still at the very top.
  // Every other route — and the homepage once scrolled — renders a solid
  // white bar, so the logo needs to switch alongside it: white logo over
  // the transparent hero, dark logo once there's a white background behind
  // it (scrolled home, or any non-home route).
  const isTransparent = isHomePage && !scrolled;
  const logoSrc = isTransparent ? mainLogoWhite : mainLogo;
  const iconColor = isTransparent ? "text-white" : "text-neutral-500";
  const iconHover = isTransparent
    ? "hover:text-white/70"
    : "hover:text-neutral-600";
  const logoColor = isTransparent ? "text-white" : "text-neutral-600";
  const navLinkColor = isTransparent
    ? "text-white/80 hover:text-white"
    : "text-neutral-500 hover:text-neutral-600";

  return (
    <header
      className={`fixed top-0 inset-x-0 z-40 transition-colors duration-300 ${
        isTransparent
          ? "bg-[linear-gradient(to_bottom,rgba(0,0,0,0.5)_0%,rgba(0,0,0,0.2)_50%,transparent_100%)]"
          : "bg-white shadow-sm py-1"
      }`}
      style={{
        transition: "all 0.4s ease",
      }}
    >
      <div className="mx-auto max-w-[1400px] xl:max-w-[1600px] px-6 sm:px-8 lg:px-12 xl:px-4">
        <div className="flex items-center justify-between h-14 sm:h-16">
          {/* Left: Mobile Menu + Nav */}
          <div className="flex items-center gap-6">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={`lg:hidden p-1 transition-colors ${iconColor} ${iconHover}`}
              aria-label="Menu"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <nav className="hidden lg:flex items-center gap-8">
              {navLinks.map((link) => (
                <Link
                  key={link.href + link.label}
                  href={link.href}
                  className={`text-[11px] font-sans font-medium uppercase tracking-widest transition-colors ${navLinkColor}`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Center: Logo */}
          <Link href="/" className="absolute left-1/2 -translate-x-1/2">
            {/* <h1
              className={`font-serif text-xl sm:text-2xl font-light tracking-wide transition-colors ${logoColor}`}
            >
              Keesdeen
            </h1> */}
            <Image
              key={isTransparent ? "logo-white" : "logo-dark"}
              src={logoSrc}
              alt="Brand logo"
              width={100}
              height={100}
              className="w-[130px] h-auto lg:w-[140px] lg:h-8"
              priority
            />
          </Link>

          {/* Right: Icons */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setSearchOverlayOpen(true)}
              className={`p-2.5 transition-colors ${iconColor} ${iconHover}`}
              aria-label="Search"
            >
              <Search size={18} strokeWidth={1.5} />
            </button>

            {session?.user && (
              <Link
                href="/account/wishlist"
                className={`p-2.5 transition-colors hidden sm:block ${iconColor} ${iconHover}`}
                aria-label="Wishlist"
              >
                <Heart size={18} strokeWidth={1.5} />
              </Link>
            )}

            <Link
              href={session?.user ? "/account" : "/auth/login"}
              className={`p-2.5 transition-colors hidden sm:block ${iconColor} ${iconHover}`}
              aria-label="Account"
            >
              <User size={18} strokeWidth={1.5} />
            </Link>

            {isAdmin && (
              <Link
                href="/admin"
                className={`p-2.5 transition-colors hidden lg:block ${iconColor} ${iconHover}`}
                aria-label="Admin"
              >
                <Shield size={18} strokeWidth={1.5} />
              </Link>
            )}

            <button
              onClick={() => setCartDrawerOpen(true)}
              className={`relative p-2.5 transition-colors ${iconColor} ${iconHover}`}
              aria-label="Cart"
            >
              <ShoppingBag size={18} strokeWidth={1.5} />
              {cartCount > 0 && (
                <span
                  className={`absolute top-1 right-1 min-w-4 h-4 text-[9px] font-sans font-bold flex items-center justify-center transition-colors ${
                    isTransparent
                      ? "bg-white text-neutral-900"
                      : "bg-neutral-600 text-white"
                  }`}
                >
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu — full screen overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-white lg:hidden">
          {/* Overlay header */}
          <div className="flex items-center justify-between h-14 sm:h-16 px-6 sm:px-8 border-b sf-border">
            <h1 className="font-serif text-xl font-light tracking-wide text-neutral-600">
              Keesdeen
            </h1>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="p-1 text-neutral-500 hover:text-neutral-600 transition-colors"
              aria-label="Close menu"
            >
              <X size={22} />
            </button>
          </div>

          {/* Nav links */}
          <nav className="flex-1 overflow-y-auto px-6 py-6 space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.href + link.label}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="block px-0 py-4 text-sm font-sans font-medium text-neutral-500 uppercase tracking-widest hover:text-neutral-600 border-b sf-border transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Icon dock */}
          <div className="flex items-center justify-center gap-3 px-6 py-6 border-t sf-border">
            <button
              onClick={() => {
                setSearchOverlayOpen(true);
                setMobileMenuOpen(false);
              }}
              className="flex items-center justify-center w-12 h-12 rounded-full border sf-border text-neutral-500 hover:text-neutral-600 hover:border-neutral-400 transition-colors"
              aria-label="Search"
            >
              <Search size={18} strokeWidth={1.5} />
            </button>

            {session?.user && (
              <Link
                href="/account/wishlist"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center w-12 h-12 rounded-full border sf-border text-neutral-500 hover:text-neutral-600 hover:border-neutral-400 transition-colors"
                aria-label="Wishlist"
              >
                <Heart size={18} strokeWidth={1.5} />
              </Link>
            )}

            <Link
              href={session?.user ? "/account/orders" : "/auth/login"}
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-center w-12 h-12 rounded-full border sf-border text-neutral-500 hover:text-neutral-600 hover:border-neutral-400 transition-colors"
              aria-label="Account"
            >
              <User size={18} strokeWidth={1.5} />
            </Link>

            {isAdmin && (
              <Link
                href="/admin"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center w-12 h-12 rounded-full border sf-border text-neutral-500 hover:text-neutral-600 hover:border-neutral-400 transition-colors"
                aria-label="Admin"
              >
                <Shield size={18} strokeWidth={1.5} />
              </Link>
            )}

            <button
              onClick={() => {
                setCartDrawerOpen(true);
                setMobileMenuOpen(false);
              }}
              className="relative flex items-center justify-center w-12 h-12 rounded-full border sf-border text-neutral-500 hover:text-neutral-600 hover:border-neutral-400 transition-colors"
              aria-label="Cart"
            >
              <ShoppingBag size={18} strokeWidth={1.5} />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-4 h-4 rounded-full bg-neutral-600 text-white text-[9px] font-sans font-bold flex items-center justify-center px-1">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>
      )}
    </header>
  );
}

// <header className="sticky top-0 z-40 bg-white border-b sf-border">
//   <div className="mx-auto max-w-[1400px] px-6 sm:px-8 lg:px-12">
//     <div className="flex items-center justify-between h-14 sm:h-16">
//       {/* Left: Mobile Menu + Nav */}
//       <div className="flex items-center gap-6">
//         <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="lg:hidden p-1 text-neutral-500" aria-label="Menu">
//           {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
//         </button>
//         <nav className="hidden lg:flex items-center gap-8">
//           {navLinks.map((link) => (
//             <Link key={link.href + link.label} href={link.href}
//               className="text-[11px] font-sans font-medium text-neutral-500 uppercase tracking-[0.1em] hover:text-neutral-600 transition-colors">
//               {link.label}
//             </Link>
//           ))}
//         </nav>
//       </div>

//       {/* Center: Logo */}
//       <Link href="/" className="absolute left-1/2 -translate-x-1/2">
//         <h1 className="font-serif text-xl sm:text-2xl font-light tracking-wide text-neutral-600">Keesdeen</h1>
//       </Link>

//       {/* Right: Icons */}
//       <div className="flex items-center gap-1">
//         <button onClick={() => setSearchOverlayOpen(true)} className="p-2.5 text-neutral-500 hover:text-neutral-600 transition-colors" aria-label="Search">
//           <Search size={18} strokeWidth={1.5} />
//         </button>

//         {session?.user && (
//           <Link href="/account/wishlist" className="p-2.5 text-neutral-500 hover:text-neutral-600 transition-colors hidden sm:block" aria-label="Wishlist">
//             <Heart size={18} strokeWidth={1.5} />
//           </Link>
//         )}

//         {/* Admin shield — only rendered for admin roles, absent from DOM otherwise */}
//         {isAdmin && (
//           <Link href="/admin" className="p-2.5 text-primary-500 hover:text-primary-600 transition-colors hidden sm:block" aria-label="Admin" title="Admin Dashboard">
//             <Shield size={18} strokeWidth={1.5} />
//           </Link>
//         )}

//         {/* Account dropdown */}
//         <div className="relative hidden sm:block" ref={accountRef}>
//           <button
//             onClick={() => session?.user ? setAccountMenuOpen(!accountMenuOpen) : undefined}
//             className="p-2.5 text-neutral-500 hover:text-neutral-600 transition-colors"
//             aria-label="Account"
//           >
//             {session?.user ? (
//               <button onClick={() => setAccountMenuOpen(!accountMenuOpen)}>
//                 <User size={18} strokeWidth={1.5} />
//               </button>
//             ) : (
//               <Link href="/auth/login"><User size={18} strokeWidth={1.5} /></Link>
//             )}
//           </button>

//           {accountMenuOpen && session?.user && (
//             <div className="absolute right-0 mt-2 w-48 bg-white border sf-border z-50 py-2">
//               <div className="px-4 py-2 border-b sf-border">
//                 <p className="text-xs font-sans font-medium text-neutral-600 truncate">{session.user.name}</p>
//                 <p className="text-[10px] font-sans text-neutral-400 truncate">{session.user.email}</p>
//               </div>
//               <Link href="/account/orders" onClick={() => setAccountMenuOpen(false)}
//                 className="block px-4 py-2 text-xs font-sans text-neutral-500 hover:text-neutral-600 hover:bg-neutral-50 transition-colors">
//                 My Orders
//               </Link>
//               <Link href="/account/wishlist" onClick={() => setAccountMenuOpen(false)}
//                 className="block px-4 py-2 text-xs font-sans text-neutral-500 hover:text-neutral-600 hover:bg-neutral-50 transition-colors">
//                 Wishlist
//               </Link>
//               {isAdmin && (
//                 <Link href="/admin" onClick={() => setAccountMenuOpen(false)}
//                   className="block px-4 py-2 text-xs font-sans text-primary-500 hover:bg-neutral-50 transition-colors">
//                   Admin Dashboard
//                 </Link>
//               )}
//               <div className="border-t sf-border mt-1 pt-1">
//                 <button
//                   onClick={() => { setAccountMenuOpen(false); signOut({ callbackUrl: "/" }); }}
//                   className="flex items-center gap-2 w-full px-4 py-2 text-xs font-sans text-red-500 hover:bg-red-50 transition-colors"
//                 >
//                   <LogOut size={12} /> Sign Out
//                 </button>
//               </div>
//             </div>
//           )}
//         </div>

//         <button onClick={() => setCartDrawerOpen(true)} className="relative p-2.5 text-neutral-500 hover:text-neutral-600 transition-colors" aria-label="Cart">
//           <ShoppingBag size={18} strokeWidth={1.5} />
//           {cartCount > 0 && (
//             <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-neutral-600 text-white text-[9px] font-sans font-bold flex items-center justify-center">
//               {cartCount}
//             </span>
//           )}
//         </button>
//       </div>
//     </div>
//   </div>

//   {/* Mobile Menu */}
//   {mobileMenuOpen && (
//     <div className="lg:hidden border-t sf-border bg-white">
//       <nav className="px-6 py-6 space-y-0">
//         {navLinks.map((link) => (
//           <Link key={link.href + link.label} href={link.href} onClick={() => setMobileMenuOpen(false)}
//             className="block py-3 text-[11px] font-sans font-medium text-neutral-500 uppercase tracking-[0.1em] hover:text-neutral-600 border-b sf-border transition-colors">
//             {link.label}
//           </Link>
//         ))}
//         {session?.user && (
//           <>
//             <Link href="/account/orders" onClick={() => setMobileMenuOpen(false)}
//               className="block py-3 text-[11px] font-sans font-medium text-neutral-500 uppercase tracking-[0.1em] hover:text-neutral-600 border-b sf-border">
//               My Orders
//             </Link>
//             <Link href="/account/wishlist" onClick={() => setMobileMenuOpen(false)}
//               className="block py-3 text-[11px] font-sans font-medium text-neutral-500 uppercase tracking-[0.1em] hover:text-neutral-600 border-b sf-border">
//               Wishlist
//             </Link>
//             {isAdmin && (
//               <Link href="/admin" onClick={() => setMobileMenuOpen(false)}
//                 className="block py-3 text-[11px] font-sans font-medium text-primary-500 uppercase tracking-[0.1em] border-b sf-border">
//                 Admin
//               </Link>
//             )}
//             <button
//               onClick={() => { setMobileMenuOpen(false); signOut({ callbackUrl: "/" }); }}
//               className="block w-full text-left py-3 text-[11px] font-sans font-medium text-red-500 uppercase tracking-[0.1em]"
//             >
//               Sign Out
//             </button>
//           </>
//         )}
//         {!session?.user && (
//           <Link href="/auth/login" onClick={() => setMobileMenuOpen(false)}
//             className="block py-3 text-[11px] font-sans font-medium text-neutral-500 uppercase tracking-[0.1em] hover:text-neutral-600">
//             Sign In
//           </Link>
//         )}
//       </nav>
//     </div>
//   )}
// </header>
