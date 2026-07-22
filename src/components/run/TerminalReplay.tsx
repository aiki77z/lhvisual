import { type CSSProperties, useEffect, useState } from "react";
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

type LoadedLane = {
  blocks: TerminalBlock[];
  columns: number;
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

function truncateText(text: string, maxLength = 132) {
  const normalized = shortCommand(text);
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength - 1)}...` : normalized;
}

function isRunnerCommand(line: string) {
  return /^cd \/workspace && .+plain_openai_responses_agent\.py\b/.test(line);
}

function extractJsonString(payload: string, key: string) {
  const match = payload.match(new RegExp(`"${key}"\\s*:\\s*"((?:\\\\.|[^"\\\\])*)"`));
  return match?.[1]?.replace(/\\"/g, '"').replace(/\\\\n/g, " ");
}

function extractJsonNumber(payload: string, key: string) {
  return payload.match(new RegExp(`"${key}"\\s*:\\s*(\\d+)`))?.[1];
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
      return `{"command": "${truncateText(parsed.command)}"}`;
    }

    if (tool === "read_file" && parsed.path) {
      const offset = parsed.offset === undefined ? "" : `, "offset": ${parsed.offset}`;
      const limit = parsed.limit === undefined ? "" : `, "limit": ${parsed.limit}`;
      return `{"path": "${parsed.path}"${offset}${limit}}`;
    }

    if (tool === "write_file" && parsed.path) {
      const contentLength =
        "content" in parsed && typeof parsed.content === "string" ? `, "content": "...${parsed.content.length} chars"` : "";
      return `{"path": "${parsed.path}"${contentLength}}`;
    }
  } catch {
    // The cast is terminal output, so wrapped JSON can be incomplete. Fall back to the visible text.
  }

  const command = extractJsonString(payload, "command");
  const path = extractJsonString(payload, "path");
  const offset = extractJsonNumber(payload, "offset");
  const limit = extractJsonNumber(payload, "limit");

  if (tool === "bash" && command) {
    return `{"command": "${truncateText(command)}"}`;
  }

  if ((tool === "read_file" || tool === "write_file") && path) {
    const offsetPart = offset ? `, "offset": ${offset}` : "";
    const limitPart = limit ? `, "limit": ${limit}` : "";
    const contentPart = tool === "write_file" ? `, "content": "..."` : "";
    return `{"path": "${path}"${offsetPart}${limitPart}${contentPart}}`;
  }

  return truncateText(payload);
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
        if (/^\[agent-\d+\]/.test(line) || /^[\w-]+@[a-f0-9]+:\/workspace#\s*$/.test(line)) {
          return;
        }

        const shellCommand = line.match(/^[\w-]+@[a-f0-9]+:\/workspace#\s+(.+)$/);
        const toolCommand = line.match(/^\[(\d{2}:\d{2}:\d{2})\] \[tool\] ([\w-]+) (.+)$/);
        const toolResult = line.match(/^\[(\d{2}:\d{2}:\d{2})\] \[tool\] ([\w-]+) -> ?(.*)$/);
        const assistantLine = line.match(/^\[(\d{2}:\d{2}:\d{2})\] \[assistant\] ?(.*)$/);
        const agentLine = line.match(/^\[(\d{2}:\d{2}:\d{2})\] \[agent\] ?(.*)$/);

        if (shellCommand || isRunnerCommand(line)) {
          const command = shellCommand?.[1] ?? line;
          pendingCommand = {
            at: event.at,
            kind: "command",
            label: "shell",
            command,
            pieces: [],
          };
          blocks.push(pendingCommand);
          return;
        }

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
  let outputBuffer = "";

  function ensurePytestBlock(at: number) {
    if (pytestBlock) {
      return pytestBlock;
    }

    pytestBlock = {
      at,
      kind: "command",
      label: "verifier",
      command: "bash run-tests.sh (official verifier)",
      pieces: [],
    };
    blocks.push(pytestBlock);
    return pytestBlock;
  }

  function appendTesterLine(at: number, line: string) {
    const target = ensurePytestBlock(at);
    appendPiece(target, at, line);
  }

  function flushOutputBuffer(at: number) {
    if (outputBuffer.length === 0) {
      return;
    }

    appendTesterLine(at, outputBuffer);
    outputBuffer = "";
  }

  function appendTesterText(at: number, text: string) {
    const lines = text.split("\n");

    outputBuffer += lines[0];

    for (let index = 1; index < lines.length; index += 1) {
      flushOutputBuffer(at);
      outputBuffer = lines[index];
    }
  }

  events.forEach((event) => {
    const text = cleanTerminalText(event.text);

    if (text.includes("[tester] waiting")) {
      flushOutputBuffer(event.at);
      blocks.push({
        at: event.at,
        kind: "meta",
        label: "tester",
        pieces: [{ at: event.at, text: text.trim(), level: levelForText(text) }],
      });
      return;
    }

    if (text.includes("[tester] start signal observed") || text.includes("===== tester run #")) {
      flushOutputBuffer(event.at);
      blocks.push({
        at: event.at,
        kind: "meta",
        label: "tester",
        pieces: [{ at: event.at, text: text.trim(), level: "success" }],
      });
      return;
    }

    appendTesterText(event.at, text);
  });

  if (events.length > 0) {
    flushOutputBuffer(events[events.length - 1].at);
  }

  return blocks;
}

