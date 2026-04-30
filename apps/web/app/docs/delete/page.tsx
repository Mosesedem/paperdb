import React from "react";
import DocsContainer from "../components/ui/docs-container";
import DocsHeading from "../components/ui/docs-heading";
import DocsText from "../components/ui/docs-text";
import DocsCodeBlock from "../components/ui/docs-code-block";
import DocsList from "../components/ui/docs-list";
import DocsCallout from "../components/ui/docs-callout";

const Delete = () => {
  return (
    <DocsContainer>
      <DocsHeading level={1}>Delete</DocsHeading>
      <DocsText>
        Use <code>delete()</code> to remove a document from a collection using
        its <code>_id</code>.
      </DocsText>
      <DocsCallout type="info">
        <DocsText className="mb-0">
          Maps to <code>DELETE /:collection/docs/:id</code>. On success the API
          returns a confirmation payload.
        </DocsText>
      </DocsCallout>

      <DocsHeading level={2}>
        🗑️ <code>delete()</code>
      </DocsHeading>
      <DocsCodeBlock>{`await db.users.delete("user_jianyang");`}</DocsCodeBlock>
      <DocsText>
        This deletes the document with <code>_id: "user_jianyang"</code> from
        the <code>users</code> collection.
      </DocsText>

      <DocsHeading level={2}>Behavior</DocsHeading>
      <DocsList>
        <li>If the document exists, it's gone — permanently.</li>
        <li>
          If it doesn't exist, it throws a <code>404</code> error.
        </li>
      </DocsList>
      <DocsCodeBlock>{`// Typical success response shape
{ "message": "Document deleted" }`}</DocsCodeBlock>
    </DocsContainer>
  );
};

export default Delete;
