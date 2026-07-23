# Performance Design — U3-mirror-config

上流入力(consumes 全数): performance-requirements.md、security-requirements.md、scalability-requirements.md、reliability-requirements.md、tech-stack-decisions.md、business-logic-model.md

## PD-U3-1: 固定上限の同期読取(PR-U3-1)

`resolve` の入力は解決済みのprojectDir、space、intentDirとする。explicit arg > pointerのカーソル解決は呼出し側の既存責務であり、この性能予算の対象外である。`resolve` 自身はGlobal、Space、Intentの設定JSONを`readFileSync`で各1回だけ読む。再帰探索、ディレクトリ列挙、リトライ、並列化は行わず、設定解決1回のコストを3 readと3 parse以下に固定する。

## PD-U3-2: キャッシュを持たない(PR-U3-2)

phase境界ごとにディスクを読み直し、プロセス内・プロセス間キャッシュは設けない。workflow中の呼出し回数が少なく、キャッシュ無効化と設定反映遅延の複雑性が再計算コストを上回るためである。JSON処理はtech-stack-decisions.mdどおりBun組込の`JSON.parse`だけを使う。

## 性能検証

integrationテストで3面すべてが存在するfixtureを解決し、設定JSON用に注入したreaderの呼出し回数が各パス1回かつ合計3回であることを検証する。カーソル解決済みのspaceとintentDirを入力することで、計測対象へpointer読取を混入させない。時間閾値は環境依存で強制機構がないため設けない。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-23T07:05:02Z
- **Iteration:** 1
- **Scope decision:** none

fail-closed境界の入力型定義と性能計測境界に実装結果を左右する欠落がある。

### Findings

- MAJOR NFR-U3-I1-001: JSONルート値をnullでも配列でもないJSON objectと定義し、array/null/primitive拒否テストを追加する。
- MINOR NFR-U3-I1-002: 3 read上限が設定JSONだけかカーソル解決を含むresolve全体かを明記する。

## Review — Iteration 2

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-23T07:06:44Z
- **Iteration:** 2
- **Scope decision:** none

JSONルート型境界は是正済み。resolveのカーソル解決責務がbusiness-logic-model.mdとNFR設計で矛盾する。

### Findings

- RESOLVED NFR-U3-I1-001: JSONルート値の型境界と拒否テストは是正済み。
- MAJOR NFR-U3-I2-001: resolveの公開契約、pointer読取所有者、3 read計測範囲をbusiness-logic-model.mdとNFR設計で統一する必要がある。
