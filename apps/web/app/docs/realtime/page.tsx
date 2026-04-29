import React from "react";
import DocsHeading from "../components/ui/docs-heading";
import DocsText from "../components/ui/docs-text";
import DocsContainer from "../components/ui/docs-container";
import DocsCodeBlock from "../components/ui/docs-code-block";
import DocsHighlight from "../components/ui/docs-highlight";
import DocsCallout from "../components/ui/docs-callout";

const RealtimePage = () => {
  return (
    <DocsContainer>
      <DocsHeading level={1}>Realtime Subscriptions</DocsHeading>
      <DocsText>
        PaperDB allows you to listen to database changes in real-time using WebSockets. When a document is created, updated, or deleted, your connected clients will instantly receive the mutation event.
      </DocsText>

      <DocsHeading level={2} className="mt-8">
        1. Generate a Subscription Token
      </DocsHeading>
      <DocsText>
        For security, clients cannot connect directly to the WebSocket server using your API key. Instead, your backend server must generate a short-lived realtime token for the specific collections the client is allowed to listen to.
      </DocsText>
      
      <DocsCodeBlock
        language="bash"
        code={`curl -X POST https://api.paperdb.dev/realtime/token \\
  -H "X-API-Key: your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "collections": ["messages", "notifications"]
  }'`}
      />

      <DocsHeading level={2} className="mt-8">
        2. Connect the SDK
      </DocsHeading>
      <DocsText>
        Once the client has the token, they can initialize a realtime subscription using the frontend SDK.
      </DocsText>

      <DocsCodeBlock
        language="typescript"
        code={`import { createClient } from "@paperdb/sdk";

// Initialize with the generated subscription token
const paper = createClient({ realtimeToken: "YOUR_GENERATED_TOKEN" });

// Subscribe to events
const unsubscribe = paper.collection("messages").subscribe((event) => {
  if (event.type === "INSERT") {
    console.log("New message:", event.payload);
  } else if (event.type === "UPDATE") {
    console.log("Message updated:", event.payload);
  } else if (event.type === "DELETE") {
    console.log("Message deleted ID:", event.id);
  }
});

// To stop listening
// unsubscribe();`}
      />

      <DocsCallout type="warning" title="Connection Limits">
        Realtime concurrent connections are subject to your project's billing quota. If your application exceeds the maximum allowed concurrent connections, new websocket connections will be rejected.
      </DocsCallout>

    </DocsContainer>
  );
};

export default RealtimePage;
