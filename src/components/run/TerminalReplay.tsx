import { useEffect, useState } from "react";
import { caseSummary } from "../../data/caseReplay";

type CastLane = {
  id: "agent" | "tester";
  label: string;
  prompt: string;
  href: string;
};

type CastEvent = {
  at: number;
  text: string;
  level?: "success" | "warning" | "error";
};

type TerminalPiece = CastEvent;

type TerminalBlock = {
  at: number;
  kind: "command" | "meta" | "assistant" | "output";
  label?: string;
  command?: string;
  pieces: TerminalPiece[];
  level?: CastEvent["level"];
};

const lanes: CastLane[] = [
  { id: "agent", label: "Agent docker", prompt: "agent@workspace", href: caseSummary.castHref },
  { id: "tester", label: "Test / verifier docker", prompt: "tester@host_wrapped", href: caseSummary.testerCastHref },
];

const ansiPattern = /\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~]|\][^\x07]*(?:\x07|\x1B\\))/g;

function cleanTerminalText(value: string) {
  return value
    .replace(ansiPattern, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[^\S\n]+$/gm, "");
}

function playbackTime(realSeconds: number) {
  return realSeconds <= 30 ? realSeconds * 0.28 : 8.4 + (realSeconds - 30) * 0.025;
}

function displayTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const rest = Math.floor(seconds % 60);
  return `${minutes}:${rest.toString().padStart(2, "0")}`;
}

function levelForText(text: string): CastEvent["level"] {
  if (/NotImplementedError|FAILED|failed| \bF+\b|\^C/.test(text)) return "error";
  if (/corrupted|restored|warning/i.test(text)) return "warning";
  if (/exit=0|patched|PASSED|passed/.test(text)) return "success";
  return undefined;
}

function decodeEscapedOutput(text: string) {
  return text.replace(/\\n/g, "\n").replace(/\\t/g, "\t");
}

function shortCommand(command: string) {
  return command.replace(/\s+/g, " ").trim();
}

function parseToolCommand(tool: string, payload: string) {
  try {
    const parsed = JSON.parse(payload) as {
      command?: string;
      path?: string;
      offset?: number;
      limit?: number;
    };

    if (tool === "bash" && parsed.command) {
      return shortCommand(parsed.command);
    }

    if (tool === "read_file" && parsed.path) {
      const offset = parsed.offset === undefined ? "" : ` offset=${parsed.offset}`;
      const limit = parsed.limit === undefined ? "" : ` limit=${parsed.limit}`;
      return `read_file ${parsed.path}${offset}${limit}`;
    }
  } catch {
    // The cast is terminal output, so wrapped JSON can be incomplete. Fall back to the visible text.
  }

  return `${tool} ${payload}`.trim();
}

function appendPiece(block: TerminalBlock, at: number, text: string) {
  const decoded = decodeEscapedOutput(text).trimEnd();

  if (decoded.trim().length === 0) {
    return;
  }

  block.pieces.push({ at, text: decoded, level: levelForText(decoded) });
}

function parseAgentBlocks(events: CastEvent[]) {
  const blocks: TerminalBlock[] = [];
  let pendingCommand: TerminalBlock | undefined;

  events.forEach((event) => {
    cleanTerminalText(event.text)
      .split("\n")
      .map((line) => line.trimEnd())
      .filter(Boolean)
      .forEach((line) => {
        const toolCommand = line.match(/^\[(\d{2}:\d{2}:\d{2})\] \[tool\] ([\w-]+) (.+)$/);
        const toolResult = line.match(/^\[(\d{2}:\d{2}:\d{2})\] \[tool\] ([\w-]+) -> ?(.*)$/);
        const assistantLine = line.match(/^\[(\d{2}:\d{2}:\d{2})\] \[assistant\] ?(.*)$/);
        const agentLine = line.match(/^\[(\d{2}:\d{2}:\d{2})\] \[agent\] ?(.*)$/);

        if (toolResult) {
          const [, , tool, result] = toolResult;
          const target =
            pendingCommand?.label === tool
              ? pendingCommand
              : [...blocks].reverse().find((block) => block.kind === "command" && block.label === tool);

          if (target) {
            appendPiece(target, event.at, result);
          } else {
            blocks.push({
              at: event.at,
              kind: "output",
              pieces: [{ at: event.at, text: decodeEscapedOutput(result), level: levelForText(result) }],
              level: levelForText(result),
            });
          }

          pendingCommand = undefined;
          return;
        }

        if (toolCommand) {
          const [, , tool, payload] = toolCommand;
          pendingCommand = {
            at: event.at,
            kind: "command",
            label: tool,
            command: parseToolCommand(tool, payload),
            pieces: [],
          };
          blocks.push(pendingCommand);
          return;
        }

        if (assistantLine) {
          const [, , text] = assistantLine;
          blocks.push({
            at: event.at,
            kind: "assistant",
            label: "assistant",
            pieces: [{ at: event.at, text, level: levelForText(text) }],
          });
          return;
        }

        if (agentLine) {
          const [, , text] = agentLine;
          blocks.push({
            at: event.at,
            kind: "meta",
            label: "agent",
            pieces: [{ at: event.at, text, level: levelForText(text) }],
          });
          return;
        }

        if (line.trim() === "^C") {
          blocks.push({
            at: event.at,
            kind: "command",
            command: "^C",
            pieces: [],
            level: "error",
          });
          return;
        }

        if (pendingCommand) {
          appendPiece(pendingCommand, event.at, line);
          return;
        }

        blocks.push({
          at: event.at,
          kind: "output",
          pieces: [{ at: event.at, text: decodeEscapedOutput(line), level: levelForText(line) }],
          level: levelForText(line),
        });
      });
  });

  return blocks;
}

