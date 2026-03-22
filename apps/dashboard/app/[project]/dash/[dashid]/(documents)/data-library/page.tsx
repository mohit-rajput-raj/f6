'use client'
import React, { useState } from 'react'
import { Spreadsheet } from 'react-spreadsheet'
import Papa from 'papaparse'

const DataLibrary = () => {
  const createEmptyGrid = (rows: number, cols: number) =>
    Array.from({ length: rows }, () =>
      Array.from({ length: cols }, () => ({ value: '' }))
    )

  const [data, setData] = useState(createEmptyGrid(10, 10))

  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    Papa.parse(file, {
      complete: (result: { data: any[] }) => {
        const csvData = result.data
          .filter((row: any) => row.length > 0)
          .map((row: any) => row.map((cell: any) => ({ value: cell })))

        setData(csvData)
      },
    })
  }

  const addRow = () => {
    const newRow = Array.from({ length: data[0].length }, () => ({ value: '' }))
    setData([...data, newRow])
  }

  const addColumn = () => {
    const newData = data.map((row) => [...row, { value: '' }])
    setData(newData)
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex gap-3">
        <button
          onClick={addRow}
          className="bg-card text-text px-3 py-1 rounded"
        >
          ➕ Add Row
        </button>
        <button
          onClick={addColumn}
          className="bg-card text-text px-3 py-1 rounded"
        >
          ➕ Add Column
        </button>

        <label className="bg-card text-text px-3 py-1 rounded cursor-pointer">
          📂 Upload CSV
          <input
            type="file"
            accept=".csv"
            onChange={handleCSVUpload}
            className="hidden"
          />
        </label>
      </div>

      <div className="w-full h-[70vh] overflow-auto border border-gray-300 rounded-lg p-2">
        <Spreadsheet data={data} />
      </div>
    </div>
  )
}

export default DataLibrary
