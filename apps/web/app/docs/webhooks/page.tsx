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
        Webhooks allow you to build real-time integrations that subscribe to events on your PaperDB databases. When one of those events is triggered, PaperDB sends a HTTP POST payload to the webhook's configured URL.
      </DocsText>

      <DocsHeading level={2} className="mt-8">
        Creating a Webhook
      </DocsHeading>
      <DocsText>
        You can create a webhook by sending a POST request to the <DocsHighlight>/webhooks</DocsHighlight> endpoint.
      </DocsText>
      
      <DocsCodeBlock
        language="bash"
        code={`curl -X POST https://api.paperdb.dev/webhooks \\
  -H "X-API-Key: your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "url": "https://your-server.com/webhook",
    "events": ["document.created", "document.updated"],
    "collections": ["users", "orders"],
    "description": "My first webhook"
  }'`}
      />

      <DocsHeading level={3} className="mt-8">
        Supported Events
      </DocsHeading>
      <DocsList>
        <li><DocsHighlight>document.created</DocsHighlight> - Triggered when a new document is inserted.</li>
        <li><DocsHighlight>document.updated</DocsHighlight> - Triggered when an existing document is updated.</li>
        <li><DocsHighlight>document.deleted</DocsHighlight> - Triggered when a document is deleted.</li>
        <li><DocsHighlight>*</DocsHighlight> - Wildcard, triggers on all supported events.</li>
      </DocsList>

      <DocsHeading level={2} className="mt-8">
        Securing Webhooks
      </DocsHeading>
      <DocsText>
        When you create a webhook, PaperDB generates a unique <DocsHighlight>secret</DocsHighlight>. We use this secret to sign the webhook payload. You should verify this signature in your server to ensure the request is actually coming from PaperDB.
      </DocsText>

      <DocsCallout type="info" title="Signature Verification">
        Every webhook request from PaperDB includes a <code>PaperDB-Signature</code> header. It is an HMAC SHA-256 hash of the request payload using your webhook secret.
      </DocsCallout>

      <DocsHeading level={2} className="mt-8">
        Delivery & Retries
      </DocsHeading>
      <DocsText>
        Webhook deliveries are queued and processed asynchronously. If your server responds with a 4xx or 5xx status code, or times out, PaperDB will automatically retry the delivery with exponential backoff up to 5 times.
      </DocsText>

    </DocsContainer>
  );
};

export default WebhooksPage;
