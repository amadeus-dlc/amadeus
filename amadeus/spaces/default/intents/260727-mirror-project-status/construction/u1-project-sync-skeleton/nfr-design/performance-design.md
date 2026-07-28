# Performance Design — u1-project-sync-skeleton

上流入力(consumes 全数): performance-requirements, security-requirements, scalability-requirements, reliability-requirements, tech-stack-decisions, business-logic-model

performance-requirements の呼び出し回数予算を、business-logic-model の8ステップ制御フローへ構造として焼き込む設計。キャッシュ・非同期・プール等の常駐系パターンは採らない(cid:nfr-design:c1 — 決定的な呼び出し構造で代替。tech-stack-decisions の「新規依存ゼロ」と整合)。

## 呼び出し予算の構造的保証

- **一括照会**: 所属照会は `listProjectItems(issue)` を boundary 冒頭に1回だけ置く(business-logic-model 手順2)— per-Project の所属照会を作らない構造で「boundary あたり1回」(performance-requirements)を設計段階で保証する。
- **per-Project 上限**: Status 解決は `resolveProjectStatusField(project)` 1回(手順4)、mutation は追加(手順3)+適用(手順7)の最大2回 — 手順の直列構造自体が上限(performance-requirements の予算)の実装になる。ループ・リトライを手順内に置かない(リトライは boundary 駆動 — reliability-requirements)。
- **mutation 省略の早期分岐**: 既所属 → 追加 skip(手順3)/ 既一致 → 適用 skip(手順7)/ keep → 以降 skip(手順5)— 冪等分岐を mutation 発行より**前**に置く配置で、無駄な API 呼び出しをゼロにする(scalability-requirements の線形性を最小係数で達成)。

## 検証シームの設計

- FakeGateway の呼び出し履歴(history)を検査面とし、per-Project の照会・mutation 回数を counter assert する(performance-requirements の検証様式)。実時間計測・負荷試験は設計に含めない。
- 秘匿制約(security-requirements)により history 検査はメソッド名・回数のみを対象とし、応答 body の内容比較を検査に持ち込まない。

## 実行時間の境界

- gh サブプロセスの deadline/stdout cap は既存 profile(performance-requirements の実装直読: amadeus-mirror-runner.ts:29)をそのまま消費 — U1 で profile 追加・変更をしない(tech-stack-decisions のプロセスモデル決定)。

## 非目標

- キャッシュ・接続プール・非同期処理・ページング: N/A — 単発 CLI 実行で照会は boundary あたり1回のみ(performance-requirements の N/A 規律を設計面でも維持)。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-27T10:42:46Z
- **Iteration:** 1
- **Scope decision:** none

consumes 6件の実参照・手順番号引用22箇所全一致・責務境界維持・常駐系パターン持ち込みなし。Minor 1件(reliability-requirements への装飾的帰属)は conductor が受理前に是正しセンサー再 PASSED。

### Findings

- [Minor] security-design.md の削除・アーカイブ不在検査の帰属が reliability-requirements への装飾的対応付け(実参照なし)— 是正済み: security-requirements の negative assert 面へ帰属変更
