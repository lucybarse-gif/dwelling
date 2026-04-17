"use client";

import Link from "next/link";
import { useState } from "react";

interface NavbarProps {
  userEmail?: string | null;
}

export default function Navbar({ userEmail }: NavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="bg-white border-b border-stone-200 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 font-semibold text-stone-900 text-lg">
            <span className="text-brand-600 text-2xl">⌂</span>
            <span>Dwelling</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden sm:flex items-center gap-6">
            <Link
              href="/buildings"
              className="text-sm text-stone-600 hover:text-stone-900 transition-colors"
            >
              Search Buildings
            </Link>
            {userEmail ? (
              <>
                <span className="text-sm text-stone-500 max-w-[160px] truncate">{userEmail}</span>
                <form action="/auth/signout" method="POST">
                  <button
                    type="submit"
                    className="text-sm text-stone-600 hover:text-stone-900 transition-colors"
                  >
                    Sign Out
                  </button>
                </form>
                <Link
                  href="/buildings"
                  className="text-sm bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 transition-colors"
                >
                  Write a Review
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/auth/login"
                  className="text-sm text-stone-600 hover:text-stone-900 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/auth/signup"
                  className="text-sm bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 transition-colors"
                >
                  Write a Review
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            className="sm:hidden p-2 text-stone-600"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            <div className="w-5 h-0.5 bg-current mb-1" />
            <div className="w-5 h-0.5 bg-current mb-1" />
            <div className="w-5 h-0.5 bg-current" />
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="sm:hidden border-t border-stone-100 py-4 flex flex-col gap-3">
            <Link href="/buildings" className="text-sm text-stone-700 py-1">Search Buildings</Link>
            {userEmail ? (
              <>
                <span className="text-sm text-stone-500 py-1 truncate">{userEmail}</span>
                <form action="/auth/signout" method="POST">
                  <button type="submit" className="text-sm text-stone-700 py-1">Sign Out</button>
                </form>
                <Link href="/buildings" className="text-sm bg-brand-600 text-white px-4 py-2 rounded-lg text-center">
                  Write a Review
                </Link>
              </>
            ) : (
              <>
                <Link href="/auth/login" className="text-sm text-stone-700 py-1">Sign In</Link>
                <Link href="/auth/signup" className="text-sm bg-brand-600 text-white px-4 py-2 rounded-lg text-center">
                  Write a Review
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
