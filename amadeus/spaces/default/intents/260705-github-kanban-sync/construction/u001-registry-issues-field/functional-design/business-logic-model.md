# Business Logic Model — u001-registry-issues-field

上流入力: [unit-of-work.md](../../../inception/units-generation/unit-of-work.md)、[unit-of-work-story-map.md](../../../inception/units-generation/unit-of-work-story-map.md)、[requirements.md](../../../inception/requirements-analysis/requirements.md)、[components.md](../../../inception/application-design/components.md)、[component-methods.md](../../../inception/application-design/component-methods.md)、[services.md](../../../inception/application-design/services.md)

## 処理モデル

U001 は実行時ロジックを持たない。台帳（`intents.json`）へのスキーマ追加と遡及補完、および読み手の互換検証だけで構成する。

1. **スキーマ追加**: 各 entry に任意フィールド `issues`（数値の配列）を追加可能にする。JSON スキーマファイルは存在しないため、契約は本設計と検証コードで表現する。
2. **遡及補完（ワンショット、D-AD10）**: 実装者が各 Intent record の `aidlc-state.md`（Project 文）と audit の Request 文を読み、判別できる Issue 番号を entry へ直接記入する。判別できない entry には `issues` を書かない（省略 = 空扱い。「未確認」を空配列で偽装しない）。
3. **互換検証**: `issues` を持つ entry と持たない entry が混在する `intents.json` を、既存の読み手（エンジンの registry 読み取り、validator の Intent Registry 検査）が従来どおり扱えることを検証で確認する。

## 読み手への公開契約

- `issues` が無い entry は空（`[]` 相当）として扱う（registry の `repos` 既定値と同じ規約。project.md Corrections の前例に従う）。
- 消費者は U002 の IntentScanner（components.md C-1）だけであり、U001 時点でエンジン・validator は `issues` を解釈しない（未知フィールドとして無視される）。
- US-1 受け入れ基準 1 件目（board カードへの Issue 反映）は U002 の範囲であり、U001 の gate では基準 2（互換）と基準 3（遡及補完）を判定する。
