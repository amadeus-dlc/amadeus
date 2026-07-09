# Code Summary — delegate-rejection(#685)

> ビルダー: amadeus-developer-agent(worktree `.claude/worktrees/bolt-685-delegate-rejection`、ブランチ `bolt/685-delegate-rejection`、origin/main ベース = #708/#671 込み)。コミット: `a40feef5991d5ccb6f9314730ba16b93a58f5ffe`。

## 変更ファイル

- `packages/framework/core/tools/amadeus-lib.ts` — `humanActedSinceGate(projectDir, verb?)` の verb スコープ化(FR-1.3/1.4)。`verifyDelegatedApproval` → `verifyDelegatedProvenance` へ改名(verb 非依存の共有検証器、旧名シムなし)
- `packages/framework/core/tools/amadeus-state.ts` — `delegate-rejection` サブコマンド追加(`handleDelegateApproval` のミラー、FR-1.1/1.2)、`assertHumanPresentForGateResolution` の verb 引き渡し、usage 更新
- `packages/framework/core/tools/amadeus-audit.ts` — `DELEGATED_REJECTION` を VALID_EVENT_TYPES(71→72)+ EVENT_HEADINGS に登録
- `packages/framework/core/knowledge/amadeus-shared/audit-format.md`、`docs/reference/12-state-machine.md`(EN/JA)— レジストリ行(NFR-3)
- テスト: `tests/unit/t112-delegated-approval.test.ts`(対称カバレッジ + writer プロセステスト)、t28/t81/t111(件数 71→72)、t188(混用挙動の旧コメント訂正)、gen-coverage-registry(t112 の CLI spawn 許可)+ registry 再生成
- dist 4ツリー + `.claude/`/`.codex/` self-install — 同一コミットで再生成(NFR-2)

## 主要実装決定

- 別型 `DELEGATED_REJECTION`(判別フィールドではなく型で verb を区別 — FR-1.4 が型→verb 写像で成立)
- verb スコープ: `"approve"` は検証済み DELEGATED_APPROVAL のみ、`"reject"` は DELEGATED_REJECTION のみ受理(不一致型は人間行為にも resolution 境界にも数えず完全無視)。verb 省略(回答経路・発行 grounding)は両型受理
- 検証は共有 `verifyDelegatedProvenance`(issuer 座標の裏取り、パス形状ガード、fail-closed — FR-1.5)
- エンジン(amadeus-orchestrate.ts)無変更

## テストカバレッジ / 落ちる実証(AC-1d)

- 修正前: exit=1、6 fail / 8 pass。**要の偽成立検出**: `AC-1c: a verified DELEGATED_APPROVAL does NOT open the REJECT gate` — 未修正の `humanActedSinceGate(root,"reject")` が `true` を返す(承認委任だけで reject が通る混用バグの実証)
- 修正後: 14 pass / 0 fail、exit=0

## 検証(最終変更後の実測 exit code)

| コマンド | exit |
|---|---|
| `bun run typecheck` | 0 |
| `bun run lint` | 0(エラー0、既存警告のみ) |
| `bun run dist:check` | 0 |
| `bun run promote:self:check` | 0 |
| `bash tests/run-tests.sh --ci` | 0(271 files / 3961 assertions / 0 failed) |

## 計画からの逸脱

1. coverage registry 再生成 + gen-coverage-registry の EXPECTED_NONE_TO_CLI へ t112 追加(新ユニット検出に伴う同種の同期義務)
2. writer happy-path テストの HUMAN_TURN シードをサブプロセス経由に(`_cloneId` のモジュールキャッシュにより in-process シードでは clone-id が分裂するため。実運用と同型)

設計決定からの逸脱なし。
