# Requirements Analysis Questions

- **Depth:** Minimal（最大4問）
- **Mode:** Guide me / Intent autonomy full
- **Mode decision:** `auto-decision-a196e4e1c04f80a87f0c64db125658ed`
- **E-OC1 承認証跡:** 2026-08-11T14:27:40Z — ユーザーの HUMAN_TURN により発行された full autonomy grant `intent-grant-d3ae578b5ba56163ec64ca08a19b4186` が question interaction を認可し、Q1〜Q4 は同 grant 下の `agent-recommendation` として裁定・記録された。
- **Source:** [Issue #2838](https://github.com/amadeus-dlc/amadeus/issues/2838) と Reverse Engineering 成果物

## Q1. report の lifecycle と stage ownership をどう閉じますか？

A. 単一の CLI 専用 report を PR create 時に attestation 付きで生成し、Code Generation gate は `created` 証跡を、pr-convergence/workflow completion は同じ report の `converged` または明示的 human override 証跡を要求する。`landed` は自動 convergence 承認にしない。
B. report は最終 pr-convergence stage だけで生成し、Code Generation gate では要求しない。
C. PR create receipt と convergence report を別ファイルに分ける。
D. 現行どおり Code Generation の存在確認だけを維持する。
X. Other (please specify)

[Answer]: A — 単一の CLI 専用 report を `created` から `converged` / 監査済み override へ更新する lifecycle を採用する。Code Generation は linked PR 作成証跡、最終 delivery boundary は convergence 証跡を別々の状態条件として検査し、`landed` は自動承認にしない。AUTO_DECIDED `auto-decision-c98b5057784d0807c79090696c68925c`（basis: agent-recommendation、reviewState: unreviewed）。

## Q2. CLI 由来 provenance / attestation を何に束縛しますか？

A. CLI が audit lock 内で canonical event を発行し、Intent・Unit・PR・head SHA・report content digest・event identity を相互束縛する。report と sensor は event および current bytes を再照合し、copy/tamper/replay を拒否する。
B. マシン固有秘密鍵による署名を新設する。
C. GitHub の現在状態だけを再取得し、writer identity は検証しない。
D. Markdown field の shape validation だけを維持する。
X. Other (please specify)

[Answer]: A — canonical audit event と report bytes を Intent・Unit・PR・head SHA・content digest・event identity で相互束縛する。通常の Write では canonical event を生成できず、copy は scope/head、tamper は digest、replay は Intent/Unit/PR/head の不一致で拒否できる。AUTO_DECIDED `auto-decision-bef623d33444d2a37d279786f1c95e34`（basis: agent-recommendation、reviewState: unreviewed）。

## Q3. fail-closed enforcement をどの境界に置きますか？

A. plugin compose が report sensor を対象 stage へ自動 binding し、manifest を blocking 化する。engine と direct state completion の全 API は required artifacts 全件と最新 blocking sensor PASS を同じ強度で要求する。
B. core が pr-convergence 固有 Markdown schema を直接 import して検査する。
C. blocking sensor だけ追加し、direct state completion guard は変更しない。
D. required artifact の存在だけを検査する。
X. Other (please specify)

[Answer]: A — plugin compose による sensor binding と blocking severity、core の generic required-all / latest-blocking-PASS guard を組み合わせる。core に plugin 固有 schema を import せず、engine と direct completion API の強度を揃える。AUTO_DECIDED `auto-decision-31b95e581259c9a6fb7bed95a3a639e9`（basis: agent-recommendation、reviewState: unreviewed）。

## Q4. self-* scope の local/remote prerequisite と bypass 境界をどうしますか？

A. linked self-* では base と異なる branch、対象変更の commit、clean tracked state、remote branch、local/remote/PR head SHA 一致を必須化し、`--unlinked true` を拒否する。human override は linked PR と attested report を前提に監査記録付きでのみ許す。非 self-* opt-in の unlinked 挙動は維持する。
B. CLI が commit と push を自動実行してから PR を作る。
C. self-* でも `--unlinked true` を維持し、運用で制限する。
D. GitHub PR 作成が成功すれば local prerequisite は検査しない。
X. Other (please specify)

[Answer]: A — linked self-* では branch・commit・clean tracked state・remote branch・local/remote/PR head SHA 一致を fail-closed に検査し、`--unlinked true` を拒否する。CLI は commit/push を自動実行せず actionable diagnostics を返す。非 self-* opt-in と human override の独立契約は維持する。AUTO_DECIDED `auto-decision-6059694f80d21179eb2e8129eff1a111`（basis: agent-recommendation、reviewState: unreviewed）。

## Decision Summary

- 4問すべて Intent autonomy full の `decide-question` 梯子で確定した。
- 全 decision は `agent-recommendation` による `reviewState: unreviewed` であり、`amadeus-bolt list-auto-decisions` から後日レビューできる。
- 空の `[Answer]:` はない。material ambiguity と相互矛盾は残っていない。
