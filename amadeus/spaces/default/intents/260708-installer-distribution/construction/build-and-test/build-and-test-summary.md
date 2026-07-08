# Build and Test Summary — installer-distribution

> ステージ: build-and-test (3.6) / 作成: 2026-07-09
> 出典: 全 Unit の `../*/code-generation/code-generation-plan.md`・`code-summary.md`、test-results.md(本ステージ実測)

## ビルド状態

**build-ready** — bun のみで再現可能(NFR-005 ランタイム依存ゼロ)。ビルドは ADR-002 の単一コマンド、テストからの取得は ensureSetupCliBuilt() に一元化

## テストタイプ・インベントリ(Standard 戦略)

- unit(21ファイル)+ integration(5ファイル)+ CI smoke(1)+ e2e(2、実ネットワークはゲート付き)
- performance/security は専用層を生成せず既存層に組み込み(各 instructions の根拠付き宣言参照)

## ユニット別カバレッジ期待

U1: ドメイン全型+3モジュール(BR-F 系全分岐)/ U2: CLI 契約+install 全経路+BR-I16 / U3: REL-U02 6経路+SEC-U01+NFR-002 / U4: FR-018 完全一致+ドリフト / U5: t68 3点同期(コード追加なし)

## 準備状況評価

- **build-ready**: ✅ / **test-ready**: ✅(実測 green — t92 のみ既知のローカル環境固有、CI では発生せず)/ **deployment-ready**: ✅(配布=npm publish は手順書 docs/guide/publishing-setup.md 経由の手動。CI publish は CON-004 で対象外)

## 未解決事項

1. 起票待ち Issue 2件(installation-detect-gap / t92-bunx-ts-drift)— ユーザー判断待ち
2. #654(Bolt 5)マージ+`v1.2.0` タグ発行(リリース時の人間タスク)— インストーラの配布物取得先
3. record PR #651 の最終更新(operation フェーズ完了後に amadeus/ ツリー+compose スコープ2ファイルを同梱して更新)
