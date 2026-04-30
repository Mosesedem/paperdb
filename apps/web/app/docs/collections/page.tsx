import React from "react";
import DocsContainer from "../components/ui/docs-container";
import DocsHeading from "../components/ui/docs-heading";
import DocsText from "../components/ui/docs-text";
import DocsCodeBlock from "../components/ui/docs-code-block";
import DocsList from "../components/ui/docs-list";
import DocsCallout from "../components/ui/docs-callout";

const Collections = () => {
  return (
    <DocsContainer>
      <DocsHeading level={1}>Collections</DocsHeading>
      <DocsText>
        A <strong>collection</strong> is a group of related documents — like a
        table in SQL, or a model in an ORM.
      </DocsText>
      <DocsText>
        Each collection is defined by a <strong>schema</strong> that describes
        the shape of the data it holds.
      </DocsText>

      <DocsHeading level={2}>📦 Defining a Collection</DocsHeading>
      <DocsText>
        You define collections inside the <code>schema</code> object when
        initializing your client:
      </DocsText>
      <DocsCodeBlock>{`const db = createClient({
  apiKey: "your_api_key",
  schema: {
    users: {
      properties: {
        name: { type: "string", required: true },
        email: { type: "string", required: true, unique: true },
        isAdmin: { type: "boolean", default: false },
      },
    },
  },
});`}</DocsCodeBlock>
      <DocsText>
        This creates a <code>users</code> collection with three fields:
      </DocsText>
      <DocsList>
        <li>
          <code>name</code> (required string)
        </li>
        <li>
          <code>email</code> (required string, unique)
        </li>
        <li>
          <code>isAdmin</code> (optional boolean with a default)
        </li>
      </DocsList>

      <DocsHeading level={2}>✅ Schema-based, not schema-less</DocsHeading>
      <DocsText>
        Unlike traditional NoSQL databases, PaperDB <strong>enforces</strong>{" "}
        your schema. That means:
      </DocsText>
      <DocsList>
        <li>You get validation out of the box</li>
        <li>Required fields must be present</li>
        <li>Unique fields are checked on insert</li>
      </DocsList>
      <DocsText>
        You don't need to write validation logic — it's all automatic.
      </DocsText>

      <DocsCallout type="info">
        <DocsText className="mb-0">
          <strong>Server-backed behavior:</strong> Collections and schema
          validation are enforced by the API. CRUD endpoints are available for
          collections (see the API reference). The server implements unique
          checks, schema validation, and automatic indexing hints for filtered
          queries.
        </DocsText>
      </DocsCallout>

      <DocsHeading level={2}>🔗 One Schema per Collection</DocsHeading>
      <DocsText>
        Each collection has a single schema. If you update the schema, it
        applies to all documents going forward (past documents are untouched
        unless updated).
      </DocsText>

      <DocsHeading level={2}>🔐 Unique & Required Fields</DocsHeading>
      <DocsText>
        You can define fields as <code>required</code> or <code>unique</code>:
      </DocsText>
      <DocsCodeBlock>{`email: { type: "string", required: true, unique: true }`}</DocsCodeBlock>
      <DocsText>PaperDB will:</DocsText>
      <DocsList>
        <li>
          Block inserts if <code>email</code> is missing
        </li>
        <li>
          Prevent duplicates if <code>email</code> already exists
        </li>
      </DocsList>
    </DocsContainer>
  );
};

export default Collections;
