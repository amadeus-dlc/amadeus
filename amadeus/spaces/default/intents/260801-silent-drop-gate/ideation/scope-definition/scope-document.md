# Scope Document — no-silent-drop

## 上流入力と裁定

本書は `ideation/intent-capture/intent-statement.md` の問題・成功指標、`ideation/feasibility/feasibility-assessment.md` の実現可能性評価、`ideation/feasibility/constraint-register.md` の C-01〜C-16 をスコープ境界へ変換する。`scope-definition-questions.md` の Q1〜Q5 はすべて推奨案 A で確認済みである。Requirements Analysis の Q7 により、修正前は candidate baseline、修正後に初回 committed baseline を確定する語彙へ 2026-08-02T03:00:29Z に補正承認された。

本 intent の最小価値は、無音化の3形態を手書き正本で検出し、新規違反を CI で拒否し、既存債務と免除を増加させず、同族の #1878・#1874 を修正して残債が減ることを実測する点にある。#1963 は [PR #1970](https://github.com/amadeus-dlc/amadeus/pull/1970) の修正を重複実装せず、統合後の回帰契約だけを本 intent で保証する。

## In Scope

### 1. no-silent-drop 静的ゲート

- ast-grep を再現可能な固定バージョンで導入し、Bun の frozen install と両立させる。
- 次の3形態をルールと positive / negative fixture で100%分類する。
  1. 空、またはログだけで終了する catch
  2. 成否を表す emit 系・Result 系呼び出しの戻り値破棄
  3. 永続化を伴わない emit や、実態なしに成功を返す偽成功
- 走査対象を `packages/framework/core/`、`packages/framework/harness/`、`scripts/` の手書き正本に限定する。
- `dist/`、ルートの生成投影、テスト fixture を本番 census から除外する。
- ツール不在、ルール不正、ベースライン欠落・不正、0件走査、部分走査を型付き診断付きの非0終了にする。

### 2. ベースラインと免除の統治

- 初期検出を全件分類し、偽陽性率5%以下を満たすまでルールを改善する。
- 修正前 census `C_pre` の真陽性 identity 集合を candidate baseline `B_pre` として証跡化するが、CI baseline には登録しない。
- #1878・#1874 を修正して除去した後、残る真陽性 identity 集合 `B0` を初回 committed baseline として登録する。
- committed baseline は identity 集合の subset だけを許可し、通常更新による追加や同数置換を拒否する。
- `intentional-drop` は非空理由を必須とし、直後の1ノードだけへ適用する。
- 免除件数も shrink-only とし、新規免除を通常更新として受け入れない。

### 3. 同族ランタイム欠陥の修正・回帰検証

- #1878: `persistBlocked` 相当の永続化失敗を成功に丸めず、呼び出し元へ伝播する。失敗時の state / audit 部分更新を防ぐ。
- #1874: `setCheckbox` / `setStageSuffix` の対象行存在保証を callsite ごとに検証し、保証できない経路を loud failure または再同期誘導へ変更する。
- #1963: [PR #1970](https://github.com/amadeus-dlc/amadeus/pull/1970) 統合後、未知 section で `section-unrecognized` が返り、state のバイト列が変化しない回帰契約を検証する。

### 4. CI・配布・証跡

- 既存 GitHub Actions の lint 系導線へ no-silent-drop を blocking step として接続する。
- no-silent-drop 単独ステップを15秒以内に収める。超過時は advisory 化せず構成を改善する。
- 正本変更を packager から全ハーネスへ再生成し、package / promotion drift guard を通す。
- 新規違反の赤、修正後の緑、`B_pre` と `B0` の identity 集合差分、#1963 の回帰 green を再現可能な証跡として残す。

## Out of Scope

