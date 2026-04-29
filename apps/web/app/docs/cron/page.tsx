import React from "react";
import DocsHeading from "../components/ui/docs-heading";
import DocsText from "../components/ui/docs-text";
import DocsContainer from "../components/ui/docs-container";
import DocsCodeBlock from "../components/ui/docs-code-block";
import DocsCallout from "../components/ui/docs-callout";
import DocsHighlight from "../components/ui/docs-highlight";

const CronPage = () => {
  return (
    <DocsContainer>
      <DocsHeading level={1}>Cron Jobs</DocsHeading>
      <DocsText>
        PaperDB provides a built-in serverless cron job engine. You can schedule tasks to run periodically using standard cron expressions, or friendly natural language like <DocsHighlight>"every 5 minutes"</DocsHighlight>.
      </DocsText>

      <DocsHeading level={2} className="mt-8">
        Scheduling a Job
      </DocsHeading>
      <DocsText>
        You can create a cron job by specifying a schedule and an action. Actions can trigger an external HTTP request, or directly execute operations against your database collections.
      </DocsText>
      
      <DocsCodeBlock
        language="bash"
        code={`curl -X POST https://api.paperdb.dev/cron \\
  -H "X-API-Key: your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Daily Cleanup",
    "schedule": "0 0 * * *",
    "timezone": "UTC",
    "action": {
      "type": "http",
      "method": "POST",
      "url": "https://your-server.com/api/cleanup"
    }
  }'`}
      />

      <DocsCallout type="warning" title="Rate Limits">
        Cron jobs are limited to a maximum frequency of 1 run per minute. Schedules specifying sub-minute frequencies (e.g. * * * * * *) are not supported.
      </DocsCallout>

      <DocsHeading level={2} className="mt-8">
        Action Types
      </DocsHeading>
      
      <DocsHeading level={3} className="mt-6">
        HTTP Action
      </DocsHeading>
      <DocsText>
        Makes an HTTP request to an external endpoint. Useful for triggering serverless functions or webhooks.
      </DocsText>
      <DocsCodeBlock
        language="json"
        code={`"action": {
  "type": "http",
  "method": "POST",
  "url": "https://api.example.com/sync",
  "headers": {
    "Authorization": "Bearer token"
  }
}`}
      />

      <DocsHeading level={3} className="mt-6">
        Collection Action
      </DocsHeading>
      <DocsText>
        Performs a direct database operation on a specific collection.
      </DocsText>
      <DocsCodeBlock
        language="json"
        code={`"action": {
  "type": "collection",
  "collection": "users",
  "operation": "delete_many",
  "payload": {
    "status": "inactive",
    "lastLoginBefore": "2024-01-01"
  }
}`}
      />

    </DocsContainer>
  );
};

export default CronPage;
