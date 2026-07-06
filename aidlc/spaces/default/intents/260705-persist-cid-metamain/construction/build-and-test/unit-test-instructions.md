# Unit Test Instructions

Unit: persist-cid-metamain（Test Strategy: Minimal）

## 対象

Bolt 2 本の修正に対する要求駆動の検証は、専用 eval に集約している。

```sh
npm run test:it:persist-cid-metamain
```

## 検査構成（34 項目）

- B001（FR-1）: 隔離 workspace で intent-birth と amadeus-learnings.ts persist を実 CLI 駆動し、別 Intent の同名 candidate_id の追記（FR-1.1）、再 persist の冪等性と戻り値分離（FR-1.4/1.5。2 回目は rule_learned=0 / already_present=1 / marker 出現 1 件）、旧形式 marker 共存時の初回 append（FR-1.3 の pin）を検査する。
- B002（FR-2）: 5 ファイルの import 副作用ゼロ（FR-2.2）、引数なし実行の usage エラーと exit code の不変（FR-2.3）、全 tools 走査で未ガード 0 件の回帰検査（FR-2.5）。

## TDD 証跡

全検査が RED → GREEN の順で確認済み。詳細は code-generation の [code-summary.md](../persist-cid-metamain/code-generation/code-summary.md) を参照する。
