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
        PaperDB exposes file metadata and upload flows through the API. The
        production object-storage backend is still being finalized, so this page
        shows the contract that the current API supports today.
      </DocsText>

      <DocsHeading level={2} className="mt-8">
        Uploading Files
      </DocsHeading>
      <DocsText>
        You can upload a file using standard{" "}
        <DocsHighlight>multipart/form-data</DocsHighlight> requests.
      </DocsText>

      <DocsCodeBlock
        language="bash"
        code={`curl -X POST https://api.paperdb.dev/storage/upload \\
  -H "X-API-Key: your_api_key" \\
  -F "file=@/path/to/image.png" \\
  -F "folder=avatars" \\
  -F "isPublic=true"`}
      />

      <DocsHeading level={2} className="mt-8">
        Upload From URL
      </DocsHeading>
      <DocsText>
        You can also ask the API to fetch a file from a remote URL and store it
        under a folder.
      </DocsText>

      <DocsCodeBlock
        language="bash"
        code={`curl -X POST https://api.paperdb.dev/storage/upload-url \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your_api_key" \
  -d '{"url":"https://example.com/image.png","folder":"imports"}'`}
      />

      <DocsHeading level={2} className="mt-8">
        File Metadata
      </DocsHeading>
      <DocsText>
        When you upload a file, PaperDB stores the metadata record alongside the
        rest of the platform data. The exact CDN or object URL depends on the
        storage backend you deploy.
      </DocsText>

      <DocsCodeBlock
        language="json"
        code={`{
  "id": "file_123456789",
  "name": "a1b2c3d4-image.png",
  "originalName": "image.png",
  "mimeType": "image/png",
  "size": 1048576,
  "url": "https://storage.example.com/avatars/a1b2c3d4-image.png",
  "cdnUrl": "https://cdn.example.com/avatars/a1b2c3d4-image.png",
  "path": "avatars/a1b2c3d4-image.png",
  "isPublic": true,
  "createdAt": "2024-01-01T00:00:00.000Z"
}`}
      />

      <DocsHeading level={2} className="mt-8">
        Listing Files
      </DocsHeading>
      <DocsText>
        You can retrieve a paginated list of your uploaded files using the
        storage endpoints.
      </DocsText>

      <DocsCodeBlock
        language="bash"
        code={`curl -X GET "https://api.paperdb.dev/storage?folder=avatars&limit=10" \
  -H "X-API-Key: your_api_key"`}
      />

      <DocsHeading level={2} className="mt-8">
        Folders
      </DocsHeading>
      <DocsText>
        Folder listing and folder creation are supported. Move, copy, and
        delete-folder helpers are not part of the public contract yet.
      </DocsText>
    </DocsContainer>
  );
};

export default StoragePage;
