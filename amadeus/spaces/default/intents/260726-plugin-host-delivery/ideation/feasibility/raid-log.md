# RAID Log — plugin-host-delivery

> 上流入力(consumes 全数): intent-statement
> R=Risk / A=Assumption / I=Issue / D=Dependency。状態は本 intent 内のステージで更新する。

## Risks

| ID | リスク | 影響 | 緩和 | 状態 |
|---|---|---|---|---|
| R-1 | 各ハーネスのネイティブ導入機構(marketplace / plugin add / folder-drop)の実挙動が未実測 — 存在実測のみで語彙未実測の面に確約を書くと matcher 無音不一致の偽グリーンを生む | 設計手戻り・偽の対応表明 | 能力マトリクスを最初の成果物とし、native hook の実起動プローブ(probe-preprocessing-parity 準拠 — 本番経路の前処理を全数再現)で確定。未実測面は ⚠+実装時実測条件へ降格 | open |
| R-2 | 上流に前例のない 3 ハーネス(cursor / opencode / kimi)の方式が定まらない | スコープ膨張 | 手動 fallback(folder-drop+明示 compose)を全ハーネス共通の床として先に固定し、自動 trigger は能力があるハーネスのみ上乗せ。非対応は明示 degrade 契約+doctor 可観測(silent skip 禁止) | open |
| R-3 | SessionStart 自動 compose がセッション起動レイテンシを悪化させる(前 intent 群で起動レイテンシは 200.85s→5.87s に改善した実績があり、退行はユーザー可視) | 起動 UX 退行 | compose の no-op 高速路(composition record が最新なら早期 return)を要件化し、起動時間の実測を受け入れ基準に含める(reenablement-regression-risk 対応) | open |
| R-4 | 適合テスト規模(上流 32 ケース × 7 ハーネス面)が CI 時間・保守コストを圧迫 | CI 肥大 | ケースはハーネス非依存(compose 意味論)とハーネス依存(投影・trigger)に層別し、前者は 1 回だけ実行。追跡表で対応/非対応/N-A を明示 | open |
| R-5 | ハーネス投影の追加が dist drift ガード・cross-merge 盲点(cid:code-generation:cross-merge-dist-tree-blindspot)と相互作用 | 偽 green / main 赤 | 新投影面の regen を最終 rebase 時に必須化、並行 PR の交差判定に dist ツリー集合の変化を含める(既存ノルム適用) | open |
| R-6 | formal-model-check の activation policy が決まらないと `--single` 必須 UX 解消(成功指標 8)が塞がる | 受け入れ条件未達 | intent-capture Q3 裁定済み: application-design の ADR + 承認ゲートで本 intent 内に裁定(TLC コスト制約は constraint-register T7) | 裁定経路確定 |

## Assumptions

| ID | 前提 | 検証方法 | 状態 |
|---|---|---|---|
| A-1 | 全 7 ハーネスのフックアダプタ(実在確認済み)から bun スクリプト(compose 入口)を起動できる | 能力マトリクス実測(各アダプタのイベント語彙・実行保証) | 未検証(実在のみ確認) |
| A-2 | compose engine(t252/t253/t254 で検証済み)は host 投影されたプラグインにも変更なしで適用できる | walking skeleton の E2E(install→compose→通常 scope 実行) | 未検証 |
| A-3 | 同時運用されるプラグイン数は少数(当面 formal-model-check + テスト用)— 依存解決・lockfile 不要 | 非目標として intent-statement で固定済み | 確定 |
| A-4 | エンジンの composition record 読取配線(amadeus-graph.ts:1897 / amadeus-orchestrate.ts:901)は compose 後の再コンパイルでそのまま機能する | recompile-before-construction 系の既存挙動+walking skeleton | 未検証 |

## Issues

| ID | 事項 | 状態 |
|---|---|---|
| I-1 | mirror の write⇔read 表現分裂([#1547](https://github.com/amadeus-dlc/amadeus/issues/1547)、P2/S3)— 本 intent の Mirror #1545 は健全だが status verb が偽陰性を返す | open(本 intent スコープ外、運用注意のみ) |
| I-2 | [#1380](https://github.com/amadeus-dlc/amadeus/issues/1380) plugin 機構への skills 貢献面追加 — 本 intent と隣接するが別 Issue | open(スコープ外) |

## Dependencies

| ID | 依存 | 状態 |
|---|---|---|
| D-1 | 上流 awslabs/aidlc-workflows commit `29a31f78`(doc / test-pro / t188)— 追跡表の正準参照 | 取得済み(2026-07-26 直読) |
| D-2 | 既存 compose engine(scripts/plugin-composition.ts)+ 既存テスト t252/t253/t254/t-formal-verif-plugin-lifecycle | 実在確認済み |
| D-3 | 260722-tla-plugin intent の成果(plugin skeleton / compose 三層 trust 設計 — project.md Corrections c1/c8/c9-tla-plugin 系) | main 着地済み |
| D-4 | Kimi ハーネス(#1522、a45b01bd3)— 7 番目の対象面 | main 着地済み |
