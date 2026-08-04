# Pi Coding Agent対応 — Bolt Plan

## 計画原則

最初のBoltを単独・ゲート付きwalking skeletonとし、承認後にrisk-firstかつ`unit-of-work-dependency`のDAGを満たす順で広げる。Bolt 1は`scope-document`で既決のextension event→audit→human gate→停止/継続→subagentを、fresh installからPi TUIまで端から端で通す最小sliceである。transaction hardening、Pi Package parity、完全doctor、guide、formal evidenceは後続へ分離する。

数値WSJFは使わない。独立したbusiness-value/time-criticality weightがなく、`requirements`と`team-practices`に定めた安全順序を仮のscoreで上書きしないためである。各BoltはTDDで進め、生成物を直接編集せず、既存Bun test/CIを使う。

## 実行順とbatch

| Batch | Bolt | Units | 規模目安 | Gate / 並行 |
|---:|---|---|---:|---|
| 1 | B1 Pi walking skeleton | `pi-harness-foundation`、`pi-lifecycle-gate-adapter`、`pi-child-execution-driver` | 2,400〜3,700 LOC | 単独・必須human gate |
| 2 | B2 Setup transaction safety | `setup-transaction-safety` | 700〜1,100 LOC | B1承認後 |
| 3 | B3 Distribution and installation | `pi-distribution-installation` | 900〜1,400 LOC | B1/B2完了後 |
| 4 | B4 Doctor diagnostics | `pi-doctor-diagnostics` | 450〜750 LOC | B3完了後 |
| 5 | B5 User and maintainer guides | `pi-user-maintainer-guides` | 500〜800 LOC | B4完了後 |
| 6 | B6 Conformance and formal evidence | `pi-conformance-evidence` | 1,200〜1,800 LOC | B5完了後 |

DAG上は4 root Unitが独立だが、B1はproject/team practiceにより単独で先行する。B1が3 root Unitを束ね、残るrootはB2だけなので、この計画には安全に同時実行できる後続Boltの組がない。最大4並行というcapは維持するが、依存を偽って並列度を作らない。

## B1 — Pi walking skeleton

- **Units:** `pi-harness-foundation`、`pi-lifecycle-gate-adapter`、`pi-child-execution-driver`
- **Walking skeleton:** Yes。manifest/package projection、fresh-only setup、Pi native skill、extension lifecycle、canonical audit/state、human gate、`pi --mode rpc --no-session` child driverを横断する。
- **Definition of Done:** 空fixtureへcandidateを導入できる。Pi 0.83.0以上のTUIからAmadeus skillを起動できる。interactive inputだけがHUMAN_TURNを1回mintし、未回答ではadvanceせず、回答後は`agent_settled`後に1回だけ継続する。support/reviewer childがtyped terminal resultを返す。Unit-local tests、package drift check、手動TUI smokeがgreenである。
- **Confidence hypothesis:** Piの公開surfaceだけで、監査可能なhuman gateとsubagentを持つAmadeusの最小縦断経路を成立させられる。
- **Expected demo:** fresh projectへ導入→Pi TUIでstatus→質問を表示→人間が回答→1回継続→support child結果表示。

## B2 — Setup transaction safety

- **Unit:** `setup-transaction-safety`
- **Definition of Done:** 全競合preflight、target-local staging、write-ahead journal、backup、commit、逆順rollback、次回起動recoveryがRed→Greenで実証され、失敗・中断で部分適用を成功扱いしない。
- **Confidence hypothesis:** multi-file fresh/updateをデータ損失なしで原子的に扱える。
- **Expected demo:** injected failureとprocess interruption後に元bytesへ復元し、再実行が収束する。

## B3 — Distribution and installation

- **Unit:** `pi-distribution-installation`
- **Definition of Done:** setup fresh/update/uninstallとPi Package local/gitが同じnormalized resource/hash集合を導入する。利用者管理fileを保持し、same-version diff=0、regen drift=0、registry mutation testがgreenである。
- **Confidence hypothesis:** 二つの導入経路を一つのauthored sourceから決定的に配布できる。
- **Expected demo:** setupと`pi install -l` local/gitのcandidate tree/hash比較、およびN→N+1 rollback。

## B4 — Doctor diagnostics

- **Unit:** `pi-doctor-diagnostics`
- **Definition of Done:** version、OS、Bun、trust、skills、extensions、package resource、driverをstructured resultで診断する。healthy fixtureは全pass、0.82.x/native Windows/欠落resourceは局所failure、secret/home pathはredactされる。blocked workflowでもread-only doctorが完走する。
- **Confidence hypothesis:** 利用者が修復可能な原因へ局所化でき、unsupported環境をformal successと誤認しない。
- **Expected demo:** healthy/negative matrixとremediation出力。

## B5 — User and maintainer guides

- **Unit:** `pi-user-maintainer-guides`
- **Definition of Done:** 日本語/英語guide、trust、setup/Pi Package、起動、gate制約、failure、doctor、update/uninstall、unsupported、supply chain、porting registryが実装と同期し、section/link/catalog検査がgreenである。
- **Confidence hypothesis:** 利用者と保守者が未検証claimなしで導入・診断・更新・削除できる。
- **Expected demo:** guideのshortest pathとmanifest catalog照合。

## B6 — Conformance and formal evidence

- **Unit:** `pi-conformance-evidence`
- **Definition of Done:** SCN 9/9、FR 30/30、NFR 12/12のtrace matrix、cross-unit E2E、actual Pi local/git install、RPC live、TUI dogfood、macOS/Linux、native Windows negativeを検証する。formal green recordはPi version、OS、provider identifier、commit、canonical assertionsを持ち、理由付きskipを正式完了へ昇格しない。
- **Confidence hypothesis:** `@earendil-works/pi-coding-agent`を実験的互換ではなく正式対応ハーネスとして再現可能に主張できる。
- **Expected demo:** deterministic CI greenと、skip不可の実機evidence pack。

## 上流トレーサビリティ

`requirements`のM1〜M10とSCN-001〜009、`components`のownership、`unit-of-work`の数値規模、`unit-of-work-dependency`のDAG、`unit-of-work-story-map`の9/9・30/30・12/12 coverageを用いた。`stories`と`mockups`はscope上存在しないためSCNとexpected demoで代替し、`team-practices`のwalking skeleton、TDD、worktree隔離、最大4並行を適用した。
