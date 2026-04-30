import React from "react";
import DocsHeading from "../components/ui/docs-heading";
import DocsText from "../components/ui/docs-text";
import DocsContainer from "../components/ui/docs-container";
import DocsCodeBlock from "../components/ui/docs-code-block";
import DocsList from "../components/ui/docs-list";
import DocsCallout from "../components/ui/docs-callout";
import DocsHighlight from "../components/ui/docs-highlight";

const WebhooksPage = () => {
  return (
    <DocsContainer>
      <DocsHeading level={1}>Webhooks</DocsHeading>
      <DocsText>
        Webhooks allow you to build real-time integrations that subscribe to
        events on your PaperDB databases. When an event is triggered, PaperDB
        sends an HTTP POST payload to the webhook URL.
      </DocsText>

      <DocsHeading level={2} className="mt-8">
        Creating a Webhook
      </DocsHeading>
      <DocsText>
        You can create a webhook by sending a POST request to the
        <DocsHighlight>/webhooks</DocsHighlight> endpoint.
      </DocsText>
      <DocsCodeBlock language="bash">
        {`curl -X POST https://api.paperdb.dev/webhooks \\
  -H "Authorization: Bearer your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "url": "https://your-server.com/webhook",
    "events": ["document.created", "document.updated"],
    "collections": ["users", "orders"],
    "description": "My first webhook"
  }'`}
      </DocsCodeBlock>

      <DocsHeading level={3} className="mt-8">
        Supported Events
      </DocsHeading>
      <DocsList>
        <li>
          <DocsHighlight>document.created</DocsHighlight> - Triggered when a new
          document is inserted.
        </li>
        <li>
          <DocsHighlight>document.updated</DocsHighlight> - Triggered when an
          existing document is updated.
        </li>
        <li>
          <DocsHighlight>document.deleted</DocsHighlight> - Triggered when a
          document is deleted.
        </li>
        <li>
          <DocsHighlight>*</DocsHighlight> - Wildcard, triggers on all supported
          events.
        </li>
      </DocsList>

      <DocsHeading level={2} className="mt-8">
        Securing Webhooks
      </DocsHeading>
      <DocsText>
        When you create a webhook, PaperDB generates a unique
        <DocsHighlight>secret</DocsHighlight>. Use this secret to verify the
        signature in your server and confirm the request came from PaperDB.
      </DocsText>

      <DocsCallout type="info">
        <DocsText className="mb-0">
          Every webhook request includes a<code>PaperDB-Signature</code> header.
          It is an HMAC SHA-256 hash of the request payload using your webhook
          secret.
        </DocsText>
      </DocsCallout>

      <DocsHeading level={2} className="mt-8">
        Delivery & Retries
      </DocsHeading>
      <DocsText>
        Webhook deliveries are queued and processed asynchronously. If your
        server responds with a 4xx/5xx status code or times out, PaperDB retries
        delivery with exponential backoff.
      </DocsText>
    </DocsContainer>
  );
};

export default WebhooksPage;
