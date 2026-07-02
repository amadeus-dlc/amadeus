---
name: amadeus-construction-code-generation
description: >-
  Amadeus Construction の内部 skill。Stage 3.5 Code Generation だけを Unit ごとに実行する。
  Bolt の worktree 内で、対象 Unit の設計成果物を入力に実装計画を立て、コードとテストコードを
  生成し、plan.md と summary.md を作成する場面では必ず使う。テスト実行と Bolt 記録は
  Build and Test が扱う。traceability と state の phase 確定は行わない。
---

# amadeus-construction-code-generation

## 目的

Construction の Stage 3.5 Code Generation だけを、対象 Unit ごとに進める。

この skill は `amadeus` 入口から Bolt 実行の中で呼び出される内部 skill である。

対象 Unit の設計成果物を入力に、実装計画を立て、コードとテストコードを生成する。

## 前提

対象 Intent の `state.json` で、`stages["code-generation"]` が実行対象であり、対象 Unit の `stages["code-generation"].units["<unit-id>"].state` が `pending`、`active`、`awaiting_approval`、`revising` のいずれかであることを前提にする。

状態が `awaiting_approval` の場合は、成果物を作り直さず、ゲートの提示から再開する。
状態が `revising` の場合は、前回の成果物と差し戻し理由を提示してから、修正だけを行う。
どちらの場合も、手順を最初からやり直さない。

実装は対象 Bolt の branch と worktree で行う。
branch の作成と worktree の隔離は `amadeus` 入口の Bolt の開始処理が行い、この skill は worktree 内で作業する。

少なくとも次を読む。

- `inception/units-generation/units.md`（対象 Unit。Units Generation を実行しなかった場合は暗黙 Unit として Intent のモジュールファイルと要求を使う）
- `inception/requirements-analysis/requirements.md`（Requirements Analysis 実行時。security-patch では `construction/<unit-id>-<slug>/nfr-requirements/security-requirements.md` を要求の定義元にする）
- `construction/<unit-id>-<slug>/functional-design/`、`nfr-design/`、`infrastructure-design/` の成果物（実行した場合）
- `inception/practices-discovery/team-practices.md`（実行した場合）
- `state.json`

## 質問

Construction では質問を例外扱いにする。
前段の成果物が扱わなかった本物の欠落を検出した場合だけ、`amadeus-grilling` のプロトコルで一問ずつ確認する。
質問を行った場合は `construction/<unit-id>-<slug>/code-generation/questions.md` に記録する。

## テンプレート

優先順位は次である。

1. `.amadeus/settings/templates/intents/construction/code-generation/`
2. この skill に同梱された `templates/construction/code-generation/`

分からない項目は空欄にせず、`未確認` と書く。

## 成果物

作成または更新するものは次だけである。

- アプリケーションコードとテストコード（対象リポジトリへの最小の変更）
- `construction/<unit-id>-<slug>/code-generation/plan.md`（実装計画。変更対象、変更順序、検証方法）
- `construction/<unit-id>-<slug>/code-generation/summary.md`（実装結果の要約。変更したファイル、対応した要求）
- `state.json`（対象 Unit の状態と approval evidence）
- 質問を行った場合は `construction/<unit-id>-<slug>/code-generation/questions.md`

## 手順

以下の手順は、状態が `pending` から開始する場合の流れである。
`awaiting_approval` または `revising` からの再開では、前提の再開規則に従い、ゲートの再提示または修正に必要な手順だけを実行する。

1. 対象 Unit の `stages["code-generation"].units["<unit-id>"].state` を `active` にする。
2. 対象 Unit の設計成果物と要求を読み、`plan.md` を作る。
3. 計画に従い、コードとテストコードを最小の変更で生成する。既存コードの周辺の書き方（命名、コメント密度、慣用句）に合わせる。
4. `summary.md` を作る。
5. 対象 Unit の状態を `awaiting_approval` にし、ゲートを提示する。

規模が大きい場合は、実装を subagent に委譲してよい。

## ゲート

実装計画と変更の要約を示し、Approve と Request Changes の 2 択で承認を求める。
Construction のゲートは 2 択に限り、スキップ済みステージの追加実行を選択肢にしない。
Request Changes が 3 回続いたら Accept as-is を選択肢に加える。
ゲートを提示したターンでは人間の回答を待つ。

`state.json.autonomy` が `continue_autonomously` で、対象 Bolt が walking skeleton ではない場合は、ゲートを提示せずに次へ進む。
この場合の approval evidence は、Bolt PR の merge 後に `amadeus` 入口の Bolt 境界処理が `via: "pr"` と PR の URL で記録する。
失敗や本物の欠落を検出した場合は、autonomy に関わらず停止して人間に確認する。

承認されたら `stages["code-generation"].units["<unit-id>"].state` を `completed` にし、`stages["code-generation"].units["<unit-id>"].approval` に `approvedAt` と `via: "conversation"` を記録する。
差し戻されたら `stages["code-generation"].units["<unit-id>"].state` を `revising` にする。
Accept as-is が選ばれた場合は、`stages["code-generation"].units["<unit-id>"].state` を `completed` にし、`stages["code-generation"].units["<unit-id>"].approval` に `approvedAt`、`via: "conversation"`、`"acceptedAsIs": true` を記録し、この判断を `construction/decisions.md` に記録する。

## 禁止事項

- Bolt の worktree の外で対象リポジトリを変更しない。
- 対象 Unit の範囲を超える変更（隣接コードの改善、無関係なリファクタリング）をしない。
- テストの実行結果を記録しない。実行と記録は Build and Test の責務である。
- 承認を待たずに `completed` を記録しない。

## 次の skill

- 続きを進める場合: `amadeus`（入口が Bolt 内の次ステージを解決する）
- 成果物の構造検証: `amadeus-validator`
