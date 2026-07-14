"use client";

import ApiEndpoint, { type ApiEndpointDef } from "./ApiEndpoint";

export default function ApiTagGroup({
  tag,
  description,
  endpoints,
  open,
  onToggle,
  openOps,
  onToggleOp,
}: {
  tag: string;
  description: string;
  endpoints: ApiEndpointDef[];
  open: boolean;
  onToggle: () => void;
  openOps: Set<string>;
  onToggleOp: (id: string) => void;
}) {
  return (
    <div className="swagger-tag" id={`tag-${tag}`}>
      <button className="swagger-tag-head" onClick={onToggle} aria-expanded={open}>
        <span>
          <h2 style={{ display: "inline" }}>{tag}</h2>
          <span className="desc">{description}</span>
        </span>
        <span className={`swagger-chevron${open ? " open" : ""}`}>▾</span>
      </button>
      {open && (
        <div className="swagger-tag-body">
          {endpoints.map((ep) => (
            <ApiEndpoint key={ep.id} def={ep} open={openOps.has(ep.id)} onToggle={() => onToggleOp(ep.id)} />
          ))}
        </div>
      )}
    </div>
  );
}
