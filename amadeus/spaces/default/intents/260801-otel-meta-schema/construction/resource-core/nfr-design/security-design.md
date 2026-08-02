# Security Design — U1 resource-core

上流入力(consumes 全数): security-requirements ほか performance-requirements / scalability-requirements / reliability-requirements / tech-stack-decisions は nfr-requirements SKIP により不在(expected)— セキュリティ要件は requirements.md FR-RES-4(二層 redaction)+ NFR-1 と project.md Mandated(export-boundary-redaction)から代替導出。business-logic-model.md(実在)の「二層 redaction」節を設計正本として消費。tech-stack 前提は codekb technology-stack.md 260801 現在節に依拠。

## 二層 redaction(FR-RES-4 / BR-U1-4)

- **write-time 層(新設)**: buildResource の bag 完成時に redactAttributes+credential scrub を1回適用。span/metrics 経路に write-time 層が現存しない実測ギャップを組み立て点で一元的に埋める
- **export 境界層(既存)**: local-span-exporter の redactRecord / local-metric-exporter / logger 経路の既存 redaction は無改変で通す。二層は同一 policy のため冪等 — 二重適用による値破壊なし
- 落ちる実証: credential 形値を supplier 経由で供給し (a) bag 時点 masked (b) store 上 masked の両層を assert(検証劇場 Forbidden 準拠 — 実行結果由来のみ)

## 供給境界の入力検証

- supplier 4キーは閉集合(supplier 以外のキー供給は throw = fail-closed)。二重設定 throw(BR-U1-3)により後勝ち上書きでの汚染を遮断
- resource へ個人情報系(user email 等)は載せない — 属性は #1868 §1 の14属性閉集合のみ。閉集合外キーは組み立て時に拒否

## secrets 非保持

- resource に API キー・token を保持する設計は存在しない。vcs.* はブランチ名/リビジョンのみ(値は scrub 済みで store へ)。env 由来値も redaction 層を通過してから bag へ載る
