import React from "react";
import DocsHeading from "../components/ui/docs-heading";
import DocsText from "../components/ui/docs-text";
import DocsContainer from "../components/ui/docs-container";
import DocsCodeBlock from "../components/ui/docs-code-block";
import DocsCallout from "../components/ui/docs-callout";

const RealtimePage = () => {
  return (
    <DocsContainer>
      <DocsHeading level={1}>Realtime Subscriptions</DocsHeading>
      <DocsText>
        PaperDB lets you listen to database changes in real time over
        WebSockets. When a document is created, updated, or deleted, connected
        clients receive an event.
      </DocsText>

      <DocsHeading level={2} className="mt-8">
        1. Generate a Subscription Token
      </DocsHeading>
      <DocsText>
        Clients should not connect with your API key. Instead, your app backend
        requests a realtime token and your frontend uses that token.
      </DocsText>
      <DocsCodeBlock language="bash">
        {`curl -X POST https://api.paperdb.dev/realtime/token \\
  -H "Authorization: Bearer your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "collections": ["messages", "notifications"]
  }'`}
      </DocsCodeBlock>

      <DocsHeading level={2} className="mt-8">
        2. Connect the SDK
      </DocsHeading>
      <DocsText>
        With the SDK, subscriptions are managed via
        <code>db.realtime.subscribe()</code>. The SDK internally calls
        <code>/realtime/token</code> using your API key.
      </DocsText>

      <DocsCodeBlock language="typescript">{`import { createClient } from "paperdb";

const db = createClient({
  apiKey: "your_api_key",
  baseUrl: "http://localhost:3001",
});

const unsubscribe = db.realtime.subscribe("messages", (event) => {
  if (event.type === "insert") {
    console.log("New message:", event.data);
  } else if (event.type === "update") {
    console.log("Message updated:", event.data);
  } else if (event.type === "delete") {
    console.log("Message deleted:", event.data);
  }
});

unsubscribe();`}</DocsCodeBlock>

      <DocsCallout type="warning">
        <DocsText className="mb-0">
          Realtime concurrent connections are quota-limited. If your application
          exceeds the allowed concurrency, new socket connections can be
          rejected.
        </DocsText>
      </DocsCallout>
    </DocsContainer>
  );
};

export default RealtimePage;
