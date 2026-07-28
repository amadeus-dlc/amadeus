# Units of Work — 260727-plugin-verb-skills

上流入力(consumes 全数): components.md(C1〜C6 と規模見積り)、component-methods.md(メソッド粒度)、services.md(入口契約)、component-dependency.md(依存と対称配線)、decisions.md(ADR-1〜3)、requirements.md(FR-1〜5)

各 Unit は単独で deployable な Bolt 境界(units-generation:c1)。

## U1: u1-plugin-handler-skeleton — `/amadeus plugin <verb>` ハンドラ(walking skeleton)

- 内容: amadeus-utility.ts へ `plugin` case(handleMigrate 様式の委譲、C2)+usage 三重定義同期(FR-2b)+委譲配線/exit 伝播テスト(FR-2d)+dist/self-install 再生成
- 対応: FR-2(FR-2c の透過は verb 非依存の実装のため、後続 U2 の install も自動的に委譲対象になる)
- deployable 価値: 既存4 verb が `/amadeus plugin <verb>` で全ハーネスから叩ける(それ単独で #1597 提案1の主価値)
- 規模見積り: 正本 +25〜40 行、テスト +60〜100 行
- walking skeleton 候補(ideation intent-backlog の記録。Bolt 割当・ゲート運用の確定は 2.8)

## U2: u2-install-verb — plugin CLI `install <path>`

- 内容: parseInstall / handleInstall / PluginCliCommand・PluginCliResult 拡張 / deps 2 seam / tmp→rename 冪等コピー(ADR-2)/ USAGE 追記 / in-process 5ケース(FR-1f)/ INSTALL.md 生成器文言(FR-5c)/ dist 再生成
- 対応: FR-1、FR-5c
- deployable 価値: folder-drop 手順が1操作になる(raw CLI・U1 経由の両方で即利用可)
- 規模見積り: 正本 +130〜190 行、テスト +120〜180 行

## U3: u3-runner-gen-plugin — runner-gen の plugin 対応(#1598)

- 内容: compile 時の plugin 識別フィールド焼き込み(ADR-1 主案)/ runner-gen write の plugin runner 生成+prune / handleCompose・handleDrop の対称 spawn 配線 / compose 済みホスト模擬 fixture+E2E(FR-4d)/ dist 再生成
- 対応: FR-4
- deployable 価値: compose 済み plugin stage が `/amadeus-<slug>` で単段実行できる(#1598 のクローズ条件)
- 規模見積り: 正本 +75〜115 行、テスト +120〜180 行

## U4: u4-skill-docs — `amadeus-plugin` スキル(全7面)+ docs 入口更新

- 内容: core/skills/amadeus-plugin/SKILL.md 新設(mirror 様式、FR-3a/3c/3d)/ manifest 7面投影(ADR-3)/ 19-plugins EN/JA の入口更新(FR-5b)/ dist 再生成
- 対応: FR-3、FR-5a/5b
- deployable 価値: ガード付きスキル導線と正しい docs — 全入口の完成形
- 規模見積り: SKILL +90〜110 行、投影配線 7面(literal entry / helper registry / emit.ts 配列の3系統)各1〜5行、docs 各 +15〜30 行、スキル検査テスト +40〜80 行(t258-amadeus-mirror-skill 前例の同型 — U4 FD レビューで申告済みの予算改訂、下記精密化節参照)

## 規模見積りの精密化(components.md C6 からの更新申告)

Unit 分割に伴うテスト規模の再見積り合計は +340〜540 行(U1 60〜100 / U2 120〜180 / U3 120〜180 / U4 40〜80)であり、application-design components.md の粗い初期値を精密化して**上書きする**(導出 = 各 Unit 行の機械加算。components.md 側も同値へ是正済み)。改訂履歴: 初期 +250〜400 → UG 精密化 +300〜460(U4 テスト増なし想定)→ **U4 FD レビュー(it.1 Major)で U4 のスキル検査テスト(t258-amadeus-mirror-skill 前例)を申告追加し +340〜540**。正本側合計 +320〜455 は components.md と厳密一致(reviewer iteration 1 の機械照合)。

## Unit 横断の契約

- 各 Unit は「typecheck / lint / dist:check / promote:self:check / 関連テスト」green を単独で満たして着地する(FR-5a は各 Unit の再生成義務として分配)
- 受け入れ基準4(t341 green 維持)は全 Unit 共通

## Review — Iteration 2

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-27T20:43:30Z
- **Iteration:** 2
- **Scope decision:** none

it.1 Major(実装順の越権)は全ファイルで閉包。残余は components.md C6 行の数値陳腐化(Minor・機械検証可能クラス)1件のみ。イテレーション予算(2)消費後につき E-LSSADS13 に従い conductor が受理: C6 行を +300〜460 へ是正し、grep 機械照合(越権語彙 0 hit / 数値両ファイル一致 / 旧値の残存は上書き申告の履歴注記のみ)を units-generation diary に実測固定した。

### Findings

- [Minor] components.md:14 C6 行の +250〜400 が summary 行の +300〜460 と不一致 → conductor 是正+機械照合済み(E-LSSADS13 の機械検証可能クラス受理)
