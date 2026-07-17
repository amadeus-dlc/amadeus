# Component Dependency — codekb diff3 cleanup(Issue #1129)

上流入力(consumes全数): `requirements.md`、`architecture.md`、`component-inventory.md`、`team-practices.md`。

## Dependency Model

新規runtime componentはない。以下は `requirements.md` の証拠とhandoffの先行関係を表すDAGであり、`architecture.md` / `component-inventory.md` のsoftware dependency graphを変更しない。

| ID | Node | Depends on | Communication / data |
|---|---|---|---|
| D1 | Measurement ref resolution | — | git ref → full SHA |
| D2 | Marker vocabulary scan | D1 | SHA、2 paths、4語彙 → per-path counts |
| D3 | Latest/history H2 scan | D1 | SHA、2 paths → latest/history counts |
| D4 | Fix ancestry check | D1 | SHA + fix SHA → ancestor / non-ancestor |
| D5 | Lifecycle evidence | D2, D3, D4 | artifacts、CI verdict、review、sensors、§13、gate、push SHA |
| D6 | Human landing decision | D5 | CI greenを含むgate-ready evidence → landed refまたはpending |
| D7 | Landed-main remeasurement | D6 | landed main ref → D2/D3同等の再計測 |
| D8 | Issue close eligibility | D7 | green evidence → eligible、それ以外はstop |

## Dependency Matrix

`1` は行ノードが列ノードに依存することを示す。

| From \ To | D1 | D2 | D3 | D4 | D5 | D6 | D7 | D8 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| D1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| D2 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| D3 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| D4 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| D5 | 0 | 1 | 1 | 1 | 0 | 0 | 0 | 0 |
| D6 | 0 | 0 | 0 | 0 | 1 | 0 | 0 | 0 |
| D7 | 0 | 0 | 0 | 0 | 0 | 1 | 0 | 0 |
| D8 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |

循環依存は0件。D2 / D3 / D4は同じD1を読むが相互に依存しないため、content、structure、lineageの証拠を独立に保つ。

## Data Flow and Shared Resources

1. D1で測定対象を不変のSHAに固定する。
2. D2、D3、D4を独立に実行し、いずれかを他のproxyにしない。
3. D5は結果とCI verdictをversion-controlled intent recordに収束させる。CI verdictがmissing / non-greenならD6へ進まない。
4. D6以降は `team-practices.md` のhuman ownershipに渡し、AI conductorは外部操作を実行しない。
5. D7はD1で使ったbranch SHAではなくlanded main SHAを新たに解決する。

shared resourceはgit repositoryとversion-controlled recordのみ。database、cache、queue、AWS resource、UI stateは追加しない。

## Failure Containment

D2 / D3の不一致はD5でstopとし、D6へ流さない。D6がpendingならD7 / D8は未実施のままとし、完了を装わない。D7が不成功ならD8は常にstopとし、Issue #1129をOPENに保つ。
