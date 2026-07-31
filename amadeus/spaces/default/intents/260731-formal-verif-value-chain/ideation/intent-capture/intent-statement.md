# Intent Statement — formal-verif-value-chain

対象 Issue: [#1738](https://github.com/amadeus-dlc/amadeus/issues/1738) / [#1829](https://github.com/amadeus-dlc/amadeus/issues/1829) / [#1510](https://github.com/amadeus-dlc/amadeus/issues/1510)(ミラー Issue: [#1836](https://github.com/amadeus-dlc/amadeus/issues/1836))

## Problem Statement

formal-model-check(TLA+ 形式検証プラグイン)は機構としては完成しているが、価値が一度もユーザーに到達していない(全 intent の audit にステージイベント 0 件、2026-07-30 実測)。断線は3面ある:

1. **到達面(#1738)**: composition が `.claude` ツリーのみで他ハーネス未 compose、advisory が stderr 1行の弱チャネルで拾われた実績 0 回、発火点が build-and-test 直前で是正コスト最大化の時点、モデルを実装に追従させる工程と新規プロトコルへモデルを供給する工程が存在しない。
2. **配布面(#1829)**: プラグイン stage 本文が repo-only の `scripts/formal-verif/` に依存し、配布先 repo では実行不能。全ハーネス配布変種に `scripts/` 参照が残存し、既存の t258 境界ガードは plugin 面を検査対象外のため無音通過。
3. **運用面(#1510)**: 実装のみ変更(モデル/cfg 不変)時の model-map impl hash 正規更新経路が存在せず、現行 `updateModelMap` は MODEL_UNCHANGED で拒否する(暫定は手編集)。

## Target Customer

- **本 repo の conductor / builder(内部)**: 並行プロトコルの spec 変更時に、要件・設計段の早い時点で形式検証の矛盾検出が届くようになる。実装のみ変更時の SOURCE_DRIFT 赤に正規復旧経路を得る。
- **プラグイン配布先のユーザー(外部)**: compose した formal-model-check プラグインが配布先 repo で自立実行できるようになる(現状は本 repo 内でのみ動作)。

## Success Metrics

機構テスト green のみでの完了扱いは不可(#1738 (d) 裁定、cid:intent-capture:ux-first-scope-for-distribution-intents 準拠)。必須の実測:

1. 実 spec 変更 → directive フィールド消費 → ステージ起動 → 検証結果到達を audit イベント(formal-model-check ステージイベント ≥1 件)で実測する。
2. チェックポイント1経由(RA/US 段での要件矛盾の検出→是正)とチェックポイント2経由(functional-design 段での設計矛盾の検出→是正)の両貫通を含む。
3. 新規モデルを最低1本、実プロトコルで書き起こして検証結果に到達する — 第1候補は mirror lifecycle(close-after-landing の順序クラス、#1816 / #1607 が題材)。
4. 配布面: 配布 plugin が repo-only パス(`scripts/` 等)を参照したら赤になる境界ガードが落ちる実証付きで存在し、`dist/plugins/` 全変種から `scripts/` 参照が消える。
5. 運用面: `--impl-only` 更新が監査行付きで成立し、SOURCE_DRIFT 案内メッセージが正規手順を明記する。

## Initiative Trigger

- 2026-07-30 実測で価値不達(ステージイベント 0 件)が確定し、2026-07-31 のグリリングで修理方針がユーザー裁定済み(#1738)。
- #1829 は同日のユーザー裁定(必要 16 ファイルを抜き出し、残りは削除)済み。
- #1510 は 260726-crossreviewed-bug-batch で実測遭遇し暫定手編集で回避中 — 恒久経路が未整備のまま。
- 先行 Bolt 前提だった #1737(ローカル TLC パーサ偽赤)は PR #1745 で main 着地済み(CLOSED)— 前提消化済み。

## Initial Scope Signal

- スコープ: **self-feature**(工程新設・発火点変更・新 verb モードを含むため。project.md § Scope Overrides 準拠)。
- 含む: #1738 の断線4点の修理((a) composition 多ハーネス化・advisory チャネル強化・発火点前倒し、(c) モデル供給工程+新規モデル1本、(d) e2e 受け入れ実測)、#1829 の全4面(抜き出し 16 ファイル → `plugins/formal-model-check/tools/`、CI 消費分の付け替え、実験残骸の削除、plugin 境界ガード)、#1510 の A 案(`--impl-only` モード+案内メッセージの両方 — Q1 裁定 2026-07-31)。
- 含まない(Won't): #1543(プラグイン導入 UX 全ハーネス追従)、#1735(弱通知チャネル一般化)— Q2 裁定 2026-07-31。本 intent の成果で前進した場合は状態コメント更新のみ。
