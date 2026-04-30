import React from "react";
import DocsContainer from "./components/ui/docs-container";
import DocsHeading from "./components/ui/docs-heading";
import DocsText from "./components/ui/docs-text";
import DocsCard from "./components/ui/docs-card";
import DocsLink from "./components/ui/docs-link";
import DocsList from "./components/ui/docs-list";
import DocsQuote from "./components/ui/docs-quote";
import DocsHighlight from "./components/ui/docs-highlight";

const sections = [
  {
    group: "Getting Started",
    items: [
      { name: "How it works", href: "/docs/how-it-works" },
      { name: "Installation", href: "/docs/installation" },
    ],
  },
  {
    group: "SDK",
    items: [
      { name: "Authentication", href: "/docs/authentication" },
      { name: "API Reference", href: "/docs/api-reference" },
    ],
  },
  {
    group: "Core Concepts",
    items: [
      { name: "Databases", href: "/docs/databases" },
      { name: "Collections", href: "/docs/collections" },
      { name: "Documents", href: "/docs/documents" },
    ],
  },
  {
    group: "Database Operations",
    items: [
      { name: "Create", href: "/docs/create" },
      { name: "Read", href: "/docs/read" },
      { name: "Update", href: "/docs/update" },
      { name: "Delete", href: "/docs/delete" },
      { name: "Aggregation", href: "/docs/aggregation" },
    ],
  },
  {
    group: "Platform Features",
    items: [
      { name: "Webhooks", href: "/docs/webhooks" },
      { name: "Realtime", href: "/docs/realtime" },
      { name: "Cron Jobs", href: "/docs/cron" },
      { name: "Storage", href: "/docs/storage" },
    ],
  },
];

const statusItems = [
  "Auth, CRUD, bulk/count, schema, webhooks, cron, realtime, and dashboard APIs are documented and working.",
  "Storage is available for metadata and upload flows; object storage integration is still the gating item for full parity.",
  "Search, magic-link auth, password reset, and offline sync should be treated as future work until the backend contract lands.",
];

const Docs = () => {
  return (
    <DocsContainer>
      <div className="space-y-6">
        <div className="space-y-3">
          <DocsText className="uppercase tracking-[0.2em] text-xs text-gray-500">
            PaperDB docs
          </DocsText>
          <DocsHeading level={1}>
            Build against the verified V1 contract.
          </DocsHeading>
          <DocsText>
            PaperDB is a schema-guided backend platform for teams that want a
            modern control plane without inventing one from scratch. The docs in
            this section describe the routes, SDK methods, and operational
            expectations that are actually available today.
          </DocsText>
        </div>

        <DocsCard className="border-gray-700/60 bg-white/5">
          <DocsHeading level={2}>Current platform shape</DocsHeading>
          <DocsList>
            {statusItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </DocsList>
          <DocsQuote>
            The safest way to use PaperDB is to treat the OpenAPI document and
            the SDK README as the current truth, then use this landing page as
            the map.
          </DocsQuote>
        </DocsCard>

        <div className="grid gap-4 md:grid-cols-2">
          {sections.map((section) => (
            <DocsCard key={section.group} className="h-full">
              <DocsHeading level={3}>{section.group}</DocsHeading>
              <div className="mt-4 flex flex-col gap-3">
                {section.items.map((item) => (
                  <DocsLink
                    key={item.href}
                    href={item.href}
                    className="text-base"
                  >
                    {item.name}
                  </DocsLink>
                ))}
              </div>
            </DocsCard>
          ))}
        </div>

        <DocsCard>
          <DocsHeading level={2}>Recommended reading order</DocsHeading>
          <DocsList>
            <li>
              Start with <DocsHighlight>How it works</DocsHighlight> to learn
              the service layout.
            </li>
            <li>
              Move to <DocsHighlight>Installation</DocsHighlight> and
              <DocsHighlight>Authentication</DocsHighlight> for the first
              working client flow.
            </li>
            <li>
              Use the operation pages for CRUD, storage, webhooks, cron, and
              realtime once you are wiring an app.
            </li>
          </DocsList>
        </DocsCard>
      </div>
    </DocsContainer>
  );
};

export default Docs;
