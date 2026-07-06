# Unit of Work — 260706-installer-versioning（Issue #543）

上流入力: [components.md](../application-design/components.md)、[component-methods.md](../application-design/component-methods.md)、[component-dependency.md](../application-design/component-dependency.md)、[decisions.md](../application-design/decisions.md)、[requirements.md](../requirements-analysis/requirements.md)

## Unit 一覧（単一 Unit）

| Unit | 内容 | 対応 FR / コンポーネント |
|---|---|---|
| u001-installer-versioning | インストーラのバージョン管理 + カスタマイズ検出の全機能。scripts/amadeus-install.ts（コンポーネント 9 個 + copyEngine / copySkills の書き換え）、installer eval の拡張（FR-5.1 (a)〜(h)）、README 英日 | FR-1〜6 / 全コンポーネント |

## 単一 Unit の根拠

- 変更対象は単一スクリプト + その eval + README で、コンポーネント間の依存が密（TrackedWriter を軸に全機能が結線）。分割すると「動く縦切り」にならない。
- 実装順序の分割は Unit ではなく Bolt（delivery-planning）で行う。
