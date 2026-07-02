# B003 実行メモ

## 実行方針

- 共有インデックスへ書き込む手順を持つ skill は、`amadeus-ideation-intent-capture`（intents.md 行の追加）、`amadeus-discovery`（discoveries.md 行の追加）、`amadeus-steering`（index テンプレート）の 3 つであることを grep で確定済み。他の skill は読み取りまたは禁止事項の言及のみで、更新対象外。
- 生成マーカーの文言は B001 の `INTENTS_MARKER` と `DISCOVERIES_MARKER` を正とし、テンプレートに同じ文言を書く。
- 手順が案内する再生成コマンドは、配布先ユーザー環境で実行できる昇格先パス（`.agents/skills/amadeus-validator/scripts/IndexGenerate.ts`）を使う。
- skill 変更 PR はレビュー支援契約（挙動差分要約、skill-forge 確認、粒度制約）に従う。PR 説明で対応する。

## 対象タスク

- T001: intent-capture の手順とテンプレート更新。
- T002: discovery の手順更新。
- T003: steering のテンプレート更新。
- T004: promote 同期。

## 作業順序

1. T001 から T003 は互いに独立しており、任意の順で進められる。
2. T004 は 3 つの変更の後に実行する。

## 未確認事項

- steering SKILL.md 本文に index 雛形への言及があるかは T003 の実装時に確認する。
