import { useState } from "react";

type CopyableCodeBlockProps = {
  code: string;
  label: string;
  note?: string;
};

export async function copyTextToClipboard(text: string) {
  await navigator.clipboard.writeText(text);
}

export function CopyableCodeBlock({ code, label, note }: CopyableCodeBlockProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await copyTextToClipboard(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <article className="contribution-command-card">
      <div className="contribution-command-head">
        <div>
          <h3 className="registry-subsection-title">{label}</h3>
          {note ? <p className="registry-detail-note contribution-command-note">{note}</p> : null}
        </div>
        <button
          className="contribution-copy-button"
          type="button"
          onClick={() => {
            void handleCopy();
          }}
        >
          {copied ? "Copied" : "Copy command"}
        </button>
      </div>
      <pre className="registry-command-block contribution-command-block">{code}</pre>
    </article>
  );
}
