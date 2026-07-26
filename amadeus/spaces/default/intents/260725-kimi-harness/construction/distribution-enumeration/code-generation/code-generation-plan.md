上流入力(consumes 全数): unit-of-work, requirements

# Code Generation Plan — distribution-enumeration(Bolt 5)

unit-of-work.md の U5 と requirements.md の FR-5/FR-6、および本 unit の FD/NFR 成果物(business-logic-model.md §列挙フロー・§dogfood 検証、business-rules.md BR-1〜BR-4、domain-entities.md §HarnessEnumeration、nfr-design の reliability/security 設計)に基づく。story 相当は FR-5/FR-6。

- [x] **Step 1: setup 列挙 + cli.ts 配線**(FR-5a)
  - `domain/harness.ts`(union・all・parse)・`domain/engine-layout.ts`(kimi → `.kimi-code`)・`modules/reporter.ts`(usage/エラー文字列)
  - cli.ts: B3 が公開した `runHooksMerge` を install/upgrade の plan report 後に呼ぶ接続(戻り値 applied/noop/not-applied、エラーは renderHooksError。BR-I11 流儀の非対話扱いに従う)
- [x] **Step 2: 配布列挙**(FR-5b)
  - `scripts/plugin-projection.ts`(`PACKAGE_HARNESSES`・`SELF_INSTALL_HARNESSES` に kimi。U5 所有の閉集合は同一コミットで原子に)
  - `scripts/promote-self.ts`(managedDirs に `dist/kimi/.kimi-code → .kimi-code`、`PACKAGE_HARNESSES` に kimi)
  - `scripts/detect-ci-changes.sh` の path glob に `.kimi-code/*`
- [x] **Step 3: dist 再生成 + drift guard**(FR-5b)
  - `bun scripts/package.ts kimi` → `bun run dist:check` → `bun run promote:self` → `bun run promote:self:check` が全て green
- [x] **Step 4: dogfood(実機検証)**(FR-6)
  - ルート `.kimi-code/` の生成を確認
  - 実機 kimi セッションで `/skill:amadeus --status` が応答
  - hook 発火確認(Q1 手順で配線し、HUMAN_TURN 等が audit に記録される)
  - `/skill:amadeus --doctor` が kimi arm を実行してパス(または現状に一致する結果)
  - 結果は実行から導出して記録(P2)
- [x] **Step 5: setup 側テスト + 検証**
  - 列挙の受理テスト(parse/engine-layout/reporter の既存様式)と cli.ts 配線のテスト(tty fake 注入の既存様式)
  - `bun run typecheck`・`bun run lint`・関連テスト

## トレーサビリティ

- FR-5a → Step 1 / FR-5b → Step 2-3 / FR-6 → Step 4 / FR-7c 相当の検証 → Step 5
- dogfood は U2(adapter)・U3(配線機構)・U4(doctor arm)の完了済みを前提

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-26T06:17:49Z
- **Iteration:** 1
- **Scope decision:** none

plan・summary は U5 を忠実にカバー。BR-1 の原子変更・BR-2 の生成物規律・P2 の証跡規律と整合。dogfood は conductor 再検証付きで信頼できる。検出1件は minor で同一 iteration で修正済み。

### Findings

- (minor / summary §検証) フル CI ベースラインの有無 → 修正済み(関連サブセット実行・フルは build-and-test へと明記)
