# Code Summary — fix-2297-wiring

上流入力(consumes 全数): requirements（`inception/requirements-analysis/requirements.md` — 本 unit の設計正本。FR-A1〜A4 / AC-A1〜A4 をここから直接スコープした。self-fix scope は units-generation を SKIP するため unit-of-work.md は不在 = consumes_absent expected:true）

- Unit: fix-2297-wiring（degrade 2-unit 構成の Unit A — Issue #2297）
- Test Strategy: Comprehensive
- トレーサビリティ: 全変更は captured intent（#2297）と requirements FR-A1〜A4 / AC-A1〜A4 へ遡る。user stories は scope SKIP のため intent 直結。

## 裁定系譜

**E-SSP-CGDEV**（2-0、choice 1）— builder が実装前停止した逸脱の裁定。FR-A1（HOOK_PATHS へ log-subagent-start 追加）が `tests/integration/hook-dispatcher.integration.test.ts` の3重ピン（KNOWN_SLUGS 10要素ハードコード・`:112 toHaveLength(11)`・writeCompleteHookTree の10 slug 固定）と構造的に両立しないことを注入実測（ベース 9 pass → 注入 3 pass/6 fail、波及は同1ファイル限局)で確定した上で、**許可集合へ同テストを追加し、ピン群を dispatcher の HOOK_PATHS（export 化・挙動不変）から導出する形へ改訂**を採用。留保2件（下記対応済み）付き。記録: `amadeus/spaces/default/elections/260807-e-ssp-cgdev/record.md`。

## 変更ファイル（5件）

| ファイル | 変更 |
|---|---|
| `packages/framework/harness/claude/hooks/amadeus-dispatch.ts` | FR-A1 — HOOK_PATHS へ `"log-subagent-start": ".claude/hooks/amadeus-log-subagent-start.ts"` スロット追加 + `HOOK_PATHS` の export 化（挙動不変。export は HOOK_PATHS のみ — `grep "^export"` は HOOK_PATHS と既存 main の2件のみ = 留保3充足） |
| `.claude/settings.json` | FR-A2 — PreToolUse エントリ（matcher `^Task$`、dispatcher 形 `bun "${CLAUDE_PROJECT_DIR:-.}/.claude/hooks/amadeus-dispatch.ts" log-subagent-start`）を追加 |
| `.claude/hooks/amadeus-dispatch.ts` | `bun run build` による self-install 投影（正本と diff 一致を確認） |
| `tests/integration/hook-dispatcher.integration.test.ts` | 裁定による導出形改訂 — KNOWN_SLUGS / 件数 assert / writeCompleteHookTree を export された HOOK_PATHS から導出 |
| `tests/integration/t483-claude-live-settings-inclusion.integration.test.ts`（新規） | FR-A3 drift ガード — 正本 `settings.json.example` と live `.claude/settings.json` を `(event, matcher, hook script 名)` の3つ組で「example 集合 ⊆ live 集合」包含検査。既知欠落 allowlist は `plugin-compose` 1件のみ（Issue 参照 + 理由の2フィールド必須・空文字拒否の負ケース同梱 = AC-A4） |

共有台帳 `tests/.coverage-registry.json` は未接触（t483 は CLI を spawn しないため mechanism ratchet green — 再生成不要を実測）。

## 裁定留保への対応

1. **留保1（件数 11 の導出式）**: `DUPLICATE_SLUG_REFERENCES = 1` を名前付き定数として分離し、`EXPECTED_HOOK_REFERENCES = KNOWN_SLUGS.length + DUPLICATE_SLUG_REFERENCES` の導出式を明示。「2つ目の重複 slug が現れたら手動更新が必要」をテストコメントと plan の両方に明記（全自動追随とは主張しない）。既存の mint-presence 2件 assert は `1 + DUPLICATE_SLUG_REFERENCES` へ書き換えて重複所在の pin として併用。
2. **留保2（テスト名の件数語）**: `settings route every hook reference through the dispatcher's slug table` へ count-free 化。
3. **留保3（export 範囲）**: HOOK_PATHS のみ。内部ヘルパーは非 export のまま。
4. **留保4（挙動不変の実証）**: 既存 dispatcher テスト再実行 + `bun run build` 再生成 + `bun run source-only:check` = clean（下表）。

