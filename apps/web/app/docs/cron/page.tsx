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
        PaperDB provides a built-in cron job engine. You can schedule tasks to
        run periodically using standard cron expressions, or friendly natural
        language like <DocsHighlight>every 5 minutes</DocsHighlight>.
      </DocsText>

      <DocsHeading level={2} className="mt-8">
        Scheduling a Job
      </DocsHeading>
      <DocsText>
        You can create a cron job by specifying a schedule and an action.
        Actions can trigger an external HTTP request.
      </DocsText>
      <DocsCodeBlock language="bash">
        {`curl -X POST https://api.paperdb.dev/cron \\
  -H "Authorization: Bearer your_api_key" \\
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
      </DocsCodeBlock>

      <DocsCallout type="warning">
        <DocsText className="mb-0">
          Cron jobs are limited to a maximum frequency of 1 run per minute.
          Sub-minute schedules are not supported.
        </DocsText>
      </DocsCallout>

      <DocsHeading level={2} className="mt-8">
        Action Types
      </DocsHeading>

      <DocsHeading level={3} className="mt-6">
        HTTP Action
      </DocsHeading>
      <DocsText>Makes an HTTP request to an external endpoint.</DocsText>
      <DocsCodeBlock language="json">{`"action": {
  "type": "http",
  "method": "POST",
  "url": "https://api.example.com/sync",
  "headers": {
    "Authorization": "Bearer token"
  }
}`}</DocsCodeBlock>

      <DocsHeading level={3} className="mt-6">
        Collection Action
      </DocsHeading>
      <DocsText>
        Collection actions are planned and not yet a stable public contract.
      </DocsText>
      <DocsCodeBlock language="json">{`"action": {
  "type": "collection",
  "collection": "users",
  "operation": "delete_many",
  "payload": {
    "status": "inactive",
    "lastLoginBefore": "2024-01-01"
  }
}`}</DocsCodeBlock>
    </DocsContainer>
  );
};

export default CronPage;
