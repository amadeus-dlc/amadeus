# Domain Entities — routing-and-autonomy-guards

> 上流入力(consumes 全数): `unit-of-work.md`、`unit-of-work-story-map.md`、`requirements.md`、`components.md`、`component-methods.md`、`services.md`。
>
> 設計裁定: E-USSU04FD1 A（Stop hook best-effort stale削除 + doctor read-only、3–0）とE-USSU04FD2 A（upstream同型優先、autonomous時janitor N/A、3–0）。

## Domain boundary

U04にdatabase entityや長寿命aggregateはない。既存workflow stateとworkspace markerをsnapshotとして読み、判別可能なvalue/resultへ変換するinvocation-local domainである。型はclass-free discriminated unionとし、filesystem handleやprocess globalを保持しない。

## Help routing model

```ts
type HelpRouting =
  | { kind: "help"; source: "bare" | "read-only-flag" | "workspace-verb" }
  | { kind: "workspace-command"; verb: "intent" | "space" | "space-create"; arg?: string }
  | { kind: "freeform"; words: readonly string[] };

type RecordKind = "intent" | "space";

type RecordNameVerdict =
  | { kind: "allowed"; slug: string }
  | { kind: "reserved"; recordKind: RecordKind; slug: "help"; remediation: string };
```

`HelpRouting`はroutingだけを表し、recordを作成/切替しない。`RecordNameVerdict`は作成choke pointで使用し、拒否時のfilesystem/cursor mutationを持たない。reserved setは`help`を単一所有し、`-h`のcreate形はslugify前のraw-input guardで扱う。

## Compose marker model

```ts
type MarkerObservation =
  | { kind: "absent"; path: string }
  | { kind: "present"; path: string; mtimeMs: number }
  | { kind: "unreadable"; path: string; reason: string };

type MarkerFreshness =
  | { kind: "absent"; path: string }
  | { kind: "fresh"; path: string; ageMs: number; ttlMs: number }
  | { kind: "stale"; path: string; ageMs: number; ttlMs: number }
  | { kind: "unreadable"; path: string; reason: string };

type ComposeStopDecision =
  | { kind: "allow-stop"; reason: "fresh-compose-marker" }
  | { kind: "continue-enforcement"; reason: "autonomous" | "absent" | "stale" | "unreadable" };

type MarkerJanitorOutcome =
  | { kind: "not-applicable" }
  | { kind: "deleted"; path: string }
  | { kind: "delete-failed"; path: string; reason: string };
```

### Relationships

- autonomy snapshotが`autonomous`なら`MarkerObservation`を生成せず、`ComposeStopDecision.continue-enforcement`と`MarkerJanitorOutcome.not-applicable`を返す。markerは未読・保持となる。
- non-autonomous時だけ`MarkerObservation` 1件から`inspectComposeMarker(observation, nowMs, ttlMs)`が`MarkerFreshness` 1件を返す。
- non-autonomousの`MarkerFreshness`から`ComposeStopDecision`を返す。
- `MarkerJanitorOutcome.deleted/delete-failed`はnon-autonomousの`stale`時だけ派生するが、`ComposeStopDecision`を入力にも出力にも持たない。これによりunlink失敗がblock判断を反転できない。
- doctorは`MarkerFreshness`をdiagnostic rowへ投影するだけで`MarkerJanitorOutcome`を生成しない。

### Lifecycle

```text
absent ── compose gate opens ──> fresh
fresh ── gate resolves ────────> absent
fresh ── TTL超過 ──────────────> stale
stale ── Stop janitor成功 ─────> absent
stale ── unlink失敗 ───────────> stale
```

fresh markerは通常のlive gate状態でありerror entityではない。stale markerはorphan候補で、Stop hookではenforcement継続、doctorではFAIL診断となる。

## Recompose guard model

```ts
type ConstructionAutonomy = "autonomous" | "gated" | "unset";

type RecomposeGuardResult =
  | { kind: "allowed"; autonomy: "gated" | "unset" }
  | {
      kind: "denied";
      autonomy: "autonomous";
      reason: "human-gate-required";
      remediation: "switch-to-gated-or-wait-for-swarm";
    };

type RecomposeMutationSnapshot = {
  stateBytes: string;
  planSuffixes: ReadonlyMap<string, "EXECUTE" | "SKIP">;
  runtimeGraphDigest: string;
  auditLength: number;
};
```

`RecomposeGuardResult.denied`にはmutation commandを含めない。adapterはdeny時に`RecomposeMutationSnapshot`の4要素が不変であることを保証し、allow時だけ既存validationとtransactionへ進む。

## Diagnostic projections

```ts
type DoctorRow = {
  pass: boolean;
  label: string;
  fix?: string;
};

type JanitorDiagnostic = {
  markerState: "stale";
  cleanup: "deleted" | "delete-failed";
  enforcement: "continued";
};
```

doctorの`DoctorRow`とStop hookの`JanitorDiagnostic`は別entityである。doctorはread-only、janitorはbest-effort side effectという責務差を型とtest fixtureで保持する。path、age、reasonにはsecretやfile contentを含めず、workspace-relative marker名と非機密error分類だけを表示する。

## Validation and compatibility

- negative/NaN mtimeは`unreadable`、未来mtimeはage 0として扱う。
- TTLは正の有限整数でなければprogrammer errorとしてtestで拒否し、runtime fallback値を捏造しない。
- autonomyの未知文字列は既存互換の`unset`へsilent変換せず、state parserの既存契約に従う。U04は新しいstate fieldを追加しない。
- public unionは既存CLIのstdout JSON schemaを不要に変更しない。内部型をそのまま外部serializeせず、既存formatterが必要な行だけを投影する。
- U04はfrontendを含まないため`frontend-components.md`を生成しない。
