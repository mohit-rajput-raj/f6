import React from "react";
import { SpreadsheetComponent } from "@syncfusion/ej2-react-spreadsheet";
import { registerLicense } from '@syncfusion/ej2-base';

registerLicense("YOUR_LICENSE_KEY");

export default function App() {
  return (
    <div style={{ margin: "20px" }}>
      <SpreadsheetComponent
        allowOpen={true}
        allowSave={true}
        showRibbon={true}
        height={600}
      />
    </div>
  );
}
