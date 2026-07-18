# Business Logic Model — driver-contract-core(swarm-dispatch-enum / Issue #1157)

上流入力(consumes 全数): `unit-of-work.md`、`unit-of-work-story-map.md`、`requirements.md`、`components.md`、`component-methods.md`、`services.md`。

## resolveDriver の決定表(FR-1 の全セル確定 — matrix テストの正)

`resolveDriver(raw: string | undefined, harness: HarnessName): DriverResolution`(`component-methods.md` の signature)。raw は `AMADEUS_USE_SWARM` の生値(trim しない — 空白付き値は未知値として rejected。正規化写像を持たない C-06)。

| raw \ harness | claude | codex | kiro | kiro-ide |
|---|---|---|---|---|
| undefined(unset) | selected: subagent | selected: subagent | selected: subagent | selected: subagent |
| "claude-ultra" | selected: claude-ultra | degraded: subagent, requested=claude-ultra | degraded: subagent, requested=claude-ultra | degraded: subagent, requested=claude-ultra |
| "codex-ultra" | degraded: subagent, requested=codex-ultra | selected: codex-ultra | degraded: subagent, requested=codex-ultra | degraded: subagent, requested=codex-ultra |
| "1"・""・その他すべて | rejected: unknown-value | rejected: unknown-value | rejected: unknown-value | rejected: unknown-value |

- 16 セル全数をこの表のとおり in-process テストで検証する(受け入れ = 表と実装出力の同値)
- 注: `""`(空文字列)は「設定済みだが値なし」であり unset と区別して rejected(fail-closed 側へ倒す — C-03 の副作用ゼロ原則。unset だけが floor への既定)
- `selected: claude-ultra` の後段(Workflow tool 不在時の loud-degrade)は **conductor prose の責務**(C3)であり resolveDriver は関与しない — resolve は env×harness の静的決定のみを所有(実行時 tool 可用性は入力にない。SKILL が degrade 時に `--degraded-from claude-ultra` を渡す既存経路)

## resolve CLI の写像(C-16 実行時面)

1. `resolve --harness <name>` は `process.env.AMADEUS_USE_SWARM` を読み `resolveDriver` を呼ぶ
2. selected / degraded → stdout に JSON 1 行、exit 0
3. rejected → 既存 `fail` idiom(swarm.ts 実測: `console.error(JSON.stringify({error: msg}))` + exit 1)に従い stderr へ `{"error": ...}`、exit 1。**stdout には何も出さない**(stdout-directive-stderr-advisory と整合)
4. `--harness` 不正値(HarnessName 外)も同 idiom で exit 1(未知 harness は decision 不能 — fail-closed)

## 副作用境界(FR-2)

resolve は読み取り専用(env 読み+stdout/stderr のみ)。audit emit・worktree・spawn を一切行わない — SWARM_DEGRADED の emit は従来どおり prepare の `--degraded-from` 経路(:402-407 → emitSwarmDegraded :285)に単一化し、emit 面の対称(resolve=読み / prepare=書き)を保つ。
