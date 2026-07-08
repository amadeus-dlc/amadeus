# Code Summary — publish-readiness(U4 / Bolt 4)

> ステージ: code-generation (3.5) / Unit: publish-readiness / 作成: 2026-07-09
> ビルダー: amadeus-developer-agent(codegen-u4)/ 全7ステップ完了

## 作成ファイル

- `tests/lib/setup-pack-contract.ts`(PackContract/PackReport/ContractVerdict 単一定義+runNpmPackDryRun)
- `tests/integration/setup-pack-contract.test.ts`(実 npm pack 3回: satisfied/missing/unexpected — 完全一致アサーション)
- `tests/integration/setup-files-drift.test.ts`(package.json files ⇔ PackContract ドリフト検査)
- `docs/guide/publishing-setup.md`(英語、functional-design 7章立てどおり — 章3に AMADEUS_SETUP_E2E_NETWORK=1、章1に SEC-P02、章5に SEC-P03 注記、章7 deprecate+patch)
- packages/setup/package.json は最終無変更(落ちる実証の一時編集 → 復元、diff クリーン)

## 実装判断

- テスト命名は logical-components の仮称でなく既存 `setup-*.test.ts` 慣習に整合
- runNpmPackDryRun は tests/lib へ(shared-infrastructure の再利用宣言に基づく)
- dist/cli.js は U1 の ensureSetupCliBuilt() 経由(独自ビルドなし — cicd-pipeline 契約遵守)

## 落ちる実証(team.md Mandated)

files から LICENSE-MIT を一時除去 → satisfied テストが `{type:"missing", files:["LICENSE-MIT"]}` で赤+ドリフトテストも赤(missing が unexpected より優先されることも確認)→ 復元・green 再確認(628ms)

## 検証結果

typecheck / lint / dist:check / promote:self:check 全 exit 0。pack 恒常3回 = 628〜646ms(予算 ≤28秒)。`tests/run-tests.sh --ci` は **t92.test.ts 1件のみ FAIL — U4 と無関係の環境依存**(bunx が pinned TS 6.0.3 でなく 7.0.2 を解決し TS18003 の exit code が変化。2回再現で決定論的と確認、git log でファイルが本 intent 以前から無変更と確認)。対応は pending-issue-t92-bunx-ts-drift.md に保留(クロスカッティングのため Issue 起票ノルム該当、起票はユーザー判断待ち)

## §12a レビュー経過

- イテレーション1: READY(Critical/Major 0)— フレッシュエビデンス(t92 のみ赤のベースライン一致)、落ちる実証2件(package.json files 変異/PackContract 定義変異 — 後者は unexpected 経路の実地証拠にもなった)、手順書7章の契約適合、遅延ビルド契約遵守、CON-006 越境なしを確認。非ブロッキング1件(logical-components の命名記述)は即時追補済み
