# Business Rules — U1-mirror-tool(260719-mirror-productization)

上流入力(consumes 全数): unit-of-work.md、unit-of-work-story-map.md、requirements.md、components.md、component-methods.md、services.md

## BR-U1-1: 挙動不変(FR-1/W-04)

既存3 verb(create/sync/close)の CLI 契約・出力・exit code(fail=1/usage=2)・landing check・GhRunner シームは移設前後でバイト等価の挙動。検証 = t232 全アサーション不変(N-1)。

## BR-U1-2: status の乖離判定は決定的比較のみ(FR-2)

- 判定入力は (a) SnapshotOutcome(intents.json+state) (b) `gh issue view --json` の実出力 (c) create/sync と同一レンダラによる期待本文再生成、の3点のみ。時刻・環境依存の判定を持たない
- 3クラスは独立に検査し、複数該当時は findings に全件列挙(最初の1件で打ち切らない)

## BR-U1-3: exit code 契約(ADR-2)

clean→0 / diverged→1 / precondition→2。usage エラー(未知 verb/フラグ)は既存契約の exit 2 を維持 — status の precondition(2)と同値だが、stderr 文言で区別可能にする(usage は Usage 行、precondition は理由文)。

## BR-U1-4: status は書込ゼロ(FR-2)

gh は read 系(`issue view`)のみ。state・intents.json・Issue への書込なし。`writeMirrorIssueField` を呼ばない。

## BR-U1-5: gh 前提エラーは loud(C-01/ADR-7)

gh 不在・未認証は precondition(exit 2)で理由を stderr へ。workflow は止めない(呼出側 print/SKILL は続行可能)。

## BR-U1-6: usage 出力の運用注記(ADR-5 留保の履行)

usage/ヘルプ出力に「create/close は conductor から実行(機械強制なし)」を含める。強制を装う文言(『拒否される』等)は使わない。ノルム本文は複製せず team.md の運用合意への参照とする。
