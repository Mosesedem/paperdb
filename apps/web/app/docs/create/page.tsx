import React from "react";
import DocsContainer from "../components/ui/docs-container";
import DocsHeading from "../components/ui/docs-heading";
import DocsText from "../components/ui/docs-text";
import DocsCodeBlock from "../components/ui/docs-code-block";
import DocsList from "../components/ui/docs-list";
import DocsCallout from "../components/ui/docs-callout";

const Create = () => {
  return (
    <DocsContainer>
      <DocsHeading level={1}>Create</DocsHeading>
      <DocsText>
        The <code>insert()</code> and <code>insertBulk()</code> functions let
        you add documents into a collection.
      </DocsText>

      <DocsHeading level={2}>
        🔹 <code>insert()</code>
      </DocsHeading>
      <DocsText>Adds a single document to one collection.</DocsText>
      <DocsCallout type="info">
        <DocsText className="mb-0">
          Maps to <code>POST /:collection/docs</code> on the API. The server
          validates the payload against your collection schema and enforces
          uniqueness constraints. On success the API returns the created
          document with `_id`, `createdAt`, and `updatedAt`.
        </DocsText>
      </DocsCallout>
      <DocsCodeBlock>{`await db.users.insert({
  name: "Dinesh Chugtai",
  email: "dinesh@piedpiper.com",
  isAdmin: false,
});`}</DocsCodeBlock>
      <DocsHeading level={3}>Behavior:</DocsHeading>
      <DocsList>
        <li>Validates the payload against your schema.</li>
        <li>Applies default values if you skipped them.</li>
        <li>
          Throws if required fields are missing or uniqueness is violated.
        </li>
      </DocsList>

      <DocsHeading level={2}>
        🔸 <code>insertBulk()</code>
      </DocsHeading>
      <DocsText>Inserts multiple documents at once.</DocsText>
      <DocsCallout type="info">
        <DocsText className="mb-0">
          Maps to <code>POST /:collection/bulk</code>. The response returns
          per-batch status fields: <code>inserted</code>, <code>failed</code>,
          <code>documents</code>, and optional <code>errors</code>.
        </DocsText>
      </DocsCallout>
      <DocsCodeBlock>{`await db.users.insertBulk([
  { name: "Jared Dunn", email: "jared@piedpiper.com", isAdmin: false },
  { name: "Erlich Bachman", email: "erlich@piedpiper.com", isAdmin: true },
]);`}</DocsCodeBlock>
      <DocsHeading level={3}>Notes:</DocsHeading>
      <DocsList>
        <li>
          If any doc violates schema or uniqueness, the entire batch fails.
        </li>
        <li>Same rules apply: default values, validation, etc.</li>
      </DocsList>

      <DocsCallout type="note">
        <DocsText className="mb-0">
          Bulk inserts are currently <strong>partial-success</strong>, not
          all-or-nothing atomic. Valid documents can be inserted while invalid
          ones are returned in <code>errors</code>.
        </DocsText>
      </DocsCallout>

      <DocsHeading level={2}>✅ Key Management</DocsHeading>
      <DocsText>
        You can pass a custom <code>key</code>:
      </DocsText>
      <DocsCodeBlock>{`await db.users.insert({
  key: "custom_id",
  name: "Monica Hall",
  isAdmin: true,
});`}</DocsCodeBlock>
      <DocsText>Otherwise, PaperDB generates a nanoid for you.</DocsText>
    </DocsContainer>
  );
};

export default Create;
