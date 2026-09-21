"use client";

import { Fragment } from "react";
import { usePathname } from "next/navigation";

// The admin area brings its own sidebar shell, so the public header, footer
// and content width constraints only apply outside of it (login included).
export function SiteChrome({
  header,
  footer,
  children,
}: {
  header: React.ReactNode;
  footer: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const inAdminShell =
    /^\/(pt|en)\/admin(\/|$)/.test(pathname) &&
    !/^\/(pt|en)\/admin\/login\/?$/.test(pathname);

  if (inAdminShell) return <>{children}</>;

  return (
    <>
      <Fragment key="header">{header}</Fragment>
      <main key="main" className="flex-1 w-full max-w-5xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
      <Fragment key="footer">{footer}</Fragment>
    </>
  );
}
