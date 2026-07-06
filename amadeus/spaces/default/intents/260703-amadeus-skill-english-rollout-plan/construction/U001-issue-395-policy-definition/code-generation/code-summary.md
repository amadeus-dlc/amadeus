# Code Summary：#395 方針確定

## 目的

Issue #395 の方針確定に必要なリポジトリ差分を作成した。

## 変更したファイル

| ファイル | 変更内容 |
|---|---|
| `docs/amadeus/skill-language-policy.md` | Amadeus skill の `SKILL.md` 英語化方針、対象範囲、日本語維持対象、維持する契約、昇格フロー、検証、完了証拠を追加した。 |
| `.agents/rules/amadeus-artifacts-and-examples.md` | `SKILL.md` の条件付き英語化を許可し、生成成果物とテンプレート由来 Markdown は日本語維持とした。 |
| `AMADEUS.md` | 作業言語と Validation に Skill Language Policy への導線を追加した。 |
| `AGENTS.md` | Amadeus skill 英語化時に Skill Language Policy を参照する指示を追加した。 |
| `README.md` | Documentation に Skill Language Policy への導線を追加した。 |
| `README.ja.md` | Documentation に skill 言語方針への導線を追加した。 |
| `aidlc-state.md` | U001 の Functional Design 承認、3.2 から 3.4 の skip、Code Generation 承認待ちを記録した。 |
| `audit/audit.md` | B001 開始、Functional Design 承認、3.2 から 3.4 の skip、Code Generation 承認待ちを追記した。 |
| `construction/U001-issue-395-policy-definition/functional-design/*` | U001 の Functional Design 成果物を追加した。 |
| `construction/U001-issue-395-policy-definition/code-generation/*` | Code Generation の計画、要約、memory を追加した。 |

## 対応した要求

| 要求 | 対応 |
|---|---|
| R001 | #395 を B001 として開始し、後続 #400、#401、#402 が参照する前提を作った。 |
| R002 | #395 の完了証拠を、対応 PR の merge または明示的な Issue close として方針文書に記録した。 |
| R004 | 翻訳変更、意味変更、昇格フロー、検証結果の境界を PR 説明に記録するルールを追加した。 |
| R005 | #395 の完了証拠を後続の親 Issue 完了判断に使える形で定義した。 |

## 検証

Build and Test で実行する。

Code Generation ではテスト実行結果を記録しない。

## 未完了

- B001 の Build and Test。
- B001 の Bolt PR 作成。
- PR merge または Issue close による #395 完了証拠の確定。