- #1906 の並行ロック競合の調査・修正
- #1878・#1874 以外の既存真陽性の一括修正
- [PR #1970](https://github.com/amadeus-dlc/amadeus/pull/1970) が実装した #1963 修正の再実装
- `dist/` やルート生成投影の手編集、本番 census へのテスト fixture 混入
- Biome ルール強化全般、汎用的な TypeScript 静的解析基盤への拡張
- no-silent-drop と直接関係しない runtime API の再設計・大規模リファクタリング
- 新規 AWS 資源、デプロイ環境、監視基盤、規制対象データ処理
- 合否基準を満たすための性能・精度・fail-closed 要件の緩和

## Must-have / Nice-to-have

| 区分 | 内容 |
|---|---|
| Must | 3形態の検出、固定ツールチェーン、fixture、census、理由付きベースライン、理由付き単一ノード免除、両 shrink-only ratchet、型付き fail-closed、CI 接続、#1878・#1874 修正、#1963 回帰検証、配布再生成、包括テスト、検証証跡 |
| Should | 診断から修復箇所と理由を即座に特定できる出力整理。Must の型付き診断を弱めず、利用性を改善する |
| Could | なし。追加機能は本 intent の合否から切り離し、別 intent で評価する |
| Won't | Out of Scope に列挙した項目 |

## 依存関係とシーケンス

実装は dependency-first と risk-first を組み合わせ、次の順で進める。

1. 最新 main と [PR #1970](https://github.com/amadeus-dlc/amadeus/pull/1970) の統合状態を確認する。
2. ast-grep の固定、3形態のルール、positive / negative fixture を確立する。
3. 手書き正本の census を実行し、真陽性・偽陽性を分類する。
4. ルール精度を満たした後、candidate baseline `B_pre` と初期免除台帳を証跡として確定する。`B_pre` は CI baseline ではない。
5. #1878・#1874 を修正し、#1963 の回帰契約を検証する。
6. 修正後の残存 TP を初回 committed baseline `B0` として登録し、baseline / exemption ratchet と CI blocking step を接続する。
7. 配布物を再生成し、包括テスト・drift guard・性能計測を実行する。

#1878 と #1874 は互いに独立して実装可能だが、修正前後の残債減少を測るため census と初期分類に依存する。CI 接続はルール、fixture、committed baseline `B0`、障害診断が成立してから行う。配布再生成と最終検証は正本変更の確定後に行う。

## 価値ストリーム

| 段階 | 入力 | 価値変換 | 完了条件 |
|---|---|---|---|
| 1. 契約固定 | `intent-statement.md` と C-01〜C-16 | 無音化3形態、走査境界、失敗契約を実行可能な規則へ変換 | fixture が期待どおり赤・緑になる |
| 2. 債務可視化 | 手書き正本 | census を分類し、既存債務と偽陽性を分離 | 偽陽性率5%以下、全検出に分類根拠がある |
| 3. 債務削減 | `C_pre`／`B_pre` | #1878・#1874 を fail-closed 化し、#1963 を回帰検証 | 対象欠陥が green、`B0 ⊂ B_pre`、追加 identity なし |
| 4. 再発防止 | ルール、baseline、exemption | shrink-only ratchet と CI blocking に変換 | 新規違反・新規免除・内部異常が CI fail |
| 5. 配布保証 | 正本変更 | 全ハーネス投影と検証証跡へ反映 | drift guard、包括テスト、15秒目標が green |

テキストフロー: `上流契約 → 検出契約 → census・分類 → 対象修正 → ratchet・CI → 配布・証跡`。

## 合否基準

| ID | 完了条件 |
|---|---|
| S-01 | 3形態の positive / negative fixture を100%分類する |
| S-02 | 実リポジトリの初期偽陽性率を5%以下にする |
| S-03 | no-silent-drop CI 単独ステップを15秒以内にする |
| S-04 | ツール・ルール・ベースライン・0件走査・部分走査の異常を型付き診断付き非0終了にする |
| S-05 | ベースライン外違反、新規 baseline 増加、新規免除増加を CI fail にする |
| S-06 | #1878・#1874 修正前の candidate `B_pre` と修正後の committed `B0` を identity 集合で比較し、`B0 ⊂ B_pre`、`B0 - B_pre = ∅`、削除 identity が対象 Issue と一致する |
| S-07 | [PR #1970](https://github.com/amadeus-dlc/amadeus/pull/1970) 統合後の #1963 回帰契約が green になる |
| S-08 | package / promotion drift guard と Comprehensive テストが green になる |

本 intent 固有の固定日は設けない。S-01〜S-08 の達成が完了条件であり、期限を理由に Must を Nice-to-have へ降格しない。

## 変更・レビュー境界

成果は単一 initiative として管理し、Construction では walking-skeleton を含む Bolt ごとに独立した [PR](https://github.com/amadeus-dlc/amadeus/pulls) を作る。各 Bolt は1つ以上の Unit を含められるが、単独で検証・承認できる deployable slice とする。この境界は Scope Definition 承認後、Approval & Handoff の整合確認で 2026-08-02T01:26:20Z に補正承認された。スコープ変更が必要な場合は次を明示して再裁定する。

- baseline または exemption の増加理由と代替案
- S-01〜S-08 への影響
- Out of Scope から取り込む項目と、代わりに外す項目
- [PR #1970](https://github.com/amadeus-dlc/amadeus/pull/1970) の契約との競合有無
