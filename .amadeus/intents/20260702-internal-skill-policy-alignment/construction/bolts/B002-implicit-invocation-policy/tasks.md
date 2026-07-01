# Construction Tasks

- [x] T001: 内部 skill の Codex metadata を追加する
  - 作業:
    - source skill の `agents/openai.yaml` に英語の interface metadata を追加する。
    - `policy.allow_implicit_invocation: false` を設定する。
    - metadata の source hash を `SKILL.md` の現在内容に合わせる。
  - 要求: R003, R004
  - ユースケース: UC003
  - 依存: B001/T001
  - 設計根拠: ../../U001-internal-skill-policy-alignment/functional-design/business-logic-model.md#業務ロジック
  - 証拠: test-results.md

- [x] T002: metadata 昇格ルールを更新する
  - 作業:
    - 昇格スクリプトが `agents/` を配布対象として扱うことを確認する eval を追加する。
    - `dev-scripts/promote-skill.ts` で `agents/` を source skill から昇格先 skill へ反映する。
    - 内部 skill を昇格し、`.agents/skills` 側の metadata を source skill と対応させる。
  - 要求: R003, R004
  - ユースケース: UC003, UC004
  - 依存: T001
  - 設計根拠: ../../U001-internal-skill-policy-alignment/functional-design/domain-entities.md#Domain Entity
  - 証拠: test-results.md

- [x] T003: Claude Code 側の同等設定を確認する
  - 作業:
    - リポジトリ内の Claude Code 関連文書と `skill-forge` 参照を確認する。
    - 同等の per-skill 暗黙起動抑制設定が見つからない場合は、非対応理由を記録する。
  - 要求: R004
  - ユースケース: UC003, UC004
  - 依存: T002
  - 設計根拠: ../../U001-internal-skill-policy-alignment/functional-design/business-rules.md#業務ルール
  - 証拠: test-results.md
