# Code Summary — U2 model-attribution(実効 model 属性と started 面)

**Unit**: U2(C-3 model 解決 + C-6 残り + C-5 model/started 配線)— Issue #2279 / FR-3
**実装環境**: worktree `.amadeus/worktrees/bolt-u2-model-attribution`(ブランチ `bolt-u2-model-attribution`)、起点 `7667586f9`(U1 着地済み)
**完了条件**: AC-4(4 解決ケース + Codex fixture 注入)/ AC-5(供給なしハーネスで欠落明示 + emit 継続)

## 変更ファイル一覧

### 実装(packages/framework — 正本、NFR-1)

| ファイル | 変更 | 対応 |
|---|---|---|
| `core/tools/amadeus-subagent-observability.ts` | `ModelSource` / `ModelResolution` / `ModelResolutionInput` / `resolveEffectiveModel`(純関数)と `PersonaPinResolution` / `resolvePersonaPin`(node:fs・throw しない)を追加。frontmatter 切出しを `frontmatterOf` / `frontmatterScalar` に抽出し既存 `personaNameOf` と共通化 | C-3 / FR-3a / ADR-3 |
| `core/tools/amadeus-lib.ts` | `ClaudeCodeHookInput` に `model?: string`(FR-3c)。`subagentStartFields(payload, agentsDir?)` に `enrichSubagentAttribution`(照合 + model 解決・外周 catch)を追加 — 第2引数省略時は従来挙動のまま(既存呼出し非破壊) | C-5 started / BR-U2-4 |
| `core/hooks/amadeus-log-subagent-start.ts` | `join(projectDir, harnessDir(), "agents")` を `subagentStartFields` へ渡し、fields literal に `Type Verdict` / `Model` / `Model Source` の3キーを条件付き様式で追加(t385 admission guard の静的読取を維持) | C-5 started 配線 |
| `core/hooks/amadeus-log-subagent.ts` | U1 差し込み点に `modelResolutionFor` を追加 — `harnessModel = parsed.model`(string 防御)、`requestedModel = undefined`(completed payload に tool_input 無し — コメントで契約可視化、BR-U2-5)、`personaPin` は verdict === "persona" のときのみ。catch で null 縮退・属性スキップ・emit 継続 | C-5 completed / BR-U2-5 |
| `core/otel/event-registry.ts` | STARTED optional += `"Type Verdict","Model","Model Source"`、COMPLETED optional += `"Model","Model Source"`。required 不変・canonical count 不変(事前実測で U1 着地状態を確認し二重登録なし — BR-U2-4 の留保解消) | C-6 / NFR-4 |

### テスト

| ファイル | 内容 |
|---|---|
| `tests/unit/t453-subagent-model-resolve.test.ts`(新設) | `resolveEffectiveModel` — AC-4 の 4 ケース + 優先順対照 3 件 + trim 規約 3 件(計 10)。covers `function:resolveEffectiveModel` |
| `tests/integration/t454-subagent-model-attribution.integration.test.ts`(新設) | `resolvePersonaPin` 実 FS 6 ケース(basename ≠ `name:` 対照・重複先勝ち含む)+ completed hook 3 件(Codex fixture 注入 = harness 段 / pin 段 / AC-5)+ started hook 4 件(request / pin / harness / fail-open)(計 13)。covers `function:resolvePersonaPin` + 両 hook |
| `tests/.coverage-registry.json` | `bun tests/gen-coverage-registry.ts` で機械再生成 — t454 が両 hook unit へ mechanism `cli` で登録 |
| `tests/helpers/harness-lib-fixture.ts` / `tests/integration/t131-hooks-settings-fire.test.ts` / `tests/integration/t91.test.ts` / `tests/unit/t07-hook-audit-logger.serial.test.ts` | amadeus-lib.ts の新規静的依存(`./amadeus-subagent-observability.ts`)を選択コピー型 fixture の sibling リストへ追記(回帰修正 — Deviations 参照) |

## 主要な実装判断

- **ADR-3(観測値 > 要求値 > 宣言値)**: `resolveEffectiveModel` は harness → request → pin の先勝ち。`resolved` は `model` と `source` を必ず対で運ぶ判別 union とし、source 無しの model を型で表現不能にした(security-design の閉語彙統制)。値は逐語保持 — trim は presence 判定のみに使う(`normalizeAgentType` と同規約)
- **ADR-5(欠落 = 属性不在)**: `unresolved` のとき両属性を書かない。`Model: "unknown"` 等の捏造値は経路として存在しない。対書き不変条件(resolved なら必ず2属性)により片割れの中間状態を作らない
- **NFR-3(fail-open)**: 二層構造 — `resolvePersonaPin` は契約上 throw せず `{pin, warnings}` を返し(「model 無し frontmatter」は正当状態として warnings に積まない)、呼出し側の外周 catch が予期せぬ throw を吸収して属性スキップ・emit 継続。catch は started(`enrichSubagentAttribution`)/ completed(`modelResolutionFor`)の2配線点に1:1で配置
- **NFR-4(スキーマ互換)**: registry 追加は optional のみ。t385 admission guard・t-otel-event-registry が緑であることを実測
- **pin 引き当て規則**: `agentsDir` 走査 + frontmatter `name:` 完全一致(basename 決め打ち禁止 — FD i2 BLOCKER 是正の執行)。重複は走査順先勝ち + warnings 1件。`agentType` を path 構成に使わないため path traversal の余地もない
- **started 面の休眠(CON-2)**: 配線は Claude Code では #2303/#2297 未修正のため発火しないが、kimi role-start 経路では live。テストは両 payload 形状(PreToolUse{Task} / SubagentStart)で駆動
- **`guard-announcement-callsite-count` 実測**: stderr 書込は completed 面5箇所(U1 の3 + U2 の2)、started 面4箇所(集約関数内)— 面ごとに1集約点、重複なし。1発火あたり高々 warnings 件数 + advisory 1行

