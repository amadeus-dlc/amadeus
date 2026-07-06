# Code Generation Plan：#395 方針確定

## 目的

Issue #395 の方針、対象範囲、注意事項、検証方法をリポジトリ上で参照できるようにする。

後続の #400、#401、#402 が `SKILL.md` 英語化を進める前提として使える最小差分にする。

## 変更対象

| 対象 | 変更内容 | 理由 |
|---|---|---|
| `docs/amadeus/skill-language-policy.md` | 新規作成 | 英語化方針、対象範囲、日本語維持対象、昇格フロー、検証方法、完了証拠を定義するため。 |
| `.agents/rules/amadeus-artifacts-and-examples.md` | 言語ルールを更新 | `skills/amadeus*/SKILL.md` と `.agents/skills/amadeus*/SKILL.md` の条件付き英語化をルール違反にしないため。 |
| `AMADEUS.md` | 作業言語と Validation に方針リンクを追加 | エージェントが Amadeus を扱う共通入口から方針を参照できるようにするため。 |
| `AGENTS.md` | skill 英語化時の参照先を追加 | workspace の作業指示から方針文書へ接続するため。 |
| `README.md` | Documentation に方針リンクを追加 | 英語 README から方針文書へ到達できるようにするため。 |
| `README.ja.md` | Documentation に方針リンクを追加 | 日本語 README から方針文書へ到達できるようにするため。 |

## 変更順序

1. 方針文書を追加する。
2. 既存の言語ルールを、生成成果物の日本語維持と Amadeus skill `SKILL.md` の条件付き英語化に分ける。
3. 共通入口と README に導線を追加する。
4. Construction の state と audit に Code Generation の承認待ちを記録する。
5. Amadeus Validator で `aidlc/` 成果物の構造を検証する。

## 検証方法

Code Generation ではテスト実行結果を記録しない。

テスト実行と結果記録は B001 の Build and Test で行う。

この stage では、`amadeus-validator` で `aidlc/` 成果物の構造だけを確認する。

## 対象外

- `SKILL.md` 本文の英語化。
- source skill から昇格先 skill への反映。
- `agents/openai.yaml` の更新。
- Issue #395 の close。
- PR の作成。
