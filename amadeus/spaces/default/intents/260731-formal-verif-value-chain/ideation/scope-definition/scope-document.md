# Scope Document — formal-verif-value-chain

上流入力(consumes 全数): intent-statement

本文書は intent-statement(`../intent-capture/intent-statement.md`)の Problem Statement・Success Metrics・Initial Scope Signal を境界定義へ具体化する。feasibility-assessment / constraint-register は本スコープ(self-feature)で feasibility ステージが SKIP のため存在しない — 外部前提の検証は requirements 段の実測で代替する。

## In Scope

### WS-A: 配布自立化(#1829 — 先行。Q1 裁定 dependency+risk-first)

1. `scripts/formal-verif/` から runner の推移的依存閉包 16 ファイルを `plugins/formal-model-check/tools/` へ移設し、stage 本文(`formal-model-check.md:12` / `:41`)の参照をプラグイン相対パスへ書き換える
2. CI 消費分(`.github/workflows/ci.yml:584` / `:600` の `run-model-check-ci.ts` 系)を移設後 runner の消費へ付け替え、残す最小集合を確定
3. 実験残骸(arm-s-*, eligibility*, tla-skeleton* 等)と対応テスト・baseline/allowlist エントリの削除(allowlist 行ピンは機械 remap — cid:code-generation:c1-allowlist-mechanical-remap)
4. plugin 境界ガード: 配布 plugin が repo-only パス(`scripts/` 等)を参照したら赤(t258 同型、落ちる実証必須)

### WS-B: 価値到達面(#1738 (a)(b))

5. composition の多ハーネス化(現状 `.claude` のみ → 他ハーネスツリーへ)
6. advisory チャネル強化(stderr 1行の弱チャネルからの脱却)
7. 発火点の前倒し(build-and-test 直前 → 要件・設計段のチェックポイント)

### WS-C: モデル工程(#1738 (c))

8. モデル追従工程(model-completeness sensor の検出を是正へ繋ぐ工程)と新規プロトコルへのモデル供給工程の定義
9. 新規モデル1本: **mirror lifecycle**(Q2 裁定)— close-after-landing 順序クラス(#1816/#1607)+重複 create 不変量(#1838: issueNumber 記録済みなら create を再選択しない)を invariant 候補に含む。完成条件は TLC 完全探索完走+落ちる実証+人間ゲート

### WS-D: 運用経路(#1510 — Q1 裁定 intent-capture)

10. `updateModelMap --impl-only` モード(宣言要求+監査行)+ SOURCE_DRIFT 案内メッセージへの正規手順明記の両方

### 受け入れ(#1738 (d))

11. e2e audit 実測: formal-model-check ステージイベント ≥1 件、チェックポイント1(RA/US 段)・2(FD 段)の両貫通、新規モデルの検証結果到達。機構テスト green のみでの完了は不可

## Out of Scope(Won't)

- #1543(プラグイン導入 UX 全ハーネス追従)・#1735(弱通知チャネル一般化)— intent-capture Q2 裁定。前進があれば状態コメント更新のみ
- #1737 — PR #1745 で着地済み(前提消化)
- telemetry・汎用 adapter・外部 messaging(260722-tla-plugin の Won't を継承)
- #1838(mirror 重複 create バグ)の**修正** — 別 intent。本 intent では WS-C の invariant 題材としてのみ参照

## Sequencing(Q1 裁定: dependency+risk-first)

WS-A(移設)を最初に確定する — WS-C のモデル工程と WS-D の updateModelMap は同じファイル群に触れるため、配置確定を先行して手戻りを消す。walking skeleton は「移設後の runner がプラグイン所有ツリーから e2e で回る」薄スライス。WS-B は WS-A と交差しない範囲で後続または並行(交差判定は delivery-planning で実 diff ベース)。

## Hard Deadlines

なし(ユーザーからの期限指定なし)。
