# Feasibility Assessment — チーム機能のコア昇格

> 上流入力(consumes 全数): intent-statement(本文で参照)。optional の competitive-analysis / market-trends / build-vs-buy は market-research SKIP により設計上不在

## 技術実現性(Technical Viability)

intent-statement の定める4要素(チーム起動 / メッセージング / 選挙裁定 / docs)について、要素別に実測評価する:

| 要素 | 現状の実装 | 実現性 | 根拠(実測) |
|---|---|---|---|
| 選挙裁定 | `scripts/amadeus-election*.ts` 5ファイル+contrib スキル | **高** | Bun-only・外部依存なし。テスト資産 t234〜t244(unit/integration)が既に green 運用中。配布は既存パターン(core/tools → dist → self-install)に構造的に適合 |
| チーム起動 | `scripts/team-up.sh`(bash 1271行) | **高**(Q1 裁定で単純化) | herdr は PATH 前提の必須外部依存として扱う(bun と同格の prerequisite モデル)。同梱・抽象化が不要になったため、配布物は「スクリプト+依存宣言+不在時 loud エラー」で足りる |
| メッセージング | agmsg(`~/.agents/skills/agmsg` v1.1.6) | **高**(同上) | 同じく PATH 前提の必須外部依存。amadeus 側の統合面(team-up.sh の join/delivery 呼び出し、選挙 transport)は既存実装が動作実績あり |
| docs | docs/guide 体系(en/ja 対) | **高** | 既存 19 章構成への追加。ドキュメント参照整合ガード(docs-legacy-refs 系テスト)が現役 |

**総合判定: GO** — Q1 裁定(prerequisite モデル)により、feasibility 上の最大の不確定要素だった「外部依存の配布問題」が解消された。残る作業は配置移動・参照書き換え・依存宣言・テスト・docs であり、いずれも既存機構の再利用で実現可能。

## E2E 検証の実現性

成功定義「クリーン環境 E2E」は既存テスト基盤の再利用で自動化可能(Q3 裁定、実測根拠):

- **fake-binary seam**: `tests/integration/t-team-msg.test.ts` が fake herdr バイナリ(env で失敗注入・送信ログ観測)の確立済みパターンを持つ — herdr/agmsg の実バイナリなしで統合面を CI 検証できる
- **pty 駆動 e2e**: `tests/e2e/` の node-pty + @xterm/headless serial 群が実 CLI のターミナル駆動を既に行っている
- **クリーン環境の構成**: temp HOME+隔離 PATH+self-install ツリーの組み合わせ(既存 setup-install/setup-upgrade e2e と同型)
- 実 herdr/agmsg を要する面は fake-binary seam で代替し、実バイナリでの完走はドッグフード環境の検証記録として補完する

## リスク分析(概要)

詳細は raid-log.md を参照。上位リスク:

1. **agmsg の公開入手経路が未確定** — docs の prerequisite 節に「どこから入手するか」を書けない可能性(R-1)。緩和: docs 執筆時に確定、確定までは依存事項として追跡
2. **選挙スキルの層またぎ参照が現存** — `.claude/skills/amadeus-election` → `scripts/amadeus-election.ts`。昇格で解消され、境界ガード(Q2 裁定 @ intent-capture)で再発を封鎖
3. **herdr のバージョン互換** — 外部プロダクトの CLI 面変化。緩和: 依存宣言に動作確認バージョン(0.7.1 実測)を明記

## AWS Platform 視点(support: aws-platform-agent)

**N/A(反証可能根拠つき)**: 本 intent はセルフホスト開発フレームワークのリポジトリ内配布であり、AWS リソース・インフラ層を一切持たない(実測: リポジトリにインフラ定義なし、deployment は npm publish のみ — project.md「デプロイ基盤は持たず」既決)。クラウド面の評価対象は存在しない。

## Compliance 視点(support: compliance-agent)

- **ライセンス**: herdr は OSS(GitHub 公開 — github.com/ogulcancelik/herdr、herdr.dev で実測)。agmsg はローカル設置物に LICENSE ファイル不在(実測)。ただし Q1 裁定の prerequisite モデルにより**両ツールのコードを amadeus 配布物へ同梱しない**ため、ライセンス伝播リスクは構造的に低い。docs からの外部リンク・名称言及は通常の引用の範囲
- **規制要件**: PCI/HIPAA/SOC2/データレジデンシー等の該当なし(開発ツール、ユーザーデータの収集・保存なし)
- **残課題**: agmsg の入手経路確定時に、その配布条件の確認を docs 記載前に1回行う(raid-log D-2)