function parseTesterBlocks(events: CastEvent[]) {
  const blocks: TerminalBlock[] = [];
  let pytestBlock: TerminalBlock | undefined;
  let progressBuffer = "";

  function flushProgress(at: number) {
    if (!pytestBlock || progressBuffer.length === 0) {
      return;
    }

    appendPiece(pytestBlock, at, progressBuffer);
    progressBuffer = "";
  }

  events.forEach((event) => {
    const text = cleanTerminalText(event.text);

    if (text.includes("[tester] waiting")) {
      blocks.push({
        at: event.at,
        kind: "meta",
        label: "tester",
        pieces: [{ at: event.at, text: text.trim(), level: levelForText(text) }],
      });
      return;
    }

    if (text.includes("[tester] start signal observed")) {
      blocks.push({
        at: event.at,
        kind: "meta",
        label: "tester",
        pieces: [{ at: event.at, text: text.trim(), level: "success" }],
      });
      return;
    }

    if (!pytestBlock) {
      pytestBlock = {
        at: event.at,
        kind: "command",
        label: "pytest",
        command: "pytest /tests",
        pieces: [],
      };
      blocks.push(pytestBlock);
    }

    if (/^F+$/.test(text.trim())) {
      progressBuffer += text.trim();

      if (progressBuffer.length >= 40) {
        flushProgress(event.at);
      }

      return;
    }

    flushProgress(event.at);
    appendPiece(pytestBlock, event.at, text);
  });

  if (events.length > 0) {
    flushProgress(events[events.length - 1].at);
  }

  return blocks;
}

function parseBlocks(laneId: CastLane["id"], events: CastEvent[]) {
  return laneId === "agent" ? parseAgentBlocks(events) : parseTesterBlocks(events);
}

function blockLevel(block: TerminalBlock, visiblePieces: TerminalPiece[]) {
  return block.level ?? [...visiblePieces].reverse().find((piece) => piece.level)?.level;
}

type TerminalReplayProps = {
  playhead: number;
  onDurationChange: (duration: number) => void;
};

export function TerminalReplay({ playhead, onDurationChange }: TerminalReplayProps) {
  const [blocksByLane, setBlocksByLane] = useState<Record<CastLane["id"], TerminalBlock[]>>({
    agent: [],
    tester: [],
  });

  useEffect(() => {
    let isMounted = true;

    async function loadCasts() {
      const loaded = await Promise.all(
        lanes.map(async (lane) => {
          const response = await fetch(lane.href);
          const text = await response.text();
          const events = text
            .trimEnd()
            .split("\n")
            .slice(1)
            .map((line) => {
              const parsed = JSON.parse(line) as [number, string, string];
              const cleaned = cleanTerminalText(parsed[2]);
              return { at: playbackTime(parsed[0]), text: cleaned, level: levelForText(cleaned) };
            })
            .filter((event) => event.text.trim().length > 0);

          return [lane.id, parseBlocks(lane.id, events)] as const;
        }),
      );

      if (!isMounted) {
        return;
      }

      const nextBlocks = Object.fromEntries(loaded) as Record<CastLane["id"], TerminalBlock[]>;
      setBlocksByLane(nextBlocks);
      onDurationChange(
        Math.max(
          ...Object.values(nextBlocks).flatMap((blocks) =>
            blocks.flatMap((block) => [block.at, ...block.pieces.map((piece) => piece.at)]),
          ),
          0,
        ),
      );
    }

    void loadCasts();

    return () => {
      isMounted = false;
    };
  }, [onDurationChange]);

  return (
    <div className="terminal-replay" aria-label="Agent and tester asciinema cast replay">
      {lanes.map((lane) => (
        <section className="terminal-pane" key={lane.id}>
          <header>
            <span>{lane.label}</span>
            <code>{lane.prompt}</code>
          </header>
          <div className="terminal-lines">
            {blocksByLane[lane.id]
              .filter((block) => block.at <= playhead)
              .slice(-42)
              .map((block, index, visibleBlocks) => {
                const visiblePieces = block.pieces.filter((piece) => piece.at <= playhead);
                const output = visiblePieces.map((piece) => piece.text).join("\n");
                const isCurrent = index === visibleBlocks.length - 1;
                const level = blockLevel(block, visiblePieces);

                return (
                  <article
                    className={`terminal-block terminal-block-${block.kind}${
                      level ? ` terminal-block-${level}` : ""
                    }${isCurrent ? " terminal-block-current" : ""}`}
                    key={`${lane.id}-${block.at}-${index}`}
                  >
                    <div className="terminal-command-row">
                      <span>{displayTime(block.at)}</span>
                      {block.command ? (
                        <code>
                          <span className="terminal-prompt">$</span> {block.command}
                        </code>
                      ) : (
                        <code>
                          <span className="terminal-prompt">#</span> {block.label ? `${block.label}: ` : ""}
                          {output}
                        </code>
                      )}
                    </div>
                    {block.command && output ? <pre className="terminal-output">{output}</pre> : null}
                  </article>
                );
              })}
          </div>
        </section>
      ))}
    </div>
  );
}
