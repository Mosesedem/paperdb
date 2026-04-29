import React from "react";
import { ApiReferenceReact } from "@scalar/api-reference-react";
import "@scalar/api-reference-react/style.css";

const ApiReferencePage = () => {
  return (
    <div className="w-full h-[calc(100vh-80px)] mt-4 rounded-xl overflow-hidden border border-white/10 relative">
      <ApiReferenceReact
        configuration={{
          spec: {
            // Using the live spec route or a static spec
            url: "http://localhost:3001/openapi.json",
          },
          theme: "moon",
          layout: "modern",
          showSidebar: true,
          hideModels: false,
          hideDownloadButton: false,
        }}
      />
    </div>
  );
};

export default ApiReferencePage;
