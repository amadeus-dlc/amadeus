---
name: amadeus-inception-practices-discovery
description: >-
  Amadeus Inception の内部 skill。Stage 2.2 Practices Discovery だけを実行する。
  対象 Intent でチームの開発プラクティス（ブランチ戦略、テスト方針、デプロイ、品質基準）を
  証拠付きで発見し、team-practices.md、discovered-rules.md、evidence.md を作成または更新する場面では必ず使う。
  steering policies への昇格は人間の承認を要する。要求、設計、Unit、Bolt、実装は作らない。
---

# amadeus-inception-practices-discovery

## 目的

Inception の Stage 2.2 Practices Discovery だけを進める。

この skill は `amadeus` 入口から呼び出される内部 skill である。

チームの開発プラクティスを発見して証拠付きで記録し、人間が確認したものを steering layer の policies へ昇格する。

## 前提

対象 Intent の `state.json` で、`stages["practices-discovery"]` が実行対象であり、状態が `pending`、`active`、`awaiting_approval`、`revising` のいずれかであることを前提にする。

状態が `awaiting_approval` の場合は、成果物を作り直さず、ゲートの提示から再開する。
状態が `revising` の場合は、前回の成果物と差し戻し理由を提示してから、修正だけを行う。
どちらの場合も、手順を最初からやり直さない。

Condition は「鮮度維持のため毎回再実行する」である。
scope が実行対象にする場合、このステージを skip しない。
既存の発見結果がある場合も再確認し、古くなった記述を更新する。
brownfield は Reverse Engineering の成果物と repo 内の証拠から発見し、greenfield は質問で確認する。

少なくとも次を読む。

- `.amadeus/knowledge/codebase/<repo>/`（brownfield の場合）
- `.amadeus/steering/policies/`（既存 policies）
- `state.json`

## 質問

greenfield、または証拠から判断できない論点は、次を確認する。

- ブランチ戦略と PR の単位はどうしているか。
- テストの方針と品質基準は何か。
- デプロイと CI のトリガーはどうしているか。

質問は `amadeus-grilling` のプロトコルに従い、一問ずつ、推奨回答を添えて提示し、回答を待つ。
質問の量は `state.json.depth` を目安にする。
質問を行った場合は `inception/practices-discovery/questions.md` に記録する。

## テンプレート

優先順位は次である。

1. `.amadeus/settings/templates/intents/inception/practices-discovery/`
2. この skill に同梱された `templates/inception/practices-discovery/`

分からない項目は空欄にせず、`未確認` と書く。

## 成果物

作成または更新するものは次だけである。

- `inception/practices-discovery/team-practices.md`
- `inception/practices-discovery/discovered-rules.md`
- `inception/practices-discovery/evidence.md`
- `inception/practices-discovery/timestamp.md`
- `state.json`（`stages["practices-discovery"]` の状態と approval evidence）
- 質問を行った場合は `inception/practices-discovery/questions.md`

## 手順

以下の手順は、状態が `pending` から開始する場合の流れである。
`awaiting_approval` または `revising` からの再開では、前提の再開規則に従い、ゲートの再提示または修正に必要な手順だけを実行する。

1. `stages["practices-discovery"].state` を `active` にする。
2. brownfield は codebase 知識と repo 内の証拠（CI 設定、既存 PR、設定ファイル）からプラクティスを抽出する。greenfield は質問で確認する。
3. `team-practices.md`、`discovered-rules.md`、`evidence.md`、`timestamp.md` を作る。
4. `stages["practices-discovery"].state` を `awaiting_approval` にし、ゲートを提示する。

steering policies への昇格は、ゲートの承認後だけ行う（ゲートの節を参照）。

## ゲート

成果物の要約と確認先パスを示し、Approve と Request Changes の 2 択で承認を求める。
Inception ステージでは、スキップ済みステージの追加実行を第 3 の選択肢にできる。
スキップ済みステージの追加実行が選ばれた場合は、対象ステージの `stages` の状態を `skipped` から `pending` に戻し、skip 理由の記録を取り消してから `amadeus` 入口へ戻る。入口が次の解決で対象ステージを選ぶ。
Request Changes が 3 回続いたら Accept as-is を選択肢に加える。
ゲートを提示したターンでは人間の回答を待つ。

承認されたら `stages["practices-discovery"].state` を `completed` にし、`stages["practices-discovery"].approval` に `approvedAt` と `via: "conversation"` を記録する。
承認の後で、確認済みプラクティスの steering policies への昇格を提案し、人間が承認した項目だけを `.amadeus/steering/policies/` に反映する。
差し戻されたら `stages["practices-discovery"].state` を `revising` にする。
Accept as-is が選ばれた場合は、`stages["practices-discovery"].state` を `completed` にし、`stages["practices-discovery"].approval` に `approvedAt`、`via: "conversation"`、`"acceptedAsIs": true` を記録し、この判断を `inception/decisions.md` に記録する。

## 禁止事項

- 人間の承認なしに steering policies を変更しない。
- 証拠のないプラクティスを確定として書かない。証拠がない場合は `未確認` と書く。
- 要求、設計、Unit、Bolt、実装を作らない。
- 承認を待たずに `completed` を記録しない。

## 次の skill

- 続きを進める場合: `amadeus`（入口が次ステージを解決する）
- 成果物の構造検証: `amadeus-validator`
