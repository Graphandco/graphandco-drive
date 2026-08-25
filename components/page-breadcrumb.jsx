import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

const titles = {
  "/": "Drive",
  "/sixmyk": "6-MyK",
  "/regis": "Régis",
  "/public": "Public",
  "/trash": "Corbeille",
  "/tags": "Tags",
  "/recent": "Fichiers récents",
  "/orphans": "Sans dossier",
  "/untagged": "Sans tags",
  "/duplicates": "Doublons",
  "/settings": "Paramètres",
};

function buildCrumbs(pathname) {
  if (pathname === "/") {
    return [{ href: "/", label: titles["/"] }];
  }

  const segments = pathname.split("/").filter(Boolean);
  const crumbs = [];
  let href = "";

  for (const segment of segments) {
    href += `/${segment}`;
    crumbs.push({
      href,
      label: titles[href] || segment,
    });
  }

  return crumbs;
}

export function PageBreadcrumb({ pathname, className }) {
  const crumbs = buildCrumbs(pathname);

  return (
    <Breadcrumb className={className}>
      <BreadcrumbList>
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1;

          return (
            <span key={crumb.href} className="contents">
              {index > 0 && <BreadcrumbSeparator />}
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink href={crumb.href}>{crumb.label}</BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </span>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
