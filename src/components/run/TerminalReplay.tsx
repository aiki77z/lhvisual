import { terminalEvents } from "../../data/caseReplay";

const lanes = [
  { id: "agent", label: "Agent docker", prompt: "agent@workspace" },
  { id: "verifier", label: "Test / verifier docker", prompt: "tester@host_wrapped" },
] as const;

type TerminalReplayProps = {
  activeTime: string;
};

export function TerminalReplay({ activeTime }: TerminalReplayProps) {
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
              .filter((event) => event.lane === lane.id && event.at <= activeTime)
              .map((event, index) => (
                <p
                  className={`terminal-line${event.nodeId ? " terminal-line-active" : ""}${
                    event.level ? ` terminal-line-${event.level}` : ""
                  }`}
                  key={`${event.at}-${event.text}`}
                  style={{ animationDelay: `${Math.min(index * 0.08, 0.8)}s` }}
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
