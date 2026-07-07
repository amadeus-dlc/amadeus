# Scalability Design — U5 Apply Verify And UX

> Stage: construction / nfr-design  
> Unit: U5 Apply Verify And UX

## Scaling Model

U5はsingle-target、single-harness、single invocation の逐次applyとして設計する。`scalability-requirements.md` のfirst-release targetは、2,000 operations、2,000 manifest entries、500 backups、50 MiB copied bytes、2,000 reporter rowsである。

## Capacity Boundaries

| Dimension | Design |
|---|---|
| operations per plan | plan orderを保持してlinear execution/renderingする。 |
| manifest entries | atomic writeとverificationを2,000 entriesまで測る。 |
| backups | backup recordsを500件まで保持し、dependent copy前に完了させる。 |
| copied bytes | Bun filesystem primitivesでcopyし、application-level full-content string bufferingを避ける。 |
| reporter rows | stable tableをlinearに生成し、large snapshotsは避ける。 |
| prompts | harness、target、apply confirmation の最大3箇所だけを許可モードで呼ぶ。 |

## Concurrency Decision

初期実装ではfile applyをparallelizeしない。理由は、backup-before-copy ordering、failed operation evidence、partial apply diagnostics をdeterministicに保つためである。将来parallel copyを入れる場合は、dependency graph、ordered evidence、manifest sequencingの再設計が必要である。

## State Strategy

U5で保持する状態は1invocation内に閉じる。

- rendered pre-apply plan;
- prompt decision;
- completed operation records;
- backup records;
- failed operation/phase diagnostics;
- manifest write result;
- verification result;
- final reporter input.

process-wide cache、global lock、daemon stateは持たない。concurrent writes to same target が必要になった場合は、locking strategy と manifest concurrency ADRが必要である。

## Growth Guardrails

- multiple harnesses in one invocation はU5では扱わない。
- target concurrencyは初期実装の範囲外。
- plan > 2,000 operations はbenchmark再調整後にsupportを広げる。
- copy volume > 50 MiB はstreaming/copy primitive reviewを必須にする。
- reporter summarizationを導入する場合も、file-level traceabilityをstructured dataか詳細出力で維持する。

## Upstream Coverage

- `performance-requirements.md`: render/apply/manifest/verification budgets をcapacity boundaryにした。
- `security-requirements.md`: scaling時も plan order、backup durability、no-write block を維持する。
- `scalability-requirements.md`: first-release targets、scaling constraints、growth triggers、test data strategy を直接反映した。
- `reliability-requirements.md`: deterministic diagnostics、manifest sequencing、verification checks をscaling modelに含めた。
- `tech-stack-decisions.md`: Bun filesystem primitives、temp fixtures、no parallel copy by default に従う。
- `business-logic-model.md`: single invocation apply、manifest、verification、reporter workflows を拡張境界にした。
