# Code Generation Plan — u719-kiro-stale-hooks(fix #719)

> 上流: requirements.md(FR-1 選挙 Q1=A 確定)、codekb re-scans/260710-kiro-stale-hooks.md。
> Test strategy: minimal(bugfix)— 対象バグへのリグレッションテスト + 既存スイート green 維持(org.md Testing Posture)。
> 実装環境: サブエージェント worktree 隔離(origin/main ベースの新規ブランチ `bolt/719-kiro-stale-hooks`)。cid:code-generation:c2 の隔離規律に従う。

## トレーサビリティ

| Step | 対応要件 |
|---|---|
| 1 | FR-1.1(stale 7 件削除) |
| 2 | FR-1.2(exemption regex 除去) |
| 3 | NFR-2(dist/self-install 同期) |
| 4 | リグレッションテスト(bugfix Testing Posture、再混入ガード) |
| 5 | FR-1.3 / NFR-1(落ちる実証) |
| 6 | FR-4(検証コマンド一式 exit 0)+ FR-3(kiro-ide byte 不変) |
| 7 | NFR-4(deslop) |

## Steps

- [ ] **Step 1: stale `.kiro.hook` 7 件を削除** — `packages/framework/harness/kiro/hooks/` から amadeus-audit-logger / amadeus-log-subagent / amadeus-runtime-compile / amadeus-session-end / amadeus-session-start / amadeus-stop / amadeus-sync-statusline の `.kiro.hook` を `git rm`。`amadeus-kiro-adapter.ts` は残す。
- [ ] **Step 2: exemption regex を除去** — `packages/framework/harness/kiro/manifest.ts` の `authoredExempt` から `/^hooks\/[^/]+\.kiro\.hook$/` を除去(agents .json / adapter .ts の 2 regex は維持)。付随コメントに `.kiro.hook` への言及があれば実態に合わせて更新。kiro-ide の manifest には触れない。
- [ ] **Step 3: dist / self-install を再生成** — `bun scripts/package.ts` → `bun run promote:self`。生成差分を同一コミットに含める(NFR-2)。期待: `dist/kiro/.kiro/hooks/` は変化なし(.kiro.hook は元々 0 件)、`.claude/`・`.codex/`・dist 各面の manifest 由来物のみ整合。
- [ ] **Step 4: リグレッションテスト追加** — 既存 `tests/smoke/t148-kiro-file-structure.test.ts` に assert を追加(新規テストファイル・新規ランナー機構は作らない — reuse inventory): (a) `packages/framework/harness/kiro/hooks/` に `.kiro.hook` が 0 件であること(source 衛生の再混入ガード) (b) `dist/kiro/.kiro/hooks/` に `.kiro.hook` が 0 件であること。※ (a) は source を見る珍しい assert のため、根拠コメント(#719)を付す。
- [ ] **Step 5: 落ちる実証(FR-1.3 / NFR-1)** — (i) `dist/kiro/.kiro/hooks/` へ `.kiro.hook` を一時注入 → `bun run dist:check` が ORPHAN で exit 非 0 になることを実測(exemption 除去の効果実証)。(ii) 注入除去 → exit 0 復帰。(iii) Step 4 のテストも、Step 1 適用前の状態(または一時的な .kiro.hook 復元)で赤くなることを実測。エビデンス(コマンド+exit code)を code-summary.md に記録。
- [ ] **Step 6: 検証コマンド一式** — `bun run typecheck` / `bun run lint` / `bun run dist:check` / `bun run promote:self:check` / `bash tests/run-tests.sh --ci` すべて exit 0(FR-4)。`git diff origin/main -- dist/kiro-ide/` が空であること(FR-3 の byte 不変実証)。
- [ ] **Step 7: deslop** — PR 作成前に deslop スキル相当の点検(不要コメント・過剰防御・不整合パターンの除去、挙動不変)を行い、Step 6 の全検証を再実行。

## 対象外(このユニットで touch しないもの)

- `harness/kiro-ide/`(FR-3)
- `scripts/package.ts` の検査ロジック(#735 に分離済み)
- バージョン・リリース面(Mandated)

## 完了条件

Step 1-7 全チェック + reviewer(amadeus-architecture-reviewer)READY + Bolt PR 発行(タスク化済み、レビュアーは claude メンバー)。
