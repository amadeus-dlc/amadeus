// covers: function:detectTeamPrerequisites
import { describe, expect, test } from "bun:test";
import {
  detectTeamPrerequisites,
  TEAM_PREREQUISITE_GUIDANCE,
} from "../../packages/framework/core/tools/amadeus-utility.ts";

describe("t265 Team Mode prerequisite detection", () => {
  test("reports both tools in canonical order when found", () => {
    const seen: string[] = [];
    const result = detectTeamPrerequisites(
      { HOME: "/home/test" },
      (command) => {
        seen.push(command);
        return `/resolved/${command.split("/").at(-1)}`;
      },
    );

    expect(seen).toEqual([
      "herdr",
      "/home/test/.agents/skills/agmsg/scripts/send.sh",
    ]);
    expect(result).toEqual([
      { tool: "herdr", found: true, path: "/resolved/herdr" },
      { tool: "agmsg", found: true, path: "/resolved/send.sh" },
    ]);
  });

  test("reports stable guidance for both missing tools", () => {
    expect(detectTeamPrerequisites({}, () => null)).toEqual([
      {
        tool: "herdr",
        found: false,
        guidance: TEAM_PREREQUISITE_GUIDANCE.herdr,
      },
      {
        tool: "agmsg",
        found: false,
        guidance: TEAM_PREREQUISITE_GUIDANCE.agmsg,
      },
    ]);
  });

  test("keeps found and missing result shapes disjoint", () => {
    const result = detectTeamPrerequisites(
      { AGMSG_ROOT: "/opt/agmsg" },
      (command) => (command === "herdr" ? "/bin/herdr" : null),
    );

    expect(result[0]).toEqual({
      tool: "herdr",
      found: true,
      path: "/bin/herdr",
    });
    expect(result[1]).toEqual({
      tool: "agmsg",
      found: false,
      guidance: TEAM_PREREQUISITE_GUIDANCE.agmsg,
    });
  });

  test("honors HERDR and AGMSG_SEND overrides", () => {
    const seen: string[] = [];
    detectTeamPrerequisites(
      {
        HERDR: "/custom/herdr",
        AGMSG_SEND: "/custom/agmsg-send",
        AGMSG_ROOT: "/ignored",
      },
      (command) => {
        seen.push(command);
        return command;
      },
    );

    expect(seen).toEqual(["/custom/herdr", "/custom/agmsg-send"]);
  });

  test("probes each prerequisite exactly once", () => {
    let calls = 0;
    detectTeamPrerequisites({}, () => {
      calls++;
      return null;
    });
    expect(calls).toBe(2);
  });

  test("guidance names official sources and the Team Mode guide", () => {
    expect(TEAM_PREREQUISITE_GUIDANCE.herdr).toContain("https://herdr.dev");
    expect(TEAM_PREREQUISITE_GUIDANCE.agmsg).toContain(
      "https://github.com/j5ik2o/agmsg",
    );
    for (const guidance of Object.values(TEAM_PREREQUISITE_GUIDANCE)) {
      expect(guidance).toContain("docs/guide/20-team-mode.md");
    }
  });
});
