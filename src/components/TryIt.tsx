"use client";

import { useState } from "react";

interface FieldDef {
  name: string;
  placeholder: string;
  defaultValue?: string;
  query?: boolean;
}

interface TryItProps {
  pathTemplate: string;
  fields?: FieldDef[];
}

function buildPath(template: string, values: Record<string, string>, fields: FieldDef[]) {
  let path = template;
  const query: string[] = [];
  for (const f of fields) {
    const val = values[f.name] ?? f.defaultValue ?? "";
    if (f.query) {
      if (val) query.push(`${f.name}=${encodeURIComponent(val)}`);
    } else {
      path = path.replace(`{${f.name}}`, encodeURIComponent(val));
    }
  }
  return query.length ? `${path}?${query.join("&")}` : path;
}

export default function TryIt({ pathTemplate, fields = [] }: TryItProps) {
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(fields.map((f) => [f.name, f.defaultValue ?? ""])),
  );
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusCode, setStatusCode] = useState<number | null>(null);

  async function run() {
    setLoading(true);
    setResult(null);
    setStatusCode(null);
    const path = buildPath(pathTemplate, values, fields);
    try {
      const res = await fetch(path);
      setStatusCode(res.status);
      const text = await res.text();
      let pretty = text;
      try {
        pretty = JSON.stringify(JSON.parse(text), null, 2);
      } catch {
        // leave as-is
      }
      const truncated =
        pretty.length > 4000 ? pretty.slice(0, 4000) + "\n… (dipotong)" : pretty;
      setResult(truncated);
    } catch (err) {
      setResult(err instanceof Error ? err.message : "Gagal memanggil endpoint");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="tryit">
      {fields.length > 0 && (
        <div className="row">
          {fields.map((f) => (
            <input
              key={f.name}
              className="field"
              placeholder={f.placeholder}
              value={values[f.name] ?? ""}
              onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
            />
          ))}
        </div>
      )}
      <div className="row">
        <button className="btn secondary" onClick={run} disabled={loading}>
          {loading ? "Memanggil…" : "Coba endpoint ini"}
        </button>
        {statusCode !== null && (
          <span
            className="pill mono"
            style={{ alignSelf: "center" }}
            title="HTTP status"
          >
            {statusCode}
          </span>
        )}
      </div>
      {result !== null && <pre className="result">{result}</pre>}
    </div>
  );
}
