# スコープ

## 対象境界

### 対象

| 識別子 | 境界 | 根拠 | 状態 |
|---|---|---|---|
| SC-IN-001 | `.amadeus/intents.md` と `.amadeus/discoveries.md` を、`intents/` と `discoveries/` 配下のモジュールから決定論的に再生成できるようにする。 | [Issue #334](https://github.com/amadeus-dlc/amadeus/issues/334) | 採用 |
| SC-IN-002 | インデックスと配下モジュールの不整合を validator が fail にする。 | [Issue #334](https://github.com/amadeus-dlc/amadeus/issues/334) | 採用 |
| SC-IN-003 | 生成の入口は配布先ユーザー環境（repo root の開発用スクリプトなし）で実行できる形にする。 | [Issue #334](https://github.com/amadeus-dlc/amadeus/issues/334) | 採用 |
| SC-IN-004 | 再生成の決定論性を確認する eval または決定論的検証を、実装より先に追加する。 | [Intent](../../20260702-shared-index-generation.md) | 採用 |

### 対象外

| 識別子 | 境界 | 根拠 | 状態 |
|---|---|---|---|
| SC-OUT-001 | `glossary.md`、`domain-map.md`、`context-map.md` を生成物化する。共有インデックス以外の steering 成果物は今回の衝突除去の対象ではないため。 | [Issue #334](https://github.com/amadeus-dlc/amadeus/issues/334) | 採用 |
| SC-OUT-002 | repo 開発用 `CONTEXT.md` を対象にする。 | [Issue #334](https://github.com/amadeus-dlc/amadeus/issues/334) | 採用 |
| SC-OUT-003 | 並行実行の他候補（ゲート待ちキューの可視化、並行運用ポリシー、Bolt の依存 wave 並行実行）を扱う。 | [Discovery](../../../discoveries/20260702-parallel-execution.md) | 採用 |
| SC-OUT-004 | 初期 Ideation で後続 phase の詳細成果物や実装を作る。 | [Intent](../../20260702-shared-index-generation.md) | 採用 |

## 実行制御

| 項目 | 値 | 理由 |
|---|---|---|
| 実行スコープ | refactor | 既存の共有インデックス更新手順を、配下モジュールからの決定論的な再生成へ置き換えるため。 |
| 省略 stage | なし | インデックスと配下モジュールの情報境界を Inception で分解し、Construction で生成手段と検査の実装を行うため。 |

## 成果物深度

| 項目 | 値 | 理由 |
|---|---|---|
| 深度 | standard | インデックスに残す情報と配下モジュールへ移す情報の境界、依存関係表の扱い、生成入口の契約を追跡できる粒度が必要であるため。 |

## 検証戦略

| 項目 | 値 | 理由 |
|---|---|---|
| 戦略 | standard | 再生成の決定論性検証（RED → GREEN）、validator の不整合検査、既存 workspace と examples での再生成一致確認、標準検証が必要であるため。 |

## Inception への引き継ぎ

- インデックスに残す情報（一覧の列）と配下モジュールへ移す情報（依存、理由、状態）の境界を確定する。
- `intents.md` の依存関係表の移行先（各 Intent のモジュールファイルへ移すか、インデックスに残すか）を確定する。
- 生成入口の配置先（skill 同梱スクリプトか、validator の一部か）を確定する。
- 手書き編集とのすみ分け（生成対象範囲の宣言方法、生成マーカーの要否）を確定する。
- 既存の examples snapshot への影響と再生成の要否を確定する。
