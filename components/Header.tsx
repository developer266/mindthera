import React from "react";
import "bootstrap-icons/font/bootstrap-icons.css";
import Link from "next/link";
import Logo from "./Logo";
import HeaderClient from "./HeaderClient";

type NavItem = { label: string; href: string; id?: string };

// Server-side function to fetch navigation items
async function getNavItems(): Promise<NavItem[]> {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
    if (!apiUrl) {
      console.warn('NEXT_PUBLIC_API_BASE_URL not found, returning empty navigation');
      return [];
    }

    const res = await fetch(
      `${apiUrl}/api/globals/header?depth=2&draft=false&locale=undefined&trash=false`,
      { 
        cache: "force-cache",
        next: { revalidate: 3600 } // Revalidate every hour for better performance
      }
    );
    
    if (!res.ok) {
      console.error(`Failed to fetch nav items: HTTP ${res.status}`);
      return [];
    }
    
    const data = await res.json();
    const rawItems: any[] = data?.navItems ?? (Array.isArray(data) ? data : []);

    const toPathFromSlug = (slug?: string) => {
      if (!slug) return "/";
      const clean = String(slug).trim().replace(/^\/+/, "");
      if (!clean || clean === "/" || clean.toLowerCase() === "home") return "/";
      return `/${clean}`;
    };

    const normalized: NavItem[] = rawItems
      .map((ni: any): NavItem => {
        const id = ni?.id;
        const label: string = ni?.label || ni?.link?.label || ni?.title || "Item";
        const lowerLabel = String(label).toLowerCase();

        // Resolve href from link field
        const link = ni?.link;
        let href: string | undefined;
        if (link?.type === "reference") {
          const refValue = link?.value || link?.doc || link?.reference?.value;
          const slug = refValue?.slug || refValue?.path || refValue?.url || refValue?.pathname;
          href = toPathFromSlug(slug);
        } else if (link?.url) {
          href = link.url;
        } else if (ni?.url || ni?.path || ni?.href) {
          href = ni?.href || ni?.url || ni?.path;
        }

        if (!href) href = "/";

        return { id, label, href };
      })
      .filter((i) => Boolean(i?.href && i?.label));

    return normalized;
  } catch (err: any) {
    console.error("Menu load failed:", err);
    return [];
  }
}

export default async function Header() {
  const navItems = await getNavItems();

  return (
    <header className="transparent scroll-light has-topbar header-s1">
      <div className="container">
        <div className="row">
          <div className="col-md-12">
            <div className="de-flex sm-pt10 pt-2 pb-2">
              <div className="de-flex-col">
                <div id="logo">
                  <Logo />
                </div>
              </div>

              <HeaderClient navItems={navItems} />

              <div className="de-flex-col mob-order-2">
                <div className="menu_side_area">
                  <HeaderClient navItems={navItems} bookingButtonOnly />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
