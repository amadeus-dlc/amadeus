# Unit of Work — Election CLI 多問対応

## 入力と分解方針

本分解は [components](../application-design/components.md)、[component-methods](../application-design/component-methods.md)、[services](../application-design/services.md)、[component-dependency](../application-design/component-dependency.md)、[decisions](../application-design/decisions.md)、[requirements](../requirements-analysis/requirements.md) を根拠とする。unit は domain ownership と independently testable contract で区切る。経済的な Bolt 順序、value/risk priority、critical path は本書では決めない。

## U1: election-canonical-schema

- **Kind:** `library`
- **Deployment:** embedded
- **Complexity:** L
- **Owns:** `ElectionV2`、`QuestionId`、`Question`、`Response`、`BallotV2`、`QuestionResult`、versioned decoder/encoder、canonical ordering/digest。
- **Boundary:** `unknown` から canonical 型への fail-closed parse。legacy scalar を `legacy-question` へ正規化し、新規 write shape を v2 に限定する。
- **Delivers:** round-trip property、invalid input reject property、legacy/new canonical equivalence。
- **Constraints:** filesystem/CLI/record prose に依存しない。正本は core tools、generated surface は直接編集しない。

## U2: election-question-tally

- **Kind:** `library`
- **Deployment:** embedded
- **Complexity:** L
- **Owns:** voter × question resolution、question-level early/late classification、GoA/reservation isolation、per-question tally、mixed lifecycle、established digest preservation。
- **Boundary:** U1 の canonical 型を入力に pure/deterministic result を返す。
- **Delivers:** mixed established/hold、held-only target validation、preserved result invariant、linear/linearithmic processing tests。
- **Constraints:** store read/write と command transition を含めない。

## U3: election-v2-store

- **Kind:** `library`
- **Deployment:** embedded
- **Complexity:** L
- **Owns:** dual-read store、canonical v2 write、pending blind lane、ledger、immutable tally runs、current snapshot、registry/timeline、run repair。
- **Boundary:** U1 decoder 以外の raw cast を read boundary に残さない。
- **Delivers:** atomic/create-only persistence、same-run repair、different-content conflict、legacy read-only behavior、blind materialization tests。
- **Constraints:** single writer、append-only、read-only verb 無変更、DB/daemon 不追加。

## U4: election-record-transport

- **Kind:** `library`
- **Deployment:** embedded
- **Complexity:** M
- **Owns:** question-aware record render/verify、voter view delivery port、delivery provenance。
- **Boundary:** record は U1/U2 canonical values を受け、transport は view path だけを配送して question business rule を解釈しない。
- **Delivers:** deterministic question sections、reservation attribution、history/current self-verification、multi-question blind view delivery。
- **Constraints:** store mutationとstate transitionを所有しない。

## U5: election-mixed-lifecycle-cli

- **Kind:** `service`
- **Deployment:** standalone Bun CLI
- **Complexity:** XL
- **Owns:** 9 verb orchestration、partial lifecycle、targetQuestionIds、held[]、preservedResultDigest、report transition、machine-readable output。
- **Boundary:** U1〜U4 を同期 call し、domain rule と storage format を command branch に再実装しない。
- **Delivers:** initial loop、mixed result loop、hold-only rerun、established amend拒否、typed status/tally/verify、repair-safe report。
- **Constraints:** CLI file の条件分岐増殖を避け、pure policy は U1/U2、persistence は U3 に置く。

## U6: election-legacy-migration

- **Kind:** `service`
- **Deployment:** standalone Bun script
- **Complexity:** M
- **Owns:** directory/registry migration plan、explicit approval、移動前後 canonical digest fidelity。
- **Boundary:** U1/U3/U5 の public contract を使い、schema の destructive bulk rewrite はしない。
- **Delivers:** legacy/new corpus migration tests、`legacy-question` digest 一致、read-only dry-run。
- **Constraints:** Git/filesystem 操作は明示対象だけに限定する。

## U7: formal-election-multiq

- **Kind:** `spec`
- **Deployment:** in-place formal contract
- **Complexity:** L
- **Owns:** FormalElection TLA+/CFG、question identity、voter × question acceptance、mixed state、established invariance、held-only transition、model-map identities。
- **Boundary:** U1/U2/U5 の observable contract を finite model に抽象化する。
- **Delivers:** TLC `NOT_DETECTED` receipt、model completeness、source/implementation identity 更新。
- **Constraints:** tractable finite constants、spec と model-map を分離更新しない。

## U8: election-distribution-and-verification

- **Kind:** `packaging`
- **Deployment:** shared build/test projection
- **Complexity:** XL
- **Owns:** canonical `amadeus-election` skill、対象 harness projection、integration/e2e/PBT/performance suite、build reproducibility、norm update/distillation scan、FR trace evidence。
- **Boundary:** U1〜U7 の完成契約を組み合わせ、generated `dist/` / self-install surface は build でのみ生成する。
- **Delivers:** full quality command evidence、single-question regression benchmark、multi/mixed/rerun walking skeleton、`always-elect` norm 更新、旧 workaround 非再出現。
- **Constraints:** coverage/patch/source-only/model-map gate を免除しない。norm は実装・テスト証拠成立後だけ更新する。

## Unit coverage summary

| Unit | Kind | 主なFR/NFR |
|---|---|---|
| U1 | library | FR-DEF-1〜4、FR-BAL-1/2、FR-COMP-1/2、NFR-3/4 |
| U2 | library | FR-BAL-3/4、FR-TAL-1〜6、FR-RER-1/2、NFR-1 |
| U3 | library | FR-BAL-5、FR-COMP-2/3、FR-RER-2/3、NFR-3 |
| U4 | library | FR-DEF-4、FR-OBS-1、FR-TAL-2〜4 |
| U5 | service | FR-RER-1〜4、FR-TAL-2/5/6 |
| U6 | service | FR-COMP-1/4 |
| U7 | spec | FR-FML-1、NFR-4/5 |
| U8 | packaging | FR-OBS-2、FR-NORM-1/2、NFR-2/5 |

全要件は少なくとも1unitに割り当てられ、全unitは少なくとも1要件を持つ。
