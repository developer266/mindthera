"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import BookingWidgetModal from "./BookingWidgetModal";
import { usePathname } from "next/navigation";

type NavItem = { label: string; href: string; id?: string };

interface HeaderClientProps {
  navItems: NavItem[];
  bookingButtonOnly?: boolean;
}

export default function HeaderClient({ navItems, bookingButtonOnly }: HeaderClientProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);
  const pathname = usePathname();

  // Close menu automatically on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const handleLinkClick = () => {
    if (typeof window !== "undefined" && window.innerWidth <= 992) {
      setMenuOpen(false);
    }
  };

  // If this is only for the booking button
  if (bookingButtonOnly) {
    return (
      <>
        <button
          type="button"
          className="btn-main d-xl-block"
          onClick={() => setBookingOpen(true)}
        >
          Buche hier deinen Termin
        </button>
        <BookingWidgetModal open={bookingOpen} onClose={() => setBookingOpen(false)} />
      </>
    );
  }

  // Main navigation menu
  return (
    <>
      <div className="de-flex-col header-col-mid position-relative mob-order-3">
        <ul
          id="mainmenu"
          style={{
            display:
              typeof window !== "undefined" && window.innerWidth <= 992
                ? menuOpen
                  ? "block"
                  : "none"
                : undefined,
          }}
        >
          {navItems.map((item) => (
            <li key={item.id || item.href}>
              <Link className="menu-item" href={item.href} onClick={handleLinkClick}>
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
        <span
          id="menu-btn"
          onClick={() => setMenuOpen((open) => !open)}
          aria-label="Menü öffnen/schließen"
        >
          <i className="bi bi-list"></i>
        </span>
      </div>
    </>
  );
}