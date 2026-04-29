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
        PaperDB integrates an S3-compatible object storage layer allowing you to upload files, images, and videos alongside your structured document data.
      </DocsText>

      <DocsHeading level={2} className="mt-8">
        Uploading Files
      </DocsHeading>
      <DocsText>
        You can upload a file using standard <DocsHighlight>multipart/form-data</DocsHighlight> requests.
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
        File Metadata
      </DocsHeading>
      <DocsText>
        When you upload a file, PaperDB generates a globally unique CDN URL and stores the file's metadata (size, MIME type, original name) in a dedicated system collection. 
      </DocsText>

      <DocsCodeBlock
        language="json"
        code={`{
  "id": "file_123456789",
  "name": "a1b2c3d4-image.png",
  "originalName": "image.png",
  "mimeType": "image/png",
  "size": 1048576,
  "url": "https://storage.paperdb.dev/avatars/a1b2c3d4-image.png",
  "cdnUrl": "https://cdn.paperdb.dev/avatars/a1b2c3d4-image.png",
  "isPublic": true,
  "createdAt": "2024-01-01T00:00:00.000Z"
}`}
      />

      <DocsHeading level={2} className="mt-8">
        Listing Files
      </DocsHeading>
      <DocsText>
        You can retrieve a paginated list of your uploaded files using the storage endpoints.
      </DocsText>

      <DocsCodeBlock
        language="bash"
        code={`curl -X GET "https://api.paperdb.dev/storage/files?folder=avatars&limit=10" \\
  -H "X-API-Key: your_api_key"`}
      />

    </DocsContainer>
  );
};

export default StoragePage;
