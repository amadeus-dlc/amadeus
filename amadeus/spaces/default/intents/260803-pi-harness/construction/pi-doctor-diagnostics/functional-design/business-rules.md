# pi-doctor-diagnostics — Business Rules

## Probe and aggregation rules

| Rule | Invariant | Failure |
|---|---|---|
| BR-PDD-001 | doctorはfilesystem/settings/workflow/auditを変更しない | testでbefore/after diff 0 |
| BR-PDD-002 | expected checks/resourcesは実行中doctor distribution version/digestへ束縛されたcompiled immutable catalogからsnapshotし、target manifestや固定defaultへfallbackしない | `pi.catalog` fail |
| BR-PDD-003 | checkはstable ID順に全件実行し、1件failureでshort-circuitしない | no-silent-drop |
| BR-PDD-004 | 1 probe exceptionは対応checkのredacted errorへ局所化し、report生成を継続する | unhealthy exit 1 |
| BR-PDD-005 | required checkが全passのときだけhealthy/exit 0。fail/unsupported/errorをsuccessへ変換しない | formal success 0 |
| BR-PDD-006 | repeated runは同一snapshotからtext/JSONを生成し、check orderとexitが決定的 | NFR-REL-001 |

## Runtime and compatibility rules

| Rule | Invariant | Trace |
|---|---|---|
| BR-PDD-010 | Pi versionはPATHで実際に解決したexact executableの`--version`だけからstrict parse | FR-DOC-003 |
| BR-PDD-011 | Pi `>=0.83.0`だけversion pass。0.82.x/malformed/nonzero/timeoutはfail | formal support |
| BR-PDD-012 | supported platformは`darwin | linux`。native Windowsはunsupported | NFR-CMP-001 |
| BR-PDD-013 | Bun executable/versionはPiとは独立checkで、catalog minimumを満たす | FR-DOC-001 |
| BR-PDD-014 | subprocessはneutral cwd、offline、credential env除外、closed stdin、2秒timeout、bounded output | NFR-SEC-002 |
| BR-PDD-015 | executable pathのdirectory名、package metadata、mise labelからruntime versionを推測しない | observation integrity |

## Trust rules

| Rule | Invariant | Failure |
|---|---|---|
| BR-PDD-020 | native `ctx.isProjectTrusted()` factがあるrunではそのfactを正本にする | `pi.project.trust` fail |
| BR-PDD-021 | direct CLIはcanonical projectのclosest saved ancestor decisionをglobal defaultより先に適用する | Pi 0.83 semantics |
| BR-PDD-022 | saved decisionなしでは`always`だけpass、`never | ask | absent`は非対話formal passにしない | actionable failure |
| BR-PDD-023 | direct CLIは未観測のrun-local `--approve`やextension trust decisionを推測しない | source明示 |
| BR-PDD-024 | trust/settings malformed/unreadableをuntrustedと同一視せずtyped errorにする | diagnosis locality |
| BR-PDD-025 | doctorはtrustをremember/approveせず、project resourceをtrust前にロード・実行しない | NFR-SEC-001 |

## Resource and driver rules

| Rule | Invariant | Trace |
|---|---|---|
| BR-PDD-030 | required resourceはcatalog pathのno-follow containment、kind、sha256、contract IDを全て満たす | FR-DOC-001 |
| BR-PDD-031 | skill、extension、package resource、driverは別checkで、1 resource欠落を他checkへ波及させない | negative matrix |
| BR-PDD-032 | setup/Pi Packageの各present routeを独立比較し、healthy routeでdrift routeを隠さない | FR-DST-003 |
| BR-PDD-033 | required pathのsymlink、target escape、duplicate/case alias、hash mismatchはfail | resource integrity |
| BR-PDD-034 | driver doctor probeはmodel/provider/child Piを起動せず、static contract + optional offline schema probeだけを使う | read-only |
| BR-PDD-035 | resourceをimport/executeして存在確認しない | supply-chain boundary |
| BR-PDD-036 | target install/package manifestはuntrusted observed artifactであり、expected required setを追加・削除できない | silent degrade 0 |
| BR-PDD-037 | trusted catalog取得/検証不能時は全resource/package/driver checkを`blocked-by(pi.catalog)`にしreport unhealthy | fail-closed |

