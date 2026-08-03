# Unit of Work Dependency — no-silent-drop

## 上流入力と読み方

本 topology は `components.md`、`component-methods.md`、`services.md`、`component-dependency.md`、`decisions.md`、`requirements.md` と、承認済み `units-generation-questions.md` を入力とする。矢印の文章表現は「A depends on B」、YAML の `depends_on` は直接依存だけを表す。User Stories stage は SKIP のため optional `stories.md` は存在しない。

本成果物は依存関係の geometry だけを示す。推奨実装順序、critical path、value-first／risk-first／walking-skeleton-first の選択は行わず、Delivery Planning に委ねる。

## 正準 dependency DAG

```yaml
units:
  - name: static-gate-engine
    depends_on: []
  - name: text-mutation-loud-failure
    depends_on: []
  - name: mirror-persistence-propagation
    depends_on: []
  - name: repository-adoption
    depends_on: [static-gate-engine, text-mutation-loud-failure, mirror-persistence-propagation]
```

直接 edge は次の3件だけである。

- `repository-adoption` depends on `static-gate-engine`: corpus evidence、ledger、CI は gate CLI／schema を必要とする。
- `repository-adoption` depends on `text-mutation-loud-failure`: committed `B0` は #1874 修正後の `C_post` を必要とする。
- `repository-adoption` depends on `mirror-persistence-propagation`: committed `B0` と failure evidence は #1878 修正後の形を必要とする。

`static-gate-engine`、`text-mutation-loud-failure`、`mirror-persistence-propagation` 間には source import、shared mutable state、completion dependency がない。U4 が U1 CLI に classification／approval／base SHA を入力することは、U1 の schema と実装が先に成立した後のデータ受渡しであり、source import や completion dependency の逆 edge ではないため cycle は存在しない。

## Integration points

| Producer | Consumer | Contract | 受渡し内容 | Failure boundary |
|---|---|---|---|---|
| static-gate-engine | repository-adoption | `GateResult` v1 | pass／violations(non-empty)／error、ScanSummary、exit 0／1／2 | unknown schema／tool／scan／semantic failure は Error |
| static-gate-engine | repository-adoption | raw census schema v1（schema owner: U1） | `C_pre-raw`／`C_post-raw` と source／config／rule digest | identity 非全単射、欠落、digest mismatch は拒否 |
| repository-adoption／人間 | static-gate-engine | classification ledger schema v1（schema owner: U1） | raw identity ごとの分類、根拠、classifier identity | raw 集合との過不足、未知分類、digest mismatch は拒否 |
| repository-adoption／人間 | static-gate-engine | approval receipt schema v1（schema owner: U1） | classification digest、approver identity、承認時刻 | classification digest 不一致、未承認、receipt 再利用は拒否 |
| static-gate-engine | repository-adoption | approved evidence schema v1（schema owner: U1） | 検証済み `C_pre-approved`／`C_post-approved` と全 digest | input chain 不一致、出力先既存、digest mismatch は拒否 |
| static-gate-engine | repository-adoption | candidate baseline＋bootstrap provenance schema v1（schema owner: U1） | candidate `B0`、initial exemption、pre／post 集合差分、provenance | 非単調集合、追加identity、承認鎖不一致、digest mismatch は拒否 |
| text-mutation-loud-failure | repository-adoption | existing runtime＋`TextMutationResult` | #1874 修正後 source、not-found regression、bytes invariance | not-found は write／audit 前に typed failure |
| mirror-persistence-propagation | repository-adoption | existing `MirrorOperationOutcome.warning` | `classification=state-write`、effect=`not-started` または `outcome-unknown`、outbox convergence | pre-commit／durability unknown を文字列解析せず区別 |
| repository-adoption | static-gate-engine | base revision input＋ledger schema（schema owner: U1） | CI が確定した PR base／push-before SHA と current canonical ledger 値 | SHA 欠落、base object／trusted previous ledger 欠落・不正は U1 が fail-closed |
| repository-adoption | existing CI／distribution | process exit＋canonical source | lint blocking step、package／promotion projection | warning化／continue-on-error／generated手編集禁止 |

Unit 間 contract は versioned data または既存 discriminated union だけであり、内部 function、stderr 文言、filesystem traversal の実装詳細を共有しない。

## Shared resources と edit ownership

| Resource | Owner Unit | Other Unit access | Coordination rule |
|---|---|---|---|
| `tests/no-silent-drop/` source／rules／fixtures | static-gate-engine | repository-adoption reads CLI/schema | U4 は detector algorithm を編集しない |
| `package.json`／`bun.lock`／root `no-silent-drop` script | static-gate-engine | repository-adoption invokes the root script from CI | 最終 writer は U1。U4 は `package.json` を編集しない |
| canonical text mutation files | text-mutation-loud-failure | repository-adoption scans／packages | U1／U3 は編集しない |
| canonical mirror executor／store | mirror-persistence-propagation | repository-adoption scans／packages | U1／U2 は編集しない |
| baseline／exemption／classification／approval の正本値 | repository-adoption | static gate reads through U1-owned public schema | 値の正本 writer は U4、schema と検証 algorithm は U1 |
| `.github/workflows/ci.yml`、generated projections | repository-adoption | 他 Unit は編集しない | canonical fixes 成立後に一括統合 |

## Parallel development opportunities

最大の相互非依存集合は次である。

```text
{ static-gate-engine, text-mutation-loud-failure, mirror-persistence-propagation }
```

この3 Unit の任意の部分集合も dependency 上は並行可能である。parallel は許容される topology であって、ここでは実行方式や着手順序を推奨しない。`repository-adoption` は3 Unit の public acceptance と修正後 source がすべて必要なため、この集合には入らない。

## Acyclicity と完全性の検証

- declared unit: 4件、各 name は1回だけ。
- direct edge: 3件、すべて declared target を参照。
- self dependency: 0件。
- cycle: 0件。唯一の dependent node は `repository-adoption` であり、そこから outgoing dependency edge の逆流はない。
- orphan unit: 0件。独立3 Unit は U4 に統合され、U4 は corpus／CI／distribution acceptance を持つ。
- `unit-of-work.md` の Unit 名と YAML name は完全一致する。

## Requirement dependency rationale

- FR-01〜09 の detector、`GitReadPort`、trusted previous ledger、ratchet、`check --base-revision` contract は `static-gate-engine` 内で閉じ、runtime fixes に依存しない。
- FR-11／SC-06 は `text-mutation-loud-failure` 内で閉じる。
- FR-10／SC-05 は `mirror-persistence-propagation` 内で閉じる。
- FR-07／08／13〜15 の修正前後集合、canonical ledger 値、base SHA 供給、CI／distribution は3者の成果を必要とするため `repository-adoption` に集約する。trusted previous ledger の読込みと ratchet 判定自体は U1 が所有する。
- NFR-01 の15秒と NFR-02 のFP率は corpus integration であるため U4 が最終合否を所有し、U1 は fixture／CLI 内部性能の前提を提供する。
