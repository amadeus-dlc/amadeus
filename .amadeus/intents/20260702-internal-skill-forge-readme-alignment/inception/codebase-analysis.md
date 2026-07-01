# 既存コード分析

## 対象コード

- `README.md`
- `README.ja.md`
- `skills/amadeus-*`
- `.agents/skills/amadeus-*`
- `.agents/skills/skill-forge/SKILL.md`
- `.agents/rules/backward-compatibility.md`
- `package.json`

## 既存能力

- README は、Phase Skills、Cross-Cutting Support Skills、Internal Skills に分けて Amadeus の skill 利用入口を説明している。
- README は、公開入口として `amadeus-steering`、`amadeus-discovery`、`amadeus-ideation`、`amadeus-inception`、`amadeus-construction` を lifecycle 順に示している。
- README は、内部 skill は Amadeus の workflow から必要に応じて使うものであり、通常は公開入口 skill を使うと説明している。
- `skills/amadeus-*` と `.agents/skills/amadeus-*` には、同名の Amadeus skill が 28 件ずつ存在する。
- source skill と昇格先成果物は、steering policy 上は `dev-scripts/promote-skill.ts` による同期対象である。
- 一部の source skill には `evals/evals.json` があり、skill-forge の確認観点を eval へ広げる候補がある。
- `package.json` には `npm run test:all`、`contracts:check`、`test:it:promote-skill`、`validate:workspace` などの検証入口がある。

## 統合点

- README の skill 分類と、実際の `skills/amadeus-*`、`.agents/skills/amadeus-*` の一覧を照合できる。
- `skill-forge` の `SKILL.md` は、skill 本文、trigger description、eval、Codex metadata、packaging の確認観点を提供している。
- `.agents/rules/backward-compatibility.md` は、互換性維持対象が `docs/backward-compatibility.md` に明記された対象に限られることを示している。
- `package.json` の検証入口は、README 更新、skill 契約、昇格先成果物、validator の構造確認を Construction へ渡す材料になる。

## ギャップ

- README の Internal Skills は `amadeus-grilling` と `amadeus-domain-modeling` だけを列挙しており、実際に存在する内部 `amadeus-*` skill の全体像とは粒度が違う。
- README が公開入口の案内として絞っているのか、内部 skill 一覧が不足しているのかを、Inception で分類基準として明確にする必要がある。
- `skill-forge` で確認する範囲が、静的な `SKILL.md` review に留まるのか、eval workflow、Codex metadata、昇格先成果物まで含むのかが未確定である。
- `docs/backward-compatibility.md` は存在しないため、互換性維持対象を追加する必要がある場合は、実装前に対象、維持理由、終了条件を明記する必要がある。
- source skill と昇格先成果物の差分確認を、README 分類確認と同じ Bolt で扱うと、公開説明と配布物同期の責務が混ざる。

## リスク

- README に内部 skill を単純に全列挙すると、公開入口 skill を使うという現行案内が弱まり、利用者が内部 skill を直接入口として扱う可能性がある。
- README だけを更新すると、skill trigger description、eval、昇格先成果物、validator とのずれが残る可能性がある。
- 互換性維持対象がない状態で旧名や alias を追加すると、Amadeus の未リリース開発中プロジェクトとして現在の契約へ寄せる方針と矛盾する。
- source skill だけを確認し、昇格先成果物を確認しない場合、host environment で読まれる skill とレビューした内容がずれる。

## Inception への入力

- 要求は、README skill 分類、skill-forge 確認範囲、source skill と昇格先成果物の整合、互換性境界、検証と README 整合に分ける。
- User Story は、Agent が公開入口と内部 skill を取り違えず確認できる価値と、Maintainer が互換性と README 分類を判断できる価値に分ける。
- Use Case は、README と skill 一覧の棚卸し、skill-forge 確認範囲の定義、source と昇格先成果物の整合計画、互換性と検証のレビューに分ける。
- Unit は、README 分類の整合と、skill-forge 確認契約の2つに分ける。
- Bolt は、README role inventory、skill-forge review scope、source/promoted alignment、compatibility and validation closure に分ける。

## 証拠

- `README.md`
- `README.ja.md`
- `skills/amadeus-*`
- `.agents/skills/amadeus-*`
- `.agents/skills/skill-forge/SKILL.md`
- `.agents/rules/backward-compatibility.md`
- `package.json`
- commit `c18ede492c47440f5ce1d72cf7a5e873b1dbe33a`

## 鮮度

- analyzedAt: `2026-07-01T19:28:44Z`
- freshness: current

## 未確認事項

- README に内部 skill を一覧としてどこまで載せるかは Construction で実差分を確認して決める。
- `skill-forge` の eval workflow まで実行するか、静的 review と validator に留めるかは Construction で決める。
- Codex metadata の対象が存在しない場合に、metadata 生成をこの Intent に含めるかは Construction で決める。