## テストカバレッジ(AC 対応表)

| AC | 実測 |
|---|---|
| AC-4 harness | t453(harness 単独・harness>request・harness 全在)+ t454: Codex fixture(`payloads.json` の `subagentStop`、逐語断片 `"model": "openai.gpt-5.5"` の存在 assert 付き — BR-U2-8)を completed hook へ注入し `Model: openai.gpt-5.5` / `Model Source: harness` を実測。started 面でも payload `model` 供給で harness 勝ちを固定 |
| AC-4 request | t453(request 単独・request>pin)+ t454: started 面 `tool_input.model: claude-opus-4-7` で `Model Source: request` |
| AC-4 pin | t453(pin 単独)+ t454: ピン付き fixture persona を seed し completed/started 両面で `Model Source: pin` |
| AC-4 unresolved | t453(全欠落・空白のみ)+ t454: AC-5 テストで属性欠落を実測 |
| AC-5 | t454: model 無し payload + 非 persona 型(`general-purpose`)で `Model`/`Model Source` が**キーごと不在**かつ SUBAGENT_COMPLETED 行が書かれる(emit 継続)。started 面の agents dir 不在 fail-open も同テストで固定 |

## 検証コマンドと結果(全て実 exit code 0)

- `bun test tests/unit/t451-subagent-type-classify.test.ts tests/unit/t453-subagent-model-resolve.test.ts tests/integration/t452-subagent-observability.integration.test.ts tests/integration/t454-subagent-model-attribution.integration.test.ts` — **36 pass / 0 fail**(t451: 13、t452: 10、t453: 10、t454: 13)
- 回帰スイープ 19 ファイル(t451/t452/t453/t454 + t-subagent-purpose + t-log-subagent-start + t385 + t-otel-event-registry + t131 + t91 + t07 + t144 + t269 + t09 + t13 + t208 + t211 + t365 + t-kimi-adapter)— **256 pass / 0 fail**
- `bun run build` — 全8ハーネス再生成・promote-self 同期(NFR-1)
- `bun run lint` — エラー 0(警告 423 / info 11 は既存ベースラインの cognitive-complexity 等、変更ファイルに新規指摘なし)
- `bun run typecheck` — クリーン
- `bun tests/gen-coverage-registry.ts --check` — OK(fresh, guards green, ratchet held)

## Deviations(設計との差分の申告)

1. **選択コピー型 fixture 4件の sibling リスト追跡(回帰修正)**: business-logic-model の「lib → observability の一方向 import」は設計どおりだが、amadeus-lib.ts を**単独コピー**してスケルトンを組む fixture(t131 / t91 / t07 / tests/helpers/harness-lib-fixture.ts — t144/t269 が共用)が新規静的依存の解決に失敗し、t131 で 4 件の赤として顕在化した(audit-logger / runtime-compile が exit 1 — モジュールグラフ解決失敗)。設計自体は変更せず、各 fixture の sibling リストへ `amadeus-subagent-observability.ts` を既存様式(コメント付き列挙)で追記して修正。全数 grep で他の選択コピー点が無いことを確認済み(残りはディレクトリ丸ごとコピー)。U1 が lib から import されなかったため顕在化しなかった潜伏構造であり、U2 の lib import が初のトリガ
2. **`subagentStartFields` の第2引数は optional**: component-methods は引数追加を明示しないが、既存呼出し(t-subagent-purpose 等の単体テスト)を非破壊に保つため `agentsDir?: string` とした。省略時は従来3フィールドのみを返す(後方互換)
3. **重複 `name:` ケースのテスト追加**: BR-U2-7 の5ケースに domain-entities の「重複は先勝ち + warnings 1件」を固定する1件を追加(設計内の規定で、新規設計判断ではない)

逸脱ではないが記録: t454 は最初 mechanism `none` と機械判定された(spawn argv が関数パラメータ経由で静的解決不能)ため、hook 別 wrapper(runStopHook / runStartHook)に分割して t452 と同じ `cli` 判定に揃えた。
