# Requirements — 台帳と PR 断面の常設文書化（260705-ledger-pr-docs）

対象 Issue: [#477](https://github.com/amadeus-dlc/amadeus/issues/477)

## 意図分析

Intent 260705-github-kanban-sync の stacked PR 運用で、「aidlc-state.md / audit が PR 断面と一致しない」というレビューボット指摘が 4 回繰り返された（#471 × 2、#473、#475）。
非対応の判断根拠（生きた台帳）が常設文書に無いため、Intent ごとに同じ説明を書く必要がある。本 Intent はその判断根拠を正準文書へ 1 箇所で常設化する。

## 機能要求

- R001: `docs/amadeus/lifecycle/state.md` に「台帳と PR 断面」の節を追加する（questions Q1 = A）。
- R002: 節は少なくとも次の 4 点を規定する。
  1. aidlc-state.md と audit は追記型の生きた台帳であり、phase PR / Bolt PR の断面ごとに状態を巻き戻さない（org.md の audit 改変禁止と整合）。
  2. 各 phase PR に含めるのは当該 phase の成果物ディレクトリだけで、台帳ファイルは常に最新断面を含む。
  3. resume・検証は特定 PR の断面ではなく台帳全体（audit の BOLT_COMPLETED 等を含む）を読む。
  4. レビューで断面不一致の指摘を受けた場合の応答: この節（または #477）へのリンク 1 つで返し、resolve してよい。
- R003: 節に「PR 説明へ貼れる 1 行の定型文」を含める（questions Q2 = A。テンプレートファイルは新設しない）。
- R004: 新節は phase 境界の挙動を断定しない。台帳の一般原則（追記型・断面不巻き戻し・全体読み）だけを規定し、Phase Progress の更新方式や phase-check の必須性など #464 で設計判断中の論点には「#464 で自動化・契約整理を検討中」という注記付きの言及に留める（questions Q3 = A 改。#464 は OPEN で解決方向が未決着のため、未確定事項を確定事実として書かない）。
  出典: 並行 Intent 260705-hooks-state-bugfix（claude-amadeus-sub）からの申し送り。agmsg 履歴（team j5ik2o-home、2026-07-05T06:41:26Z、claude-amadeus-sub → claude-kanban-470）に記録がある。

## 非機能要求

- N1: 変更は docs のみ。エンジン・validator・hooks・skills に触れない（sub の #464/#476 と接触面なし）。
- N2: 日本語で書き、`japanese-tech-writing` の規範に従う。

## 制約・前提

- state.md の既存の見出し・語彙・粒度に合わせて追記する（生成前チェックの規約）。
- 台帳の語彙は CONTEXT.md / 既存文書の canonical name を使う。

## 未解決の疑問点

なし。

## 受け入れ条件

1. `docs/amadeus/lifecycle/state.md` から台帳と PR 断面の扱いが参照できる（R001 / R002）。
2. 同種のボット指摘に対し、節へのリンク 1 つで応答できる文面が文書内に存在する（R002-4 / R003）。
3. `npm run test:all` が green のまま（docs のみの変更であることの裏取り）。

## スコープ外

PR テンプレートファイルの新設、Bugbot / CodeRabbit の設定変更（.coderabbit.yml は人間許可なしに変更しない）、stacked PR 運用自体の見直し（#407 の領分）。
