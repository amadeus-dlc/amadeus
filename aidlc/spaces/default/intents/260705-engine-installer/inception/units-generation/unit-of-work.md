# Unit of Work — Engine Installer（260705-engine-installer）

上流入力: [components.md](../application-design/components.md)、[component-methods.md](../application-design/component-methods.md)、[services.md](../application-design/services.md)、[decisions.md](../application-design/decisions.md)、[requirements.md](../requirements-analysis/requirements.md)、[stories.md](../user-stories/stories.md)

## Unit の定義

本 Intent は単一 Unit とする。

| Unit | 内容 | 対応コンポーネント |
|---|---|---|
| u001-engine-installer | インストーラ本体（manifest、cli、copyEngine、placeAmadeusMd、copySkills、relinkClaude、mergeSettings、smoke）+ 専用 eval + README 追記 + package.json scripts | components.md の全コンポーネント（契約は component-methods.md、外部依存なしは services.md） |

## 単一 Unit の根拠

- 成果物は単一ファイルのインストーラとその検証であり、コンポーネント間の契約はすべてファイル内関数の呼び出しである（AD-1 = decisions.md。分割すると契約が人工的になる）。
- scope-definition の D7（単一 PR。インストーラ + eval + README は受け入れ条件の検証上不可分）と一致する。
- requirements.md の FR-1〜FR-4 / NFR-1〜5 はすべてこの Unit のコンポーネント群に帰属し、Unit 境界の外に漏れる要求はない。
- Unit 名は engine の slug 正規化（小文字）に合わせ `u001-engine-installer` とする（project.md の命名規約）。
