# Unit of Work Story Map — no-silent-drop

## 上流入力と story 代替

本 map は `components.md`、`component-methods.md`、`services.md`、`component-dependency.md`、`decisions.md`、`requirements.md` と Unit topology を入力とする。User Stories stage は scope 上 SKIP され `stories.md` がないため、新しい story を捏造せず、`requirements.md` の SC-01〜SC-07 を actor／goal／observable outcome を持つ acceptance scenario として mapping する。

Unit 間の経済的実装順序は扱わない。以下の「Unit 内 acceptance dependency」は、同じ Unit の test が前提とする論理順序であり、Bolt sequence／critical path の推奨ではない。

## Scenario-to-Unit mapping

| Scenario | Actor／goal | Primary Unit | Supporting Unit | Observable acceptance |
|---|---|---|---|---|
| SC-01 新規違反をPRで拒否 | contributor がsilent dropを追加してもCI成功にしない | static-gate-engine | repository-adoption | finding JSON＋exit 1、lint step failure |
| SC-02 正常な失敗処理を許可 | contributor が許可terminal／Result検査を実装しgateを通す | static-gate-engine | — | positive fixture と corpus が Pass |
| SC-03 既存債務を単調減少 | maintainer が#1874／#1878修正後にB0を確定する | repository-adoption | text-mutation-loud-failure、mirror-persistence-propagation、static-gate-engine | `B0 ⊂ B_pre`、追加0、削除identity一致 |
| SC-04 不正な免除を拒否 | reviewer がmarker／ledger growthを検出する | static-gate-engine | repository-adoption | EXEMPTION_INVALID／RATCHET_REPLACEMENT、非0 exit |
| SC-05 #1878 永続化失敗 | operator がcommit境界別の偽成功を受け取らない | mirror-persistence-propagation | repository-adoption | bytes不変／outcome-unknown／outbox収束 |
| SC-06 #1874 対象slug不在 | CLI利用者がmissing targetを成功通知と誤認しない | text-mutation-loud-failure | repository-adoption | typed not-found、write／audit bytes不変 |
| SC-07 走査基盤の内部異常 | contributor がpartial scanやtool異常をgreenにしない | static-gate-engine | repository-adoption |対応InfraCode＋exit 2、CI failure |

## Cross-cutting scenarios

### SC-03 — 修正前後 evidence と baseline

SC-03 は4 Unit を横断するが、shared implementation を作らない。

- static-gate-engine は同じ schema で `C_pre`／`C_post` と candidate を生成する。
- text-mutation-loud-failure は #1874 identity を source から除去し、not-found regression を提供する。
- mirror-persistence-propagation は #1878 identity を除去し、failure-injection evidence を提供する。
- repository-adoption は承認済み classification と集合差分を統合し、B0 と bootstrap provenance を所有する。

### SC-01／SC-04／SC-07 — local contract と CI enforcement

static-gate-engine が deterministic result、trusted previous ledger の読込み、ratchet 判定を所有し、repository-adoption が canonical ledger 値と base SHA の供給、CI blocking step を所有する。CI は detector 内部を再実装せず exit code を消費する。

### SC-05／SC-06 — runtime behavior と distribution

U2／U3 が canonical runtime behavior と focused test を所有し、U4 は package／promotion regeneration と全 harness drift を検証する。generated tree は source of truth にしない。

## Scenario を持たない直接 requirement acceptance

FR-12 の #1963 compose-resync regression は、走査基盤内部異常を扱う SC-07 には対応しないため、scenario mapping へ混在させない。U4 が既存の #1963 regression tests（requirements の検証証跡に列挙された `t407`／`t411`）を canonical corpus／full regression の一部として実行し、無音 no-op が再発しないことを直接 acceptance する。

## Unit 内 acceptance dependency

### static-gate-engine

1. contract／catalog／closed result schema fixture。
2. expected manifest／snapshot／read-only mirror／coverage receipt fixture。
3. ast-grep structural candidate と TypeScript semantic classification fixture。
4. raw→exemption→effective→baseline policy fixture。
5. CLI／evidence mode round-trip と performance observation。

これは同一 Unit の論理依存であり、他 Unit より先に着手する推奨ではない。

### text-mutation-loud-failure

1. malformed／duplicate／absent／already-set の helper contract。
2. changed／not-found の exhaustive caller boundary。
3. jump／utility／state／Bolt merge の write-before-success regression。

### mirror-persistence-propagation

1. internal StateResult phase／commit marker mapping。
2. `persistBlocked` の single-call inspection と warning.effect mapping。
3. commit前bytes invariance、durability unknown、audit pending、stale outbox の収束。

### repository-adoption

1. pre／post raw census、classification、approval receipt の全単射検証。
2. B_pre／B0／initial exemption／bootstrap provenance。
3. trusted base previous ledger と current ledger ratchet。
4. corpus precision／timing／#1963 regression。
5. blocking CI、package／promotion、full regression。

## Requirement coverage

| Requirement group | Unit coverage | Scenario evidence |
|---|---|---|
| FR-01〜04 | static-gate-engine、mirror-persistence-propagation、text-mutation-loud-failure | SC-01／02／05／06 |
| FR-05〜09 | static-gate-engine、repository-adoption | SC-01／03／04／07 |
| FR-10 | mirror-persistence-propagation、repository-adoption | SC-05 |
| FR-11 | text-mutation-loud-failure、repository-adoption | SC-06 |
| FR-12 | repository-adoption | 対応 scenario なし。#1963 regression を直接 acceptance |
| FR-13〜15 | repository-adoption、全producer Unit | SC-01／03〜07 |
| NFR-01 | static-gate-engine（algorithm owner）、repository-adoption（integration verifier） | cold／warm timing evidence |
| NFR-02 | static-gate-engine（classifier owner）、repository-adoption（corpus classification／verifier） | corpus TP／FP evidence |
| NFR-03 | static-gate-engine（scan／gate）、text-mutation-loud-failure（runtime bytes）、mirror-persistence-propagation（commit／outbox）、repository-adoption（integration verifier） | fail-closed／bytes invariance／convergence evidence |
| NFR-04 | static-gate-engine（deterministic output owner）、repository-adoption（corpus verifier） | byte-deterministic evidence |
| NFR-05 | static-gate-engine、text-mutation-loud-failure、mirror-persistence-propagation | typed outcome と write-before-success evidence |
| NFR-06 | static-gate-engine、text-mutation-loud-failure、mirror-persistence-propagation、repository-adoption | 各 Unit の focused test と統合検証 |
| NFR-07 | 全 producer Unit（focused tests）、repository-adoption（integration verifier） | full regression と distribution drift |
| NFR-08 | static-gate-engine（dependency pin owner）、repository-adoption（frozen CI verifier） | lockfile／frozen install evidence |
| NFR-09 | text-mutation-loud-failure、mirror-persistence-propagation（implementation owner）、repository-adoption（distribution verifier） | runtime compatibility／distribution drift |

## Coverage verification

- scenario total: 7、assigned: 7、unassigned: 0。
- Unit total: 4、scenario あり: 4、scenario なし: 0。
- primary owner が複数の scenario: 0。cross-cutting は supporting Unit と integration contract を明記済み。
- FR-01〜FR-15: 全件にUnitあり。
- FR-12: 対応 scenario は0件であり、U4 の直接 requirement acceptance として #1963 regression を別追跡する。
- NFR-01〜NFR-09: 全件にUnitあり。
- optional `stories.md`: stage SKIP のため不存在。これを sensor PASS や story 完了として偽装せず、requirements scenario mapping で明示代替した。
