import React from "react";
import DocsContainer from "../components/ui/docs-container";
import DocsHeading from "../components/ui/docs-heading";
import DocsText from "../components/ui/docs-text";
import DocsCodeBlock from "../components/ui/docs-code-block";
import DocsList from "../components/ui/docs-list";
import DocsCallout from "../components/ui/docs-callout";

const Update = () => {
  return (
    <DocsContainer>
      <DocsHeading level={1}>Update</DocsHeading>
      <DocsText>
        Use <code>update()</code> to modify an existing document by its ID. Only
        the fields you pass will be updated — the rest stay untouched.
      </DocsText>
      <DocsCallout type="info">
        <DocsText className="mb-0">
          Maps to <code>PATCH /:collection/docs/:id</code>. The response returns
          the updated document.
        </DocsText>
      </DocsCallout>

      <DocsHeading level={2}>
        ✏️ <code>update()</code>
      </DocsHeading>
      <DocsCodeBlock>{`await db.users.update("user_gilfoyle", {
  name: "Bertram Gilfoyle",
  isAdmin: true,
});`}</DocsCodeBlock>
      <DocsText>
        This updates just the <code>name</code> and <code>isAdmin</code> fields
        of the document with <code>{`_id: "user_gilfoyle"`}</code>.
      </DocsText>

      <DocsHeading level={2}>Increment / Decrement</DocsHeading>
      <DocsText>
        The API also supports numeric delta operations in updates:
      </DocsText>
      <DocsCodeBlock>{`await db.users.update("user_gilfoyle", {
  loginCount: { increment: 1 },
});`}</DocsCodeBlock>
      <DocsCodeBlock>{`await db.users.update("user_gilfoyle", {
  credits: { decrement: 5 },
});`}</DocsCodeBlock>

      <DocsHeading level={2}>Behavior</DocsHeading>
      <DocsList>
        <li>
          <strong>Partial update:</strong> You do not need to pass all fields.
        </li>
        <li>
          <strong>Schema validated:</strong> The new fields are still validated
          against the schema.
        </li>
        <li>
          <strong>
            <code>updatedAt</code> is automatically updated
          </strong>{" "}
          for you.
        </li>
        <li>
          Missing document IDs return <code>404</code> and surface as SDK
          errors.
        </li>
      </DocsList>
    </DocsContainer>
  );
};

export default Update;
