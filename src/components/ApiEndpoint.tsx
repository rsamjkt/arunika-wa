"use client";

import { useState } from "react";
import TryIt from "./TryIt";

interface FieldDef {
  name: string;
  placeholder: string;
  defaultValue?: string;
  query?: boolean;
}

export interface ApiEndpointDef {
  id: string;
  method: "GET" | "POST" | "DELETE";
  path: string;
  summary: string;
  description: string;
  params?: [string, string][];
  body?: [string, string][];
  example?: string;
  tryIt?: { pathTemplate: string; fields?: FieldDef[] };
}

function KV({ rows }: { rows: [string, string][] }) {
  return (
    <div className="kv-table">
      {rows.map(([k, v]) => (
        <div className="kv-row" key={k}>
          <span className="k">{k}</span>
          <span className="v">{v}</span>
        </div>
      ))}
    </div>
  );
}

export default function ApiEndpoint({ def }: { def: ApiEndpointDef }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="swagger-op" id={def.id}>
      <button className="swagger-op-row" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <span className={`swagger-method ${def.method.toLowerCase()}`}>{def.method}</span>
        <span className="swagger-path">{def.path}</span>
        <span className="swagger-summary">{def.summary}</span>
        <span className={`swagger-chevron${open ? " open" : ""}`}>▾</span>
      </button>
      {open && (
        <div className="swagger-op-body">
          <p className="ep-desc">{def.description}</p>
          {def.params && (
            <>
              <span className="swagger-label">Parameter</span>
              <KV rows={def.params} />
            </>
          )}
          {def.body && (
            <>
              <span className="swagger-label">Body (JSON)</span>
              <KV rows={def.body} />
            </>
          )}
          {def.example && (
            <>
              <span className="swagger-label">Contoh</span>
              <pre className="codeblock">{def.example}</pre>
            </>
          )}
          {def.tryIt && (
            <>
              <span className="swagger-label">Try it out</span>
              <TryIt pathTemplate={def.tryIt.pathTemplate} fields={def.tryIt.fields} />
            </>
          )}
          {!def.tryIt && def.method !== "GET" && (
            <p style={{ fontSize: "0.76rem", color: "var(--ink-soft)" }}>
              Endpoint ini mengubah data (mengirim pesan/menghapus/dll), jadi tidak ada tombol uji
              langsung di sini — jalankan lewat contoh <span className="mono">curl</span> di atas.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
