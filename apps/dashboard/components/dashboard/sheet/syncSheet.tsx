"use client";

import React, { useRef } from "react";
import {
  SpreadsheetComponent,
  SheetsDirective,
  SheetDirective,
  RangesDirective,
  RangeDirective,
  ColumnsDirective,
  ColumnDirective,
} from "@syncfusion/ej2-react-spreadsheet";

import api from "@/lib/axios";
import { defaultData } from "./datasource";

export default function Team() {
  const spreadsheetRef = useRef<SpreadsheetComponent>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [resdata, setRes] = React.useState<any[]>([]);
const [fileLoaded, setFileLoaded] = React.useState(false);


 const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  setFileLoaded(true);

  const form = new FormData();
  form.append("file", file);

  const res = await api.post("/process-csv-json", form);
  setRes(res.data);
};



  const onUpload = () => {
  if (!fileLoaded) {
    alert("Please select a file first!");
    return;
  }

  spreadsheetRef.current?.setProperties({
    sheets: [{ ranges: [{ dataSource: resdata }] }],
  });
};


const onClearAll = () => {
  setFileLoaded(false);
  setRes([]);
  fileInputRef.current!.value = "";
  
  spreadsheetRef.current?.setProperties({
    sheets: [{ ranges: [{ dataSource: [] }] }],
  });
};


  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        onChange={onFileChange}
        accept=".csv,.xlsx,.json"
      />

      <button onClick={onUpload}>Upload</button>
      <button onClick={onClearAll} style={{ marginLeft: "10px" }}>
        Clear All
      </button>

      <SpreadsheetComponent
        ref={spreadsheetRef}
        className="h-full w-full"
        openUrl="https://ej2services.syncfusion.com/production/web-services/api/spreadsheet/open"
        saveUrl="https://ej2services.syncfusion.com/production/web-services/api/spreadsheet/save"
      >
        <SheetsDirective>
          <SheetDirective name="Report">
            <ColumnsDirective>
              <ColumnDirective width={180} />
              <ColumnDirective width={130} />
              <ColumnDirective width={130} />
              <ColumnDirective width={180} />
              <ColumnDirective width={130} />
              <ColumnDirective width={120} />
            </ColumnsDirective>
          </SheetDirective>
        </SheetsDirective>
      </SpreadsheetComponent>
    </>
  );
}
