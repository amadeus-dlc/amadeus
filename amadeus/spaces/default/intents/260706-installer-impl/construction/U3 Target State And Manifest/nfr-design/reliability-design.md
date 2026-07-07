# Reliability Design — U3 Target State And Manifest

> Stage: construction / nfr-design  
> Unit: U3 Target State And Manifest

## Reliability Objectives

U3はdeterministic classificationとstable snapshotを提供する。`reliability-requirements.md` の全target stateを同じ入力から常に同じ結果にし、U4 Operation Planning And Safety が危険な推測をしないようにunknownを明示する。

## Classification Design

`StateClassifier` は `TargetDetector` 内の論理コンポーネントとして、次の状態だけを返す。

| State | Trigger | Reliability behavior |
|---|---|---|
| `manifest-installed` | valid manifest | manifest harness/version/files を downstream に渡す。 |
| `manual-or-unknown` | no manifest and all selected sentinels present | conservative planning inputにする。 |
| `partial` | some selected sentinels present | no-write planning inputにする。 |
| `none` | no selected sentinels present | install guidance inputにする。 |
| `unsupported-layout` | recognized old/unhandled layout | no-write with reason。 |
| `ambiguous-harness` | multiple candidates without prompt resolution | no-write with candidates。 |

valid manifest wins over sentinel inference. invalid/unreadable manifest は `manifest-installed` ではなく、diagnosticsに残したうえでsentinel fallbackへ進む。

## Failure Handling

| Failure | Handling |
|---|---|
| manifest file missing | sentinel fallback |
| manifest unreadable | diagnostic + sentinel fallback |
| manifest invalid schema | diagnostic + sentinel fallback |
| requested harness mismatch | validation error + no-write |
| sentinel read error | missing/unknown signalとして扱い、unsafe positive matchにしない |
| expected file unreadable | `exists:true` and omit `md5` |
| prompt unavailable | `ambiguous-harness` |

U3はrollbackを持たない。書かないためrollback対象がない。

## Snapshot Reliability

`TargetSnapshotBuilder` は expected files のすべてに対して row を返す。存在しないfileは `exists:false`、存在して読めるfileは `exists:true` と `md5`、存在するが読めないfileは `exists:true` かつ `md5` omitted とする。

snapshot はoverwrite、backup、conflict、force policyを決めない。unknown md5 はU4で unknown として扱われる。

## Diagnostics

classification result は最小限のreason codeを持つ。

- `manifest-valid`;
- `manifest-invalid-fallback`;
- `manifest-unreadable-fallback`;
- `requested-harness-mismatch`;
- `sentinels-complete`;
- `sentinels-partial`;
- `sentinels-none`;
- `unsupported-layout`;
- `ambiguous-harness`;
- `snapshot-md5-unreadable`.

diagnostics は user-facing message の素材だが、U3自身はinteractive UXを決めない。`PromptPort` を使う ambiguity resolution のみ detection flow 内で扱う。

## Test Strategy

U6で次をfixture化する。

- valid manifest and omitted requested harness;
- valid manifest and mismatched requested harness;
- invalid manifest fallback;
- complete/partial/none sentinel sets;
- unsupported old layout;
- non-interactive `kiro` / `kiro-ide` ambiguity;
- interactive prompt resolution;
- unreadable md5 snapshot;
- no-write assertions for detection and snapshot.

## Upstream Coverage

- `performance-requirements.md`: failure handlingはbounded readを維持し、fallback時もfull scanしない。
- `security-requirements.md`: invalid manifest not trusted、ambiguous no-write、content leakage禁止を維持する。
- `scalability-requirements.md`: concurrent readsはshared mutable stateなしで扱う。
- `reliability-requirements.md`: target states、fallback、no-write、portability diagnostics を直接設計した。
- `tech-stack-decisions.md`: `readManifest(): InstallerManifest | null`、ports、binary md5、unknown handling に従う。
- `business-logic-model.md`: detection workflow、snapshot workflow、manifest write contract を分類とfailure handlingに反映した。
