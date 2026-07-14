"use client";

import type { ApiEndpointDef } from "./ApiEndpoint";

interface Tag {
  tag: string;
  endpoints: ApiEndpointDef[];
}

export default function DocsNav({
  tags,
  activeId,
  onNavigate,
}: {
  tags: Tag[];
  activeId: string | null;
  onNavigate: (tag: string, id: string) => void;
}) {
  return (
    <nav className="docs-nav" aria-label="Navigasi endpoint">
      {tags.map((t) => (
        <div key={t.tag} className="docs-nav-group">
          <div className="docs-nav-group-title">{t.tag}</div>
          {t.endpoints.map((ep) => (
            <button
              key={ep.id}
              type="button"
              className={`docs-nav-link${activeId === ep.id ? " active" : ""}`}
              onClick={() => onNavigate(t.tag, ep.id)}
            >
              <span className={`m ${ep.method.toLowerCase()}`}>{ep.method}</span>
              <span className="p">{ep.summary}</span>
            </button>
          ))}
        </div>
      ))}
    </nav>
  );
}
