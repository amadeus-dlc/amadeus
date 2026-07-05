# Business Rules — u001-registry-issues-field

上流入力: [unit-of-work.md](../../../inception/units-generation/unit-of-work.md)、[unit-of-work-story-map.md](../../../inception/units-generation/unit-of-work-story-map.md)、[requirements.md](../../../inception/requirements-analysis/requirements.md)、[components.md](../../../inception/application-design/components.md)、[component-methods.md](../../../inception/application-design/component-methods.md)、[services.md](../../../inception/application-design/services.md)

## ルール

| ID | ルール | 出典 |
|---|---|---|
| BR-1 | `issues` は任意フィールドであり、無い entry は空として扱う | FR-1.1 |
| BR-2 | `issues` の値は GitHub Issue 番号（正の整数）の配列とする。重複を持たない | FR-1.1 |
| BR-3 | 番号は amadeus-dlc/amadeus リポジトリの Issue を指す（他 repo 参照はスコープ外。必要になったら本格版で扱う） | scope-document.md Out-of-scope（他 repo 掲載なし） |
| BR-4 | 遡及補完で判別できない entry には `issues` を書かない。推測で番号を作らない | FR-1.3、.agents/rules（推測で依存を作らない） |
| BR-5 | 既存の読み手の挙動を変えない（フィールド追加のみ。既存フィールドの変更・削除をしない） | FR-1.2 |
| BR-6 | 台帳変更は Maintainer 承認済みの範囲（`issues` 追加）に限る | C10（承認済み: decision-log D11） |

BR-2 / BR-3 の充足は自動検証せず、遡及補完（ワンショットの直接編集、D-AD10）を行う実装者のレビューと Bolt PR レビューで担保する（軽量方針 C07）。自動検証の対象は BR-1 / BR-5 の互換性（issues 有無混在の読み取り）である。
