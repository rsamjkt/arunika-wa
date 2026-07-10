"use client";

import { useState } from "react";
import ApiEndpoint, { type ApiEndpointDef } from "./ApiEndpoint";

export default function ApiTagGroup({
  tag,
  description,
  endpoints,
}: {
  tag: string;
  description: string;
  endpoints: ApiEndpointDef[];
}) {
  const [open, setOpen] = useState(true);

  return (
    <div className="swagger-tag">
      <button className="swagger-tag-head" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <span>
          <h2 style={{ display: "inline" }}>{tag}</h2>
          <span className="desc">{description}</span>
        </span>
        <span className={`swagger-chevron${open ? " open" : ""}`}>▾</span>
      </button>
      {open && (
        <div className="swagger-tag-body">
          {endpoints.map((ep) => (
            <ApiEndpoint key={ep.id} def={ep} />
          ))}
        </div>
      )}
    </div>
  );
}
