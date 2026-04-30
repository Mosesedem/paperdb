import React from "react";
import DocsHeading from "../components/ui/docs-heading";
import DocsText from "../components/ui/docs-text";
import DocsContainer from "../components/ui/docs-container";
import DocsCodeBlock from "../components/ui/docs-code-block";
import DocsCallout from "../components/ui/docs-callout";

const ApiReferencePage = () => {
  return (
    <DocsContainer>
      <DocsHeading level={1}>REST API Reference</DocsHeading>
      <DocsText>
        While the PaperDB SDK is the recommended way to interact with your database, you can also use the REST API directly from any language or framework.
      </DocsText>
      
      <DocsCallout type="info">
        <DocsText className="mb-0">
          All API requests must include your API key in the <code>Authorization</code> header: <br />
          <code>Authorization: Bearer your_api_key</code>
        </DocsText>
      </DocsCallout>

      <DocsHeading level={2} className="mt-8">Authentication</DocsHeading>
      
      <DocsHeading level={3}>Sign Up</DocsHeading>
      <DocsCodeBlock language="bash">{`POST /auth/sign-up
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword",
  "name": "Jane Doe"
}`}</DocsCodeBlock>

      <DocsHeading level={3}>Sign In</DocsHeading>
      <DocsCodeBlock language="bash">{`POST /auth/sign-in
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword"
}`}</DocsCodeBlock>

      <DocsHeading level={2} className="mt-8">Collection Documents</DocsHeading>

      <DocsHeading level={3}>Insert Document</DocsHeading>
      <DocsCodeBlock language="bash">{`POST /:collection_name/docs
Content-Type: application/json

{
  "title": "My Post",
  "published": true
}`}</DocsCodeBlock>

      <DocsHeading level={3}>List Documents</DocsHeading>
      <DocsCodeBlock language="bash">{`GET /:collection_name/docs?limit=10&offset=0&sortBy=createdAt&sortOrder=desc`}</DocsCodeBlock>

      <DocsHeading level={3}>Get Document</DocsHeading>
      <DocsCodeBlock language="bash">{`GET /:collection_name/docs/:document_id`}</DocsCodeBlock>

      <DocsHeading level={3}>Update Document</DocsHeading>
      <DocsCodeBlock language="bash">{`PATCH /:collection_name/docs/:document_id
Content-Type: application/json

{
  "published": false
}`}</DocsCodeBlock>

      <DocsHeading level={3}>Delete Document</DocsHeading>
      <DocsCodeBlock language="bash">{`DELETE /:collection_name/docs/:document_id`}</DocsCodeBlock>

      <DocsHeading level={3}>Bulk Insert</DocsHeading>
      <DocsCodeBlock language="bash">{`POST /:collection_name/bulk
Content-Type: application/json

{
  "documents": [
    { "title": "Post 1" },
    { "title": "Post 2" }
  ]
}`}</DocsCodeBlock>

      <DocsHeading level={2} className="mt-8">Realtime</DocsHeading>

      <DocsHeading level={3}>Generate Token</DocsHeading>
      <DocsText>Generate a temporary token to establish a secure WebSocket connection from the frontend.</DocsText>
      <DocsCodeBlock language="bash">{`POST /realtime/token
Content-Type: application/json

{
  "collections": ["messages", "users"]
}`}</DocsCodeBlock>

    </DocsContainer>
  );
};

export default ApiReferencePage;
