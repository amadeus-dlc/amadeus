# Build and Test Results — 260805-cross-harness-resume

上流入力(consumes 全数): code-generation-plan.md、code-summary.md

測定 ref: ブランチ `worktree-tla-kimi-repro`、HEAD `2dfb2a7db`(実装 `73bf309fd`+`f31156e2a`+ゲート同期 `6ec322a9a`+registry 再生成 `2dfb2a7db`)

## ビルド面(build-instructions.md の実行結果)

| コマンド | exit | 備考 |
|---|---|---|
| `bun run typecheck` | 0 | conductor 実行 |
| `bun run lint` | 0 | 423 warnings / 11 infos は既存(エラー 0) |
| `bun run build` | 0 | 8ハーネス dist+self-install 再生成、追跡ファイル不変 |
| `bun run source-only:check` | 0 | |
| `bun tests/no-silent-drop-gate.ts check --base-revision e6179d7c3…` | 0 (`NO_SILENT_DROP_OK`) | base は台帳が束縛する実 base(baseline 再生成コミット `0dd50ce6f` の親)。当初の自己参照 base(HEAD 系)は BASELINE_INVALID — cid:code-generation:c4-260803 の縮退条件どおり帰属証拠にならないため base を実測し直した |

## テスト面

### フルスイート(`bun tests/run-tests.ts --ci --verbose`、log = tests/logs/2026-08-05T22-25-01Z)

**RESULT: PASS — Test files: 845 / Failed files: 0 / Total assertions: 11,209 / Failed assertions: 0**(SDK live 系は AWS credentials 不在で SKIP — 既定の縮退)

到達までの2ゲート赤と是正(いずれも本 intent の変更起因の同期漏れ、当日中に閉包):
1. `tests/integration/t416-registry-drift-guard.integration.test.ts` — dispatch arm が `case SESSION_TAKEOVER_VERB:`(定数)で drift guard の literal 抽出に不可視 → literal 化(`6ec322a9a`)
2. `tests/integration/t-coverage-mechanism-ratchet.test.ts` — `EXPECTED_NONE_TO_CLI` へ t452/t453 未登録 → 追記(`6ec322a9a`)。あわせて `gen-coverage-registry` の STALE → 再生成(`2dfb2a7db`)

### 焦点 run(フルパス指定、`Ran ... across N files` 照合済み)

| run | 内容 | 結果 |
|---|---|---|
| 是正後再確認 | t416 + t-coverage-mechanism-ratchet + t453 | 19 pass / 0 fail / across 3 files |
| CG 裏取り A | t451+t452+t453+t365+t-kimi-adapter+t10-hook-session-start | 113 pass / 0 fail / across 6 files |
| CG 裏取り B/C | t28-audit-event-sync / t48-audit-event-emitters+t52-drift-meta-validation | 7 pass / 22 pass、0 fail |

### 既存 flaky の帰属

CG 段で観測された `tests/e2e/t10-halt-and-ask-discard.test.ts` の 2 fail(builder が未改変 base で同一失敗集合を再現し帰属確定)は、**最終フル run では pass**(Failed files: 0 に包含)。負荷依存の flaky として Issue 起票候補を維持(申し送り)。

## 検証した面と未検証の面(cid:build-and-test:verdict-names-unverified-facets / c2)

- **検証済み**: FR-1〜FR-5 の全 AC(t451/t452/t453/t365/docs)、NFR-1(grep 実測)、NFR-2(t365 6 assert 無改訂 green)、NFR-3(新規テストは integration 層+tmp fixture)、NFR-4(waiver 除去+census 213 不変+registry 同期)
- **未検証(AC 外 — 無条件判定を妨げない)**: coverage patch gate の正規判定は PR CI が正(`cid:code-generation:local-lcov-pre-push`)。waiver 2件除去の被覆確認は PR CI の LCOV で確定する

## 判定

**PASS** — ブロッキング集合(typecheck / lint / source-only / no-silent-drop / フルスイート)全 green。coverage は PR CI へ申し送り。
