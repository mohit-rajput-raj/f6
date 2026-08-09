# MicroSheetAgent Application (`apps/microSheetAgent`)

**MicroSheetAgent** is a dedicated sub-application within the UNIXL monorepo focused on intelligent spreadsheet interaction and automated agent actions.

---

## 🏗️ Structure & Sub-Modules

```text
apps/microSheetAgent/
├── frontend/             # Dedicated Next.js web interface for micro-agent tasks
└── langchainServer/      # LangChain Python server for intelligent sheet execution
```

---

## 🐍 LangChain Server ([`langchainServer/main.py`](file:///D:/vscodes/turborepo/f6/apps/microSheetAgent/langchainServer/main.py))

* **Framework**: Python agent backend utilizing LangChain.
* **Purpose**: Parses complex user natural language queries into executable operations over spreadsheet datasets.
* **Utilities**: [`utils.py`](file:///D:/vscodes/turborepo/f6/apps/microSheetAgent/langchainServer/utils.py) handles context windowing, prompt formatting, and table transformation tools.

---

## 🔗 Related Notes
* [[Apps/Pyp-Python-AI]] — Core Python data engine.
* [[Architecture/System-Overview]] — Overall system topology.
