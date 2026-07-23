# Scope Document — チーム機能のコア昇格

> 上流入力(consumes 全数): intent-statement、feasibility-assessment、constraint-register(いずれも本文で参照)

## In Scope(スコープ内)

intent-statement の4要素を、feasibility-assessment の GO 判定と各裁定(prerequisite モデル / macOS+Linux / e2e 組み込み)の枠内で公式配布へ昇格する:

1. **選挙エンジンの配布昇格** — CLI 5ファイル(`amadeus-election.ts` / `-model` / `-store` / `-record` / `-transport`)を `packages/framework/core/tools/` へ移動、選挙スキルを配布正本へ昇格し `{{HARNESS_DIR}}/tools` 参照へ書き換え。配置根拠の ADR(constraint-register T-2)
2. **チーム起動の配布面** — team-up.sh 一式の配布位置確定、herdr の PATH 前提依存宣言と不在時 loud エラー、macOS+Linux 限定の明示(T-3/T-6)
3. **メッセージング統合面** — agmsg の PATH 前提依存宣言(bun 同格の必須 prerequisite)、amadeus 側統合面の配布整合(T-1/T-6)
4. **境界ガード** — 「配布ツリー(packages/framework/・dist/・self-install)から `scripts/` への参照禁止」ドリフトガードテスト新設。現存の層またぎ(選挙スキル→scripts)を落ちる実証の実例に使う(T-5)
5. **クリーン環境 E2E** — 既存基盤(fake-binary seam+pty e2e)へ組み込み、Must 面(Claude 単一チーム・既定サイズ・起動→メッセージ→選挙完走)を自動検証
6. **docs** — Team Mode(Operating Modes)章の新設(en/ja)、prerequisite 節(herdr/agmsg/bun)、3層配置規約(scripts/contrib/framework)の公式文書化

## Out of Scope(スコープ外 — Won't)

- **herdr / agmsg のコード同梱・取り込み・抽象化レイヤー** — prerequisite モデルの裁定(feasibility Q1)により不要。要求なき互換レイヤー禁止(org Forbidden)とも整合
- **memory シードテンプレへの Operating Modes 節追加** — docs のみで公式化(Q2 裁定)。テンプレ化は需要実測後の後続 intent 候補
- **Windows 対応** — herdr stable 面と bash 前提により対象外。docs に明記(feasibility Q2)
- **バリエーション機能の E2E 保証** — codex ランタイム / --instance / -c 再開 / サイズ指定 / spawn 系はコードとして運ぶ(Should)が、E2E 保証は Must 面のみ(Q1 裁定)
- **手動実証** — 不採用(feasibility Q3 でユーザー却下)
- **選挙 CLI の機能拡張** — 移動と配布化のみ。PM 蒸留4値投票対応等の機能追加は別 intent

## Value Stream(価値の流れ)

外部利用者の到達経路: amadeus インストール → docs の Team Mode 章 → prerequisite(bun/herdr/agmsg)確認 → チーム起動 → メッセージング疎通 → 選挙完走。この一連が Must 面であり、クリーン環境 E2E がこの経路全体を機械保証する。

## Timeline(期限)

ハードデッドラインなし(2026-07-23 サマリ確認で確定)。順序制約は intent-backlog の dependency + risk-first 並びに従う。
