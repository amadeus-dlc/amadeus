# Code Generation Plan — delegate-rejection(#685)

> Unit: delegate-rejection(Bolt: #685)。上流: requirements.md FR-1(FR-1.1〜FR-1.5)、AC-1a〜1d、NFR-1〜NFR-4、NFR-6。前提: #708(HUMAN_TURN の stdin 分類)と #671(delegate-approval)は main へマージ済み。
> トレーサビリティ: bugfix スコープのため user story は無く、各ステップは FR/AC 番号へ遡る。

## 設計決定(実測済みコードに基づく)

対象正本: `packages/framework/core/tools/amadeus-state.ts`(`handleDelegateApproval`:1462、`assertHumanPresentForGateResolution`:1301、`handleReject`:1548)と `packages/framework/core/tools/amadeus-lib.ts`(`humanActedSinceGate`:1493、`verifyDelegatedApproval`:1545)。

1. **FR-1.1 の選択 = 新イベント型 `DELEGATED_REJECTION`**(判別フィールド方式ではなく別型)。理由: (a) 既存 `DELEGATED_APPROVAL` と型レベルで対称、(b) FR-1.4 の混用不可が「型→verb の写像」だけで成立し判別フィールドのパース・検証面が増えない、(c) レジストリ同期が既存パターンの +1 で済む。フィールドセットは `DELEGATED_APPROVAL` と同一(Stage / Issuer Space / Issuer Intent / Issuer Shard / Issuer Human Ts)+ `Feedback`(却下理由、任意)。
2. **発行側**(FR-1.2): `amadeus-state.ts delegate-rejection <slug> --to-intent <record-dir> [--to-space <space>] [--feedback <text>]` を `handleDelegateApproval` のミラーとして追加。発行元セッションの実 HUMAN_TURN で gate(`humanActedSinceGate` が偽なら拒否)、発行元シャードの最新 HUMAN_TURN timestamp を grounding として記録、ターゲット intent record の実在確認、`DELEGATED_REJECTION` をターゲット audit dir へ emit。
3. **検証側**(FR-1.3/FR-1.5): `verifyDelegatedApproval` の本体を共有ヘルパー(ブロックの issuer 座標検証 — パス形状ガード・シャード実在・HUMAN_TURN timestamp 一致、fail-closed)へ抽出し、`DELEGATED_APPROVAL` / `DELEGATED_REJECTION` の両方が同一の検証を通る。旧名の温存シムは置かない(NFR-4 — 呼び出し側をすべて新形へ置換)。
4. **FR-1.4(混用不可)= `humanActedSinceGate` の verb スコープ化**: シグネチャを `humanActedSinceGate(projectDir, verb?: "approve" | "reject")` に拡張。
   - `verb === "approve"` → 検証済み `DELEGATED_APPROVAL` のみ人間行為として受理(`DELEGATED_REJECTION` は完全に無視 = 人間行為にも resolution 境界にも数えない)。
   - `verb === "reject"` → 検証済み `DELEGATED_REJECTION` のみ受理(`DELEGATED_APPROVAL` は完全に無視)。
   - `verb` 省略(質問回答 `humanActedSinceLastAnswer`、delegate 発行時の grounding 等の従来呼び出し)→ 検証済みの両委任イベントを受理(現行の approve 挙動と同型の一般述語)。
   - `assertHumanPresentForGateResolution` は自身の `verb` 引数をそのまま `humanActedSinceGate` へ渡す — これにより approve/reject の両経路が単一ヘルパー経由のまま FR-1.4 を満たす(現行コードは verb 非依存のため、**DELEGATED_APPROVAL だけで reject が通ってしまう** — これが AC-1c の落ちる実証の注入点)。
5. **イベントレジストリ同期**(NFR-3): 全イベント数 71→72。更新対象は `DELEGATED_APPROVAL` 追加時(#671)と同じ面: `knowledge/amadeus-shared/audit-format.md` のイベント表、`docs/reference/12-state-machine.md`(EN と対応する日本語記述)、`tests/unit/t28-audit-event-sync.test.ts`(件数コメント+レジストリ)、`tests/unit/t81.test.ts`(件数)、`tests/unit/t111.test.ts`(イベント名配列)、`tests/integration/t48-audit-event-emitters.test.ts`(emitter 対応)。着手時に `DELEGATED_APPROVAL` を全リポ grep して同期面の取り漏れゼロを確認(概念移動 grep ノルム)。
6. **エンジン側の変更は不要**: reject のコミット経路は従来どおり `amadeus-state.ts reject <slug> --feedback` (conductor 側)であり、presence 判定の受理集合が広がるだけ。`amadeus-orchestrate.ts` は触らない。

## ステップ

- [ ] Step 0(落ちる実証・前半、AC-1d): 先に新テストを書き、**修正前コード**で実行して以下の「偽成立」を実測: (a) AC-1c 注入 = 検証済み DELEGATED_APPROVAL のみ存在する状態で reject の presence 判定が**通ってしまう**(現行 verb 非依存の実バグ挙動)ことをテストが赤で検出。(b) DELEGATED_REJECTION 未実装のため AC-1a 系が赤。exit code とテスト名を記録。
- [ ] Step 1: `amadeus-lib.ts` — 共有検証ヘルパー抽出 + `verifyDelegatedRejection`(または型引数化)+ `humanActedSinceGate` の verb スコープ化(設計決定3/4)。【FR-1.3/1.4/1.5】
- [ ] Step 2: `amadeus-state.ts` — `delegate-rejection` サブコマンド追加(設計決定2)、`assertHumanPresentForGateResolution` の verb 引き渡し、subcommand 一覧/usage 文字列更新。【FR-1.1/1.2】
- [ ] Step 3: レジストリ同期一式(設計決定5)。【NFR-3】
- [ ] Step 4: テスト(NFR-6): `tests/unit/t112-delegated-approval.test.ts` の対称として delegated-rejection カバレッジを追加(同ファイル追記 or 姉妹ファイル、既存構成に合わせる):
  - AC-1a: 実 HUMAN_TURN で grounded な DELEGATED_REJECTION → reject の presence 判定が通る。
  - AC-1b: 偽造(シャード不在/timestamp 不一致/HUMAN_TURN 無し/パストラバーサル)→ fail-closed。
  - AC-1c: DELEGATED_APPROVAL のみ → reject 不成立。対称に DELEGATED_REJECTION のみ → approve 不成立。
  - 発行コマンド: 発行元に HUMAN_TURN 無し → 発行拒否(FR-1.2)。
- [ ] Step 5(落ちる実証・後半): 修正後に Step 0 のテストが緑となることを実測。
- [ ] Step 6: dist 同期 — `bun scripts/package.ts` + `bun run promote:self` を実装と同一コミット(NFR-2)。
- [ ] Step 7: 検証一式 — `bun run typecheck` / `bun run lint` / `bun run dist:check` / `bun run promote:self:check` / `bash tests/run-tests.sh --ci` を最終変更後に再実行し、実測 exit code を code-summary.md に記録(NFR-3、evidence-discipline)。
- [ ] Step 8: PR 発行 — bolt ブランチ(origin/main ベース)から単独 PR(NFR-1)、codex メンバーへレビュー依頼。

## テスト構成メモ

- 新規テストランナー・設定は追加しない(既存 bun test + `tests/run-tests.sh` を再利用)。
- t112 の fixture パターン(seeded audit shard、偽造ブロック注入)を再利用し、承認委任テストと対称のカバレッジにする(NFR-6)。
