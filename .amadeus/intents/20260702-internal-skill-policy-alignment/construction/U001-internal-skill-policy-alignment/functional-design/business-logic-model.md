# Business Logic Model

## 目的

内部 skill ポリシー整合 Unit の業務ロジックを、Task 生成と実装判断の根拠として固定する。

## 対象 Unit

U001 内部 skill ポリシー整合。

## 業務ロジック

- Amadeus の skill は、公開入口、横断的補助、内部 skill に分類する。
- README の分類は、利用者が明示起動すべき skill と Amadeus workflow から呼ばれる skill を区別できる一覧にする。
- 内部 stage helper は Codex metadata で `policy.allow_implicit_invocation: false` を持つ。
- Codex metadata は source skill を更新し、昇格スクリプトで昇格先 skill へ反映する。
- Claude Code 側に同等の per-skill 暗黙起動抑制設定が確認できない場合は、非対応理由を記録する。
- Issue #284 のうち `skill-forge` 監査と `SKILL.md` 英語化は、この Construction slice から分離して後続候補にする。

## 入力

- Issue #284。
- `README.md` と `README.ja.md`。
- `AMADEUS.md` と README の skill 分類。
- `skills/amadeus-*` と `.agents/skills/amadeus-*`。
- `skill-forge` の Codex metadata 参照文書。
- `CLAUDE.md` と Claude Code 関連参照。

## 出力

- README の分類更新。
- 内部 stage helper の Codex metadata。
- 昇格スクリプトの metadata 配布対応。
- Claude Code 側の確認結果。
- 後続候補と検証証拠。

## 未確認事項

- `skill-forge` による全 `amadeus-*` skill 監査の実施時期は未確認である。
- 既存 `SKILL.md` 本文の英語化を同じ後続 Issue にするか、個別 Issue に分けるかは未確認である。
