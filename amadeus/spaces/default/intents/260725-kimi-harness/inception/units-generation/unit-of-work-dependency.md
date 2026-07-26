上流入力(consumes 全数): components, component-methods, services, component-dependency, decisions, requirements

# Unit of Work Dependency — 260725-kimi-harness

component-dependency.md の依存マトリクスと decisions.md の ADR をトポロジへ展開(requirements.md の FR 対応は unit-of-work.md)。components.md の所有境界表(C1-C6 の置き場所と変更種別)を Unit の物理配置の根拠とし、component-methods.md のインターフェース定義を integration points の具体とする。services.md の「常駐サービスなし・実行単位は無状態」判定により、Unit 間の共有状態は導入しない。**本ファイルはトポロジのみを記述し、経済的な順序付け(何を先に出荷するか)は 2.8 Delivery Planning の領域**。

## 直接依存(プローズ DAG)

- `kimi-harness-definition` — 独立。全 Unit の土台(harness ツリーと snippet 正本を供給)
- `kimi-hook-adapter` → `kimi-harness-definition`(adapter は harness ツリー上に載る)
- `setup-hooks-merge` → `kimi-harness-definition`(managed block の正本 snippet を消費)
- `core-harness-enums` → `kimi-hook-adapter`, `setup-hooks-merge`(doctor arm が adapter 実在と managed block 有無を検査するため、両成果物の形が確定している必要がある)
- `distribution-enumeration` → `kimi-harness-definition`, `core-harness-enums`(promote-self は dist/kimi の実在を、dogfood 検証は doctor arm を前提とする)
- `kimi-live-journey` → `distribution-enumeration`(セルフインストール済みの環境で journey を駆動する)
- `kimi-harness-docs` → `distribution-enumeration`, `kimi-live-journey`(実機検証・実走の事実に基づく手順書とするため)

## Integration points

- snippet 正本(U1 → U3/U4): managed block の単一ソース(ADR-4)
- adapter 実在(U2 → U4): doctor の検査対象
- dist/kimi(U1 → U5): promote-self・t145・smoke の対象
- セルフインストール(U5 → U6/U7): dogfood 環境

## 並列開発の機会

- `kimi-hook-adapter` ∥ `setup-hooks-merge`(U1 完了後に並列化可能)
- `kimi-live-journey` と `kimi-harness-docs` は直列(U7 は U6 の実走結果を必要とする)

## Machine-readable direct edges

```yaml
units:
  - name: kimi-harness-definition
    depends_on: []
  - name: kimi-hook-adapter
    depends_on: [kimi-harness-definition]
  - name: setup-hooks-merge
    depends_on: [kimi-harness-definition]
  - name: core-harness-enums
    depends_on: [kimi-hook-adapter, setup-hooks-merge]
  - name: distribution-enumeration
    depends_on: [kimi-harness-definition, core-harness-enums]
  - name: kimi-live-journey
    depends_on: [distribution-enumeration]
  - name: kimi-harness-docs
    depends_on: [distribution-enumeration, kimi-live-journey]
```