## Harness isolation and blocked-mode rules

- BR-PDD-040: harness identity=`pi`のreportへCodex/Claude/Kimi固有checkを0件とする。
- BR-PDD-041: common harness-neutral checkを含める場合も、Pi必須条件とcheck ID namespaceを分離する。
- BR-PDD-042: read-only doctor registrationはworkflow mutation registration gate、extension health latch、engine state pointerに依存しない。
- BR-PDD-043: lifecycle/driver mandatory capability failure中もdoctorは全Pi checkを完走し、repairやcontinuationを起動しない。
- BR-PDD-044: untrusted projectからはdirect core/setup CLIを案内し、project-local extensionを明示ロードしてtrustを迂回するremediationを出さない。

## Security and presentation rules

- BR-PDD-050: reportはsecret値、prompt、全env、raw stdout/stderr、home絶対path、trust storeの他project entryを含めない。
- BR-PDD-051: observed pathはbasename、project-relative path、またはSHA-256 digestへ正規化する。
- BR-PDD-052: remediationはclosed IDとparameterだけをdomainに持ち、rendererが利用者向けcommand/proseへ変換する。
- BR-PDD-053: JSON/textは同じstructured resultから作り、label文字列をexit判定に使わない。
- BR-PDD-054: malformed output/errorの長さをboundし、ANSI/control characterを除去する。

## Closed results

`PiCheckStatus`は`pass | fail | unsupported | error | blocked-by | not-applicable`、report statusは`healthy | unhealthy`のclosed unionである。`blocked-by`はdependency check IDを持ちprimary failureを重複表示しないが、required dependencyが非passのためreportはunhealthyである。

主要failure codeは`catalog-invalid | executable-missing | executable-unusable | version-unsupported | version-malformed | probe-timeout | platform-unsupported | bun-missing | bun-version-unsupported | trust-untrusted | trust-unresolved | trust-store-invalid | resource-missing | resource-kind-invalid | resource-hash-mismatch | resource-path-unsafe | package-manifest-invalid | driver-contract-invalid | driver-probe-invalid | output-redaction-failed`のclosed unionである。

## Verification rules

- Check matrix: healthyを基準にPi/Bun/version/platform/trust/skill/extension/package/driverを1要素ずつ壊し、対応primary checkだけfail、全check count/order不変。
- Version property: SemVer境界`0.82.x`, `0.83.0`, `0.83.x`, prerelease、malformed、複数行、timeout、nonzero。
- Trust property: exact/parent/closest ancestor、yes/no、default always/ask/never、native fact override、malformed storeをPi優先順位どおり評価。
- Resource property: missing/extra/hash/kind/symlink/traversal/case alias、setup/package route、resourceとtarget manifest entryの同時削除、catalog missing/version/digest mismatchの組合せ。
- Blocked-mode property: registration/health/state/auditをfailure fixtureにしてもdoctor全check完走、workflow/state/audit/filesystem mutation 0。
- Harness isolation: Pi-only fixtureのcheck ID集合に`codex | claude | kimi` namespace 0。
- Redaction property: token、prompt、HOME、trust entries、ANSIを各port outputへ埋め込みreport漏洩0。
- Determinism property:同じsnapshotを100回shuffle入力してstable ID order、normalized JSON、exit一致。

## 上流トレーサビリティ

`unit-of-work`のpositive/negative matrix、`unit-of-work-story-map`のSCN-007〜009、`requirements`のFR-DOC-001〜003、`components`のPi overlay/core dispatch、`component-methods`のcheck ID/observed/expected/remediation、`services`のmutationなしdoctorをbusiness invariantへ変換した。
