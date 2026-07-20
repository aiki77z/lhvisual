import { terminalEvents } from "../../data/caseReplay";

const lanes = [
  { id: "agent", label: "Agent CLI", prompt: "agent@workspace" },
  { id: "tests", label: "Unit tests", prompt: "pytest" },
  { id: "runner", label: "Acceptance runner", prompt: "verifier" },
] as const;

export function TerminalReplay() {
  return (
    <div className="terminal-replay" aria-label="Agent and test terminal replay">
      {lanes.map((lane) => (
        <section className="terminal-pane" key={lane.id}>
          <header>
            <span>{lane.label}</span>
            <code>{lane.prompt}</code>
          </header>
          <div className="terminal-lines">
            {terminalEvents
              .filter((event) => event.lane === lane.id)
              .map((event, index) => (
                <p
                  className={event.nodeId ? "terminal-line terminal-line-active" : "terminal-line"}
                  key={`${event.at}-${event.text}`}
                  style={{ animationDelay: `${index * 0.32}s` }}
                >
                  <span>{event.at}</span>
                  <code>{event.text}</code>
                </p>
              ))}
          </div>
        </section>
      ))}
    </div>
  );
}
