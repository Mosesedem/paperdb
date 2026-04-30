import React from "react";
import DocsContainer from "../components/ui/docs-container";
import DocsHeading from "../components/ui/docs-heading";
import DocsText from "../components/ui/docs-text";
import DocsCodeBlock from "../components/ui/docs-code-block";
import DocsTable from "../components/ui/docs-table";
import DocsCallout from "../components/ui/docs-callout";

const Read = () => {
  return (
    <DocsContainer>
      <DocsHeading level={1}>Read</DocsHeading>
      <DocsText>
        You can read data using <code>find()</code> to fetch multiple documents,
        and <code>get()</code> to fetch a single document by ID.
      </DocsText>
      <DocsCallout type="info">
        <DocsText className="mb-0">
          <code>find()</code> maps to <code>GET /:collection/docs</code> and
          <code>get()</code> maps to <code>GET /:collection/docs/:id</code>.
        </DocsText>
      </DocsCallout>

      <DocsHeading level={2}>
        🔹 <code>find()</code>
      </DocsHeading>
      <DocsText>
        Use this to query a collection and retrieve multiple documents.
      </DocsText>
      <DocsCodeBlock>{`const users = await db.users.find({
  filter: { isAdmin: true },
  sort: "-createdAt",
  limit: 10,
});`}</DocsCodeBlock>
      <DocsText>
        Advanced operators are supported for numeric/date-like fields:
      </DocsText>
      <DocsCodeBlock>{`const latest = await db.users.find({
  filter: {
    loginCount: { gte: 10 },
  },
  sort: "-updatedAt",
  limit: 20,
});`}</DocsCodeBlock>
      <DocsHeading level={3}>Options</DocsHeading>
      <DocsTable>
        <thead>
          <tr>
            <th className="px-4 py-3 border border-gray-700 rounded-tl-lg">
              Option
            </th>
            <th className="px-4 py-3 border border-gray-700">Type</th>
            <th className="px-4 py-3 border border-gray-700 rounded-tr-lg">
              Description
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="px-4 py-3 border border-gray-700">
              <code>filter</code>
            </td>
            <td className="px-4 py-3 border border-gray-700">
              <code>Partial&lt;Schema&gt;</code>
            </td>
            <td className="px-4 py-3 border border-gray-700">
              Filters by matching fields
            </td>
          </tr>
          <tr>
            <td className="px-4 py-3 border border-gray-700">
              <code>sort</code>
            </td>
            <td className="px-4 py-3 border border-gray-700">
              <code>string</code>
            </td>
            <td className="px-4 py-3 border border-gray-700">
              Sort by a field (use <code>-</code> prefix for descending)
            </td>
          </tr>
          <tr>
            <td className="px-4 py-3 border border-gray-700">
              <code>limit</code>
            </td>
            <td className="px-4 py-3 border border-gray-700">
              <code>number</code>
            </td>
            <td className="px-4 py-3 border border-gray-700">
              Max number of results to return
            </td>
          </tr>
          <tr>
            <td className="px-4 py-3 border border-gray-700">
              <code>offset</code>
            </td>
            <td className="px-4 py-3 border border-gray-700">
              <code>number</code>
            </td>
            <td className="px-4 py-3 border border-gray-700">
              Skips N number of results (for pagination)
            </td>
          </tr>
        </tbody>
      </DocsTable>

      <DocsHeading level={2}>
        🔸 <code>get()</code>
      </DocsHeading>
      <DocsText>Use this to fetch a single document by its ID.</DocsText>
      <DocsCodeBlock>{`const user = await db.users.get("user_abc123");`}</DocsCodeBlock>
      <DocsText>You can also select specific fields:</DocsText>
      <DocsCodeBlock>{`const user = await db.users.get("user_abc123", {
  select: { name: true, email: true },
});`}</DocsCodeBlock>
      <DocsCallout type="note">
        <DocsText className="mb-0">
          Missing document IDs return a 404 from the API and throw an error in
          the SDK.
        </DocsText>
      </DocsCallout>
    </DocsContainer>
  );
};

export default Read;
