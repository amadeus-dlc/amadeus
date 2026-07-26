上流入力(consumes 全数): unit-of-work, unit-of-work-story-map, requirements, components, component-methods, services

# Business Logic Model — distribution-enumeration

unit-of-work.md の U5(完了定義: 列挙追加・`dist:check`/`promote:self:check` green・ルート `.kimi-code/` 生成・実機起動/hook 発火/doctor パス)と unit-of-work-story-map.md の FR-5/FR-6 を、components.md C5 の構成と requirements.md の FR-5a/FR-5b(RE で確定した編集点の行番号)に沿って手続き化する(C5 はメソッドを持たない列挙変更 — component-methods.md も C5 の節を持たない)。services.md の導入経路の最終段。dogfood 検証は U2(adapter 実在)・U3(managed block 配線)・U4(doctor arm)の完了を前提とする。

## 列挙フロー

1. packages/setup の3ファイルに kimi を追加(RE で確定した編集点):
   - `domain/harness.ts`: union に `"kimi"`、`HarnessName.all` に追加、parse が受理
   - `domain/engine-layout.ts`: `kimi → .kimi-code`
   - `modules/reporter.ts`: usage 文字列とエラー列挙に kimi
2. `scripts/plugin-projection.ts`: `PACKAGE_HARNESSES`(:46)と `SELF_INSTALL_HARNESSES`(:59)に kimi
3. `scripts/promote-self.ts`: `managedDirs`(:37-43)に `{ src: "dist/kimi/.kimi-code", dst: ".kimi-code" }`、`PACKAGE_HARNESSES`(:169)に kimi
4. `scripts/detect-ci-changes.sh`(:20)の path glob に `.kimi-code/*`
5. `bun scripts/package.ts kimi` → `bun run dist:check` → `bun run promote:self` → `bun run promote:self:check` で全 drift guard を green にする

## dogfood 検証(実機)

1. ルート `.kimi-code/` が生成されていることを確認
2. 本リポジトリで kimi セッションを起動し `/skill:amadeus --status` が応答する
3. hook 発火を確認(配線済みの環境で HUMAN_TURN 等が audit に記録される — 配線は Q1 手順で実施)
4. `/skill:amadeus --doctor` が kimi arm のチェックを実行してパスする

## 検証シーケンス

- 列挙の対称性: setup の install/verify が `--harness kimi` を受理する(単体テスト既存様式)
- drift guard: dist:check・promote:self:check が green(project.md Mandated の定型)
- dogfood: 上記4点の実機確認を diary に記録

## 決定木(エラー経路)

- 列挙の片落ち(例: reporter だけ未更新) → 型検査または既存テストで検出される構造を維持(新規の独自検査は足さない)
- dogfood の hook 未発火 → adapter(Bolt 2)か配線(Bolt 3)の問題として切り分けて halt-and-ask

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-25T11:53:24Z
- **Iteration:** 2
- **Scope decision:** none

iteration 1 の major 1・minor 3 は全て解消。BR-1 の原子性は U5 所有集合へ正しくスコープ化され、参照整合・dogfood 前提も明記。新規検出なし。

### Findings

- None
