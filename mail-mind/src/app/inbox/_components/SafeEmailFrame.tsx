"use client";

import { useMemo, useRef, useState } from "react";

type SafeEmailFrameProps = {
  html: string;
  className?: string;
};

const BLOCKED_TAGS = new Set([
  "script",
  "style",
  "iframe",
  "object",
  "embed",
  "link",
  "meta",
  "form",
  "input",
  "button",
  "select",
  "textarea",
]);

function sanitizeEmailHtml(html: string) {
  if (typeof window === "undefined") return "";

  const parser = new DOMParser();
  const document = parser.parseFromString(html, "text/html");

  for (const element of Array.from(document.body.querySelectorAll("*"))) {
    const tagName = element.tagName.toLowerCase();
    if (BLOCKED_TAGS.has(tagName)) {
      element.remove();
      continue;
    }

    for (const attr of Array.from(element.attributes)) {
      const name = attr.name.toLowerCase();
      const value = attr.value.trim().toLowerCase();
      const isUrlAttr = name === "href" || name === "src" || name === "xlink:href";

      if (
        name.startsWith("on") ||
        value.startsWith("javascript:") ||
        value.startsWith("vbscript:") ||
        (isUrlAttr && value.startsWith("data:") && !value.startsWith("data:image/"))
      ) {
        element.removeAttribute(attr.name);
      }
    }
  }

  for (const link of Array.from(document.body.querySelectorAll("a"))) {
    link.setAttribute("target", "_blank");
    link.setAttribute("rel", "noopener noreferrer");
  }

  return `<!doctype html>
<html>
  <head>
    <base target="_blank" />
    <style>
      html, body { margin: 0; padding: 0; background: transparent; color: inherit; font: inherit; }
      body { overflow-wrap: anywhere; }
      img, table { max-width: 100%; }
      table { border-collapse: collapse; }
      a { color: inherit; }
    </style>
  </head>
  <body>${document.body.innerHTML}</body>
</html>`;
}

export function SafeEmailFrame({ html, className }: SafeEmailFrameProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(120);
  const srcDoc = useMemo(() => sanitizeEmailHtml(html), [html]);

  const resize = () => {
    const body = iframeRef.current?.contentDocument?.body;
    if (!body) return;
    setHeight(Math.max(80, body.scrollHeight));
  };

  return (
    <iframe
      ref={iframeRef}
      title="Email content"
      srcDoc={srcDoc}
      sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin"
      onLoad={resize}
      className={className}
      style={{ width: "100%", height, border: 0, display: "block" }}
    />
  );
}
