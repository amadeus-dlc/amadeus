# Code Generation Plan — docs-rollout(U5 / Bolt 5)

> ステージ: code-generation (3.5) / Unit: docs-rollout / 作成: 2026-07-09
> 出典: `../functional-design/`(domain-entities: 変更対象表・business-logic-model: ユーザー可視 PR の構成)、`../nfr-design/logical-components.md`(コード追加なし・編集と再生成のみ)・`reliability-design.md`(REL-D01: t68+dist:check/promote:self:check が PR 完了条件)、`../infrastructure-design/cicd-pipeline.md`、FR-014、I1/I2(raid-log)、CON-006
> テスト戦略: Standard / 承認モード: autonomous(記録用、ユーザーゲートなし)

## ステップ

- [ ] **Step 1: README.md 導入セクション刷新**(FR-014)— 言及要素5点: bunx・npx・ハーネス選択・install・upgrade。`npx @amadeus-dlc/setup install` / `bunx @amadeus-dlc/setup install` のワンライナーを正とし、既存の手動 cp -r 手順は README から撤去
- [ ] **Step 2: cp -r 手順の移設**— `docs/guide/15-troubleshooting.md` へ追記(インストーラが使えない場合のフォールバックとして。新規ファイルは作らない)
- [ ] **Step 3: framework 版バンプ**— `packages/framework/core/tools/amadeus-version.ts` を **1.2.0**(インストーラ配布 = 新機能のマイナーバンプ)+README バッジ同期+CHANGELOG に `## [1.2.0] - 2026-07-09` 見出しと箇条書き(t68 の3点同期)。注意: PR #650 が 1.1.1 を並行して積んでいる — 後からマージする側がリベース・再バンプする(project.md DECIDED)。本計画では 1.1.0 起点で 1.2.0 とし、#650 マージ後にリベース時へ再調整
- [ ] **Step 4: root package.json の I1/I2 是正**— license `MIT-0` → `(MIT OR Apache-2.0)`、repository.url を amadeus-dlc/amadeus へ(directory 削除 — raid-log I2)。最小 diff
- [ ] **Step 5: dist 再生成+セルフインストール昇格**— `bun scripts/package.ts` → `bun run promote:self`(手編集禁止 — Forbidden。VERSION ファイルへのバンプ伝播を含む)
- [ ] **Step 6: 検証一式**(REL-D01)— `bun test tests/unit/t68-version-changelog-sync.test.ts` / `bun run typecheck` / `bun run lint` / `bash tests/run-tests.sh --ci`(既知ベースライン: t92 のみ赤 = ローカル環境固有)/ `bun run dist:check` / `bun run promote:self:check`(最終変更後に再実行、exit code 明記)

## スコープ外

- コード追加・新規ファイル(変更対象表どおり編集と再生成のみ)
- npm publish の実行(手順書ワークフロー — タグ発行後の手動作業)
- vX.Y.Z タグ発行(リリース時の人間タスク — team.md)
