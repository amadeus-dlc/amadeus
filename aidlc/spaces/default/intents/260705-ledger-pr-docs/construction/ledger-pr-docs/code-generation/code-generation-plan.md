# Code Generation Plan — ledger-pr-docs

上流入力: [business-logic-model.md](../functional-design/business-logic-model.md) / [requirements.md](../../../inception/requirements-analysis/requirements.md)

## 変更対象

`docs/amadeus/lifecycle/state.md` に「台帳と PR 断面」の節を 1 個追加する。
docs のみの変更であり、エンジン、validator、hooks、skills には触れない（N1）。

## 何を、どこに、なぜ

business-logic-model.md の「節の構成」に従い、次の 4 点を段落として書く。

1. 原則: `aidlc-state.md` と `audit/audit.md` は追記型の生きた台帳であり、PR の断面ごとに巻き戻さない。org.md の audit 改変禁止と整合させる。
2. PR に含める範囲: 各 phase PR / Bolt PR に含めるのは当該 phase / Bolt の成果物ディレクトリだけで、台帳ファイルは常に最新断面を含む。
3. 読み方: resume と検証は特定 PR の断面ではなく台帳全体（`BOLT_COMPLETED` 等の audit イベントを含む）を読む。
4. レビュー応答: 断面不一致の指摘には本節または Issue #477 へのリンク 1 つで応答し、resolve してよい。PR 説明へ貼れる定型 1 行をコードブロックで併記する。

## 挿入位置の根拠

business-logic-model.md の「挿入位置」節に従い、新節は「承認と履歴（audit）」の直後、「phase 遷移」の直前に置く。
台帳の性質（audit）を述べた直後に PR 断面の扱いへ接続し、その後に phase 遷移の説明へ続く流れが既存構成と整合するため（reviewer Low 指摘対応）。

## R004 の扱いと #464 の進展

requirements.md の R004 は、Phase Progress の更新方式や phase-check の必須性について「#464 で設計判断中」という注記付きの言及に留める、という断定回避の指示であった。
本 Intent の作業時点では、Issue #464 は merge 済みの PR #479 によって解決済みであり、Phase Progress の自動更新と phase-check 成果物の要求はエンジンに実装済みである。
そのため新節では、R004 が想定した「検討中」の hedge をそのまま書かず、#464 は #479 で解決済みであること、挙動の詳細は既存の「phase 遷移」節へ委ねることの 1 文だけを橋渡しとして置く。
挙動そのものの再説明は行わない。
