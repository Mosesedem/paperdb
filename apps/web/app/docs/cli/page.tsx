import React from "react";
import DocsContainer from "../components/ui/docs-container";
import DocsHeading from "../components/ui/docs-heading";
import DocsText from "../components/ui/docs-text";
import DocsCodeBlock from "../components/ui/docs-code-block";
import DocsCallout from "../components/ui/docs-callout";

const CliDocumentation = () => {
  return (
    <DocsContainer>
      <DocsHeading level={1}>CLI (create-paperdb)</DocsHeading>
      <DocsText>
        The fastest way to get started with PaperDB is by using the official CLI to scaffold a new project. 
        It sets up a structured environment with the PaperDB SDK pre-configured.
      </DocsText>

      <DocsHeading level={2}>Quickstart</DocsHeading>
      <DocsText>Run the following command in your terminal:</DocsText>
      <DocsCodeBlock>{`npx create-paperdb@latest`}</DocsCodeBlock>
      
      <DocsText>
        You will be prompted to enter your project name. The CLI will then generate a new Next.js or generic TypeScript project containing:
      </DocsText>
      <ul className="list-disc pl-6 mb-4 text-gray-300">
        <li>A configured `paperdb` SDK client.</li>
        <li>Environment variable templates (`.env.example`).</li>
        <li>Basic usage examples of collections and queries.</li>
      </ul>

      <DocsCallout type="info">
        <DocsText className="mb-0">
          <strong>Tip:</strong> Ensure you have your PaperDB API Key ready from the dashboard to paste into your `.env` file after setup.
        </DocsText>
      </DocsCallout>

      <DocsHeading level={2}>Manual scaffolding</DocsHeading>
      <DocsText>
        If you prefer not to use the CLI, you can simply install the NPM package into your existing project:
      </DocsText>
      <DocsCodeBlock>{`npm install paperdb`}</DocsCodeBlock>
      <DocsText>
        And initialize the client as shown in the Authentication guide.
      </DocsText>
    </DocsContainer>
  );
};

export default CliDocumentation;