## Red / Green 実測

**Red（実装前、t483）** — 3 pass / 2 fail, exit 1

```
error: example hooks absent from .claude/settings.json (see #2297)
- []
+ [ "PreToolUse|^Task$|amadeus-log-subagent-start.ts" ]
error: live PreToolUse wires amadeus-log-subagent-start.ts
Received: undefined
```

包含検査が #2297 の欠落そのものを名指しで検出（AC-A1 の逆面 = TDD Red）。

**Green（FR-A1 + FR-A2 + build 後）** — t483: 5 pass / 0 fail / 13 expect, exit 0

エンジン側の実配線も end-to-end で確認: `bun .claude/hooks/amadeus-dispatch.ts log-subagent-start` = exit 0（フック実走の証拠として Unit B 実装の advisory を出力）。AC-A2 の fail-closed も保存 — `bogus-slug` は exit 1 で 11 slug を列挙して拒否。

## 落ちる実証（AC-A3）

1. 事前ハッシュ記録 `b43a9aac795d3ffa...`
2. live から PreToolUse エントリを除去 → **3 pass / 2 fail**（Red と同一の2 assertion が赤）
3. 復元 → `shasum -c` = OK（バイト同一）
4. 復元後 5 pass / 0 fail

注入→赤→復元→残渣ゼロの不可分1セットで完了。

## 検証コマンドと exit code

| コマンド | exit |
|---|---|
| `bun run typecheck`（build 前 / 最終） | 0 / 0 |
| `bun run lint` | 0（warning 443 は既存分 — 自変更3ファイルは診断 0 件） |
| `bun run build`（初回 / 再実行） | 0 / 0 |
| `bun run source-only:check` | 0（source-only boundary: clean） |
| t483 単体 | 0（5 pass） |
| hook-dispatcher.integration | 0（9 pass / 46 expect） |
| AC-A2 リスト 5ファイル（t131/t03/t40/t132/t327） | 0（47 pass） |
| ピン留め疑い 6ファイル（t01/t02/t06/t416×2/t418） | 0（48 pass） |
| mechanism ratchet | 0（2 pass） |
| test-size drift + t258 boundary | 0（20 pass） |
| settings 読取テスト 7ファイル（t223×2/t228/t80/t27/t153/t418-int） | 0（109 pass） |
| 最終統合 7ファイル | 0（61 pass / 156 expect） |

## PR レビュー是正（#2427 CodeRabbit）

PR 発行後の CodeRabbit 指摘（Minor・正当）を収束ループ内で是正した: example に存在しない (event, script) の waiver が無音通過し、将来のフック欠落を事前許可できる抜け道 → t483 へ「every waiver targets a hook the example actually declares」を追加（c1f838b8b）。落ちる実証: ghost waiver 注入で新 assertion が赤（1 fail）→ 除去で 6 pass 復帰を実測。t483 は最終 **6 pass / 0 fail / 14 expect**。スレッドは返信 + resolve 済み。

## テスト採番

**t483** を使用。2面確認: 自 worktree `tests/*/` 全走査で最大 t481（t482 不在）、`git ls-tree -r --name-only origin/main tests/` で origin/main は t480〜t482 使用済み・t483 未使用。マージ直前に固定 base SHA での再確認を要する（`cid:code-generation:c1-tnnn-collision-on-regrounding`）。

## 逸脱

裁定済みの1件（hook-dispatcher テストのピン留め改訂 — E-SSP-CGDEV choice 1 承認範囲内）のみ。新規の未申告逸脱なし。t483 の allowlist プレースホルダは conductor が Issue **#2426** を起票のうえ確定番号へ差し替え済み（差し替え後 t483 = 5 pass / 0 fail を再実測）。git commit・state 変更コマンドは不実行。

## 隔離規律

Unit B の患部（`amadeus-lib.ts` / core hooks / doc 群 / subagent テスト群 / coverage registry）は一切未接触。
