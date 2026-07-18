# Frontend Components — driver-contract-core(swarm-dispatch-enum / Issue #1157)

上流入力(consumes 全数): `unit-of-work.md`、`unit-of-work-story-map.md`、`requirements.md`、`components.md`、`component-methods.md`、`services.md`。

UI を持たない CLI ユニットのため、本成果物は CLI 出力契約(verdict 別の出力+exit code)として充足する(ui-less-mockups-as-output-contract 準拠、様式は既存兄弟ツール = swarm.ts の JSON 1 行出力に揃える)。

## resolve の出力モック(受け入れ基準とテスト文言の導出元)

| ケース | stdout(1 行 JSON) | stderr | exit |
|---|---|---|---|
| unset @ codex | `{"kind":"selected","driver":"subagent"}` | — | 0 |
| claude-ultra @ claude | `{"kind":"selected","driver":"claude-ultra"}` | — | 0 |
| codex-ultra @ claude | `{"kind":"degraded","driver":"subagent","requested":"codex-ultra"}` | — | 0 |
| "1" @ 任意 | — | `{"error":"AMADEUS_USE_SWARM must be unset or one of: subagent, claude-ultra, codex-ultra — got \"1\""}`(文言は BR-7: 許可値3語の包含で検証) | 1 |
| `--harness bogus` | — | `{"error":"--harness must be one of: claude, codex, kiro, kiro-ide"}`(同上) | 1 |

- conductor(SKILL prose)は stdout JSON の `kind`/`driver` のみを消費する。stderr は人間向け advisory
- 注: env 許可値としての subagent 明示指定は decision table 上「その他」= rejected(許可 raw は unset/claude-ultra/codex-ultra の三状態のみ — C-01)。エラーメッセージの列挙は「とりうる driver」でなく「とりうる設定値」を示す形へ実装時に精密化してよい(BR-7 の非 verbatim 原則の範囲)
