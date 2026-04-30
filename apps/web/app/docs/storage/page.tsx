import React from "react";
import DocsHeading from "../components/ui/docs-heading";
import DocsText from "../components/ui/docs-text";
import DocsContainer from "../components/ui/docs-container";
import DocsCodeBlock from "../components/ui/docs-code-block";
import DocsHighlight from "../components/ui/docs-highlight";

const StoragePage = () => {
  return (
    <DocsContainer>
      <DocsHeading level={1}>Storage</DocsHeading>
      <DocsText>
        PaperDB's storage module allows you to securely upload, manage, and distribute files using the SDK.
      </DocsText>

      <DocsHeading level={2} className="mt-8">
        Uploading Files
      </DocsHeading>
      <DocsText>
        You can upload a file (e.g., from an input element) directly using the SDK.
      </DocsText>
      <DocsCodeBlock language="typescript">{`const fileInput = document.getElementById('file-input');
const file = fileInput.files[0];

const result = await db.storage.upload(file, {
  folder: "avatars",
  isPublic: true,
  metadata: { userId: "user_123" }
});

console.log("File uploaded to:", result.url);`}</DocsCodeBlock>

      <DocsHeading level={2} className="mt-8">
        Upload Multiple Files
      </DocsHeading>
      <DocsCodeBlock language="typescript">{`const files = [file1, file2, file3];

const results = await db.storage.uploadMany(files, {
  folder: "gallery",
  isPublic: true
});`}</DocsCodeBlock>

      <DocsHeading level={2} className="mt-8">
        Upload From URL
      </DocsHeading>
      <DocsText>
        You can fetch a remote file and store it directly in PaperDB.
      </DocsText>
      <DocsCodeBlock language="typescript">{`const file = await db.storage.uploadFromUrl(
  "https://example.com/sample-image.png",
  { folder: "imports" }
);`}</DocsCodeBlock>

      <DocsHeading level={2} className="mt-8">
        Managing Files
      </DocsHeading>
      <DocsText>
        The SDK provides straightforward methods to list, retrieve, and delete files.
      </DocsText>

      <DocsHeading level={3} className="mt-4">List Files</DocsHeading>
      <DocsCodeBlock language="typescript">{`const { files, total, hasMore } = await db.storage.list({
  folder: "avatars",
  limit: 10,
  sortBy: "createdAt",
  sortOrder: "desc"
});`}</DocsCodeBlock>

      <DocsHeading level={3} className="mt-4">Get File Metadata</DocsHeading>
      <DocsCodeBlock language="typescript">{`// By ID
const file = await db.storage.get("file_123");

// By Path
const fileByPath = await db.storage.getByPath("avatars/image.png");`}</DocsCodeBlock>

      <DocsHeading level={3} className="mt-4">Delete Files</DocsHeading>
      <DocsCodeBlock language="typescript">{`// Delete single file
await db.storage.delete("file_123");

// Delete multiple files
await db.storage.deleteMany(["file_123", "file_456"]);`}</DocsCodeBlock>

      <DocsHeading level={2} className="mt-8">
        Signed URLs and Transformations
      </DocsHeading>
      <DocsText>
        If your file is private, you can generate a temporary signed URL for access.
      </DocsText>
      <DocsCodeBlock language="typescript">{`const { url, expiresAt } = await db.storage.getSignedUrl("file_123", {
  expiresIn: 3600 // 1 hour
});`}</DocsCodeBlock>

      <DocsText className="mt-4">
        You can also generate URLs with image transformations applied (resize, quality, format):
      </DocsText>
      <DocsCodeBlock language="typescript">{`const transformedUrl = db.storage.getImageUrl(fileIdOrUrl, {
  width: 400,
  height: 400,
  fit: "cover",
  format: "webp"
});`}</DocsCodeBlock>

      <DocsHeading level={2} className="mt-8">
        Folders
      </DocsHeading>
      <DocsText>
        You can explicitly create, list, and delete folders.
      </DocsText>
      <DocsCodeBlock language="typescript">{`await db.storage.createFolder("invoices/2024");
const folders = await db.storage.listFolders("invoices");
await db.storage.deleteFolder("invoices/old");`}</DocsCodeBlock>

    </DocsContainer>
  );
};

export default StoragePage;