function parseBlocks(laneId: CastLane["id"], events: CastEvent[]) {
  return laneId === "agent" ? parseAgentBlocks(events) : parseTesterBlocks(events);
}

function blockLevel(block: TerminalBlock, visiblePieces: TerminalPiece[]) {
  return block.level ?? [...visiblePieces].reverse().find((piece) => piece.level)?.level;
}

function blockTag(block: TerminalBlock) {
  if (block.kind === "command" && block.label && !["shell", "verifier"].includes(block.label)) {
    return `[tool] ${block.label}`;
  }

  if (block.label) {
    return `[${block.label}]`;
  }

  return block.kind === "command" ? "[shell]" : "[output]";
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
  const [terminalColumns, setTerminalColumns] = useState(80);

  useEffect(() => {
    let isMounted = true;

    async function loadCasts() {
      const loaded = await Promise.all(
        lanes.map(async (lane) => {
          const response = await fetch(lane.href);
          const text = await response.text();
          const lines = text.trimEnd().split("\n");
          const header = JSON.parse(lines[0]) as { width?: number };
          const events = lines
            .slice(1)
            .map((line) => {
              const parsed = JSON.parse(line) as [number, string, string];
              const cleaned = cleanTerminalText(parsed[2]);
              return { at: playbackTime(parsed[0]), text: cleaned, level: levelForText(cleaned) };
            })
            .filter((event) => event.text.trim().length > 0);

          return [lane.id, { blocks: parseBlocks(lane.id, events), columns: header.width ?? 80 }] as const;
        }),
      );

      if (!isMounted) {
        return;
      }

      const loadedByLane = Object.fromEntries(loaded) as Record<CastLane["id"], LoadedLane>;
      const nextBlocks = Object.fromEntries(
        Object.entries(loadedByLane).map(([laneId, lane]) => [laneId, lane.blocks]),
      ) as Record<CastLane["id"], TerminalBlock[]>;

      setBlocksByLane(nextBlocks);
      setTerminalColumns(Math.max(...Object.values(loadedByLane).map((lane) => lane.columns), 80));
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

  const terminalStyle = { "--terminal-columns": terminalColumns } as CSSProperties;

  return (
    <div className="terminal-replay" aria-label="Agent and tester asciinema cast replay" style={terminalStyle}>
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
                      <span className="terminal-time">{displayTime(block.at)}</span>
                      {block.command ? (
                        <code>
                          <span className="terminal-tag">{blockTag(block)}</span> {block.command}
                        </code>
                      ) : (
                        <code>
                          <span className="terminal-tag">{blockTag(block)}</span>{" "}
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
