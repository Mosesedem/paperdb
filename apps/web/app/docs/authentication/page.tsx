import React from "react";
import DocsContainer from "../components/ui/docs-container";
import DocsHeading from "../components/ui/docs-heading";
import DocsText from "../components/ui/docs-text";
import DocsCodeBlock from "../components/ui/docs-code-block";
import DocsCallout from "../components/ui/docs-callout";
import DocsList from "../components/ui/docs-list";

const Authentication = () => {
  return (
    <DocsContainer>
      <DocsHeading level={1}>Authentication</DocsHeading>
      <DocsText>
        All requests to PaperDB are scoped to a specific database. You
        authenticate with an API key tied to that database.
      </DocsText>
      <DocsCallout type="warning">
        <DocsText className="mb-0">
          <strong>Keep your API keys secret!</strong> Never expose them in
          client-side code or public repositories.
        </DocsText>
      </DocsCallout>
      <DocsHeading level={2}>Getting your API key</DocsHeading>
      <DocsText>
        You can generate and manage API keys from your PaperDB dashboard. Go to{" "}
        <strong>Dashboard &gt; Databases &gt; API Keys</strong> to create a new
        key or view existing ones.
      </DocsText>
      <DocsCallout type="info">
        <DocsText className="mb-0">
          <strong>Server status:</strong> Email/password sign-up/sign-in and
          OAuth (Google, GitHub) routes are implemented. Passwordless
          (magic-link) and password-reset flows are planned but not yet
          available server-side — the SDK surfaces for those are experimental.
        </DocsText>
      </DocsCallout>
      <DocsHeading level={2}>Auth API routes</DocsHeading>
      <DocsText>The API exposes canonical auth endpoints (examples):</DocsText>
      <DocsList>
        <li>POST /auth/sign-up</li>
        <li>POST /auth/sign-in</li>
        <li>POST /auth/sign-out</li>
        <li>GET /auth/me</li>
        <li>PATCH /auth/me</li>
        <li>POST /auth/change-password</li>
        <li>GET /auth/oauth/:provider</li>
        <li>GET /auth/oauth/:provider/callback</li>
      </DocsList>
      <DocsHeading level={2}>Using your API key in the SDK</DocsHeading>
      <DocsText>
        Pass your API key to the SDK when creating your client:
      </DocsText>
      <DocsCodeBlock>{`import { createClient } from "paperdb";
      
const db = createClient({
  apiKey: "api_key",
  schema: { /* ... */ },
});`}</DocsCodeBlock>
      <DocsText>
        All requests made with this client will be authenticated using your API
        key.
      </DocsText>
    </DocsContainer>
  );
};

export default Authentication;
