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

## レビュー是正履歴

- **iter2(codecov/patch fail、head 5250090d6)**: bun lcov が関数本体内コメント行に DA:0 を付ける癖により、追加13コメント行が未カバー扱い → コメントブロックを関数外トップレベルへ移設(挙動変更なし)。恒久対処は Issue #730 へ切り出し。
- **iter3(codex NOT-READY、head cd8038550)**: 一般 audit CLI(append/append-raw)が HUMAN_TURN/DELEGATED_* を鋳造可能で、writer テスト自身がこの経路でシードしていた(delegated provenance の信頼前提の破れ、#671 にも波及する共有経路)→ handleAppend/handleAppendRaw 先頭で保護3型を throw 拒否(append-raw は保護 heading + body 内 Event 行の両方)、正規 in-process writer(mint hook / delegate-*)は不変、テストシードはシャード直書き fixture 化、過大主張コメント是正 + 残余脅威(生ファイル書込)明記。落ちる実証: ガード前 5 fail → ガード後 10 pass。パッチ未カバー 0 行を lcov 実測。deslop パス実施(変更なし)。

- **iter4(codex NOT-READY r2、head 18ad6fe50)**: append-raw guard の独自 regex(厳密な `**Event**:` のみ)と consumer 側 canonical parser(`auditBlockField`、leading `- ` 許容)の文法差により、dash-prefix 付き Event 行が rc=0 で鋳造され presence を偽成立させる bypass → guard が `auditBlockField` を共有して body 各行をパースする方式に変更(文法乖離の構造的排除、conductor がインライン是正)。落ちる実証: dash-prefix 3型 process-boundary(GATE_APPROVED シード + humanActedSinceGate=false 維持)+ in-process 1件が修正前 4 fail → 修正後 41 pass。パッチ未カバー 0 行を lcov 実測。

## 計画からの逸脱

1. coverage registry 再生成 + gen-coverage-registry の EXPECTED_NONE_TO_CLI へ t112 追加(新ユニット検出に伴う同種の同期義務)
2. writer happy-path テストの HUMAN_TURN シードをサブプロセス経由に(`_cloneId` のモジュールキャッシュにより in-process シードでは clone-id が分裂するため。実運用と同型)

設計決定からの逸脱なし。
