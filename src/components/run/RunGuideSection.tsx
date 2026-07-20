type RunGuideSectionProps = {
  title: string;
  body: string;
  commands: string[];
};

export function RunGuideSection({ title, body, commands }: RunGuideSectionProps) {
  return (
    <section className="run-guide-section">
      <h2>{title}</h2>
      <p>{body}</p>
      <pre className="command-block">
        <code>{commands.join("\n")}</code>
      </pre>
    </section>
  );
}
