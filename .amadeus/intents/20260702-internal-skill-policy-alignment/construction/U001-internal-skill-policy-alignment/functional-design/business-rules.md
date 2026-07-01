# Business Rules

## 目的

内部 skill ポリシー整合 Unit の業務ルールを、実装前の Task 生成で参照できる形にする。

## 業務ルール

| 識別子 | 規則 | 根拠 | 状態 |
|---|---|---|---|
| BR001 | README の Internal Skills は、内部 stage helper、phase 起動時の判断補助、内部確認用 skill を含める。 | R002、UC002 | active |
| BR002 | `amadeus-grilling` と `amadeus-domain-modeling` は Internal Skills として扱う。 | ユーザー判断、R002 | active |
| BR003 | 内部 skill に付ける Codex metadata は source skill を更新し、昇格スクリプトで `.agents/skills` へ反映する。 | R003、R004 | active |
| BR004 | `policy.allow_implicit_invocation: false` は暗黙起動を抑制する目的で使い、明示的な `$skill-name` 起動は維持する。 | R003、UC003 | active |
| BR005 | Claude Code 側の同等設定が確認できない場合は、skill 本文や `CLAUDE.md` に推測の設定を追加せず、確認結果を記録する。 | R004、UC003 | active |
| BR006 | `skill-forge` 監査と `SKILL.md` 英語化は、現在の README と metadata 整合から分離する。 | R005、UC004 | active |

## 例外

- `amadeus-validator` は Issue #284 の内部 skill 候補に含まれているが、`AMADEUS.md` と README の既存説明で公開・横断的補助入口として扱われているため、内部 skill metadata の対象から外す。

## 未確認事項

- Claude Code が将来 per-skill の暗黙起動抑制 metadata を提供するかは未確認である。
