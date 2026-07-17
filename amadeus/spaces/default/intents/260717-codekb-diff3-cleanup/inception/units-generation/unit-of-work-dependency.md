# Unit of Work Dependency — codekb diff3 cleanup(Issue #1129)

上流入力(consumes全数): `components.md`、`component-methods.md`、`services.md`、`component-dependency.md`、`decisions.md`、`requirements.md`。

## Dependency DAG

Unitは `U001-codekb-hygiene-verification-handoff` の1件で、他Unitへの直接依存を持たない。`component-dependency.md` のD1〜D8はU001内の証拠フローであり、別Unitとして分割しない。循環依存は0件。

```yaml
units:
  - name: U001-codekb-hygiene-verification-handoff
    depends_on: []
```

テキスト代替: U001は他のUnitに依存せず、他のUnitからも依存されない単一ノードである。

## Integration Points

Unit間のAPI、shared data、event、network communicationは0件。`components.md` / `component-methods.md` / `services.md` が定めたとおり、U001内でgit SHA、marker / H2件数、CI verdict、起票者以外の独立した2名のreview、sensor / gate証拠をversion-controlled recordに収束させる。`decisions.md` ADR-001に従い、新規runtime integrationを作らない。

## Parallel Development Opportunities

単一UnitのためUnit間parallel setはない。marker、H2、ancestryの計測はU001内で独立した証拠だが、これを別Unitに分割すると同じCodeKB境界とhandoffを複数Unitで共有し、独立deploy / close価値のない調整コストを生む。

## Deferred Sequencing Decisions

本成果物はtopologyのみを定義する。sequencing、critical path、exit conditionsを選ばず、Delivery Planning 2.8へdeferする。2.8は `requirements.md` のhuman-owned landing / Issue close境界と `team-practices.md` から、単一Unitの経済的経路とexternal handoffを計画化する。
