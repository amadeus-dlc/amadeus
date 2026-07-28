# Performance Design — u4-config-overrides-and-diagnostics

上流入力(consumes 全数): performance-requirements, security-requirements, scalability-requirements, reliability-requirements, tech-stack-decisions, business-logic-model

performance-requirements の「設定 parse はオフライン・診断は予算内かつ mutation 0」を、business-logic-model の手順構造で実現する。キャッシュ・非同期は非適用(performance-requirements の非目標 — cid:nfr-design:c1)。

## 設定 parse のオフライン構造

- `mirror-projects` の parse・層解決(business-logic-model の4面一般化)は API 呼び出し 0 回のローカル処理 — 層数は既存3層固定(scalability-requirements)で、コストは設定サイズに線形。parse 結果は同期・診断の両方が共有し(business-logic-model の層解決)、診断専用の再 parse を作らない。

## 診断の呼び出し構造

- 所属照会1回+Project あたり Status フィールド解決1回の直線手順(business-logic-model の repair status 手順)— mutation は構造的に 0 回(reliability-requirements の無害性)。部分成功検出は台帳読取のみ(business-logic-model 手順1 — 追加 API コストなし)。
- 検証の2系統分離(performance-requirements): mutation 0 の negative assert(受入条件12)と、照会回数上限の assert(NFR-3 — 数値は application-design 導出値の消費、本設計で新数値を確定しない)。

## 実行時間の境界

- gh サブプロセスの deadline/stdout cap は既存 profile(performance-requirements の実装直読: amadeus-mirror-runner.ts:29)を消費 — U4 でタイムアウト・throttle を追加しない(tech-stack-decisions の新規依存・新機構ゼロ決定)。

## 非目標

- レスポンスタイム SLO: N/A(performance-requirements の N/A 規律 — オンデマンド単発照会のみ)。診断出力の整形(security-requirements の秘匿契約に従う文字列組み立て)は性能面の設計対象外。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-27T10:55:44Z
- **Iteration:** 1
- **Scope decision:** none

consumes 6件の全実参照・file:line 引用全実在・受入条件12/NFR-3 の帰属分離維持・越境なし・N/A 整合。指摘なし。

### Findings

- None
