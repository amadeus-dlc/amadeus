# Requirements Analysis Questions — 260706-persona-loading

## 上流入力

Issue #582 とディスパッチ（補足指示 3 点）。codekb: [architecture.md](../../../../codekb/amadeus/architecture.md)（エンジン駆動の実行経路）、[code-structure.md](../../../../codekb/amadeus/code-structure.md)（amadeus-common の位置）、[business-overview.md](../../../../codekb/amadeus/business-overview.md)（公開入口 = amadeus skill）。

Issue の「決めること」（修正 vs 両立明文化）は reverse-engineering の実測で決着済み（両立意図の証拠なし、gate 承認済み）。残る細部 1 問のみ。

## Q1. §5 subagent 節の修正後の文言範囲

- A. 3 項目を実体へ書き換える: ①Task は stage metadata の subagent_type で named agent を呼び、persona と knowledge は自動読込（prompt へ注入しない）②prompt には prior artifacts と workspace state を context として渡す（subagent は会話履歴を見ないため）③（旧 3 項の subagent_type 指定は①へ統合）
- B. 旧 1 項だけを 1 行修正（②の理由説明を加えない）
- C. その他
- X. Other (please specify)

[Answer]: A。SKILL.md・conductor persona・stage 定義（reverse-engineering.md / code-generation 系の「Do NOT manually inject the persona」）と同じ語彙・同じ理由付けで揃え、読者がどの文書から入っても同一の実体に到達する状態にする。B は矛盾は消えるが「なぜ渡すのは artifacts だけか」の理由が §5 に残らず、再発（誰かが親切心で persona を足す）を防げない。自己判断（理由付き、Deviations 記録）。追記（reviewer iteration 1）: 同一矛盾の第 2 出現箇所（§11 L834 の Always include 行）も同じ実体へ修正する（FR-1.3 として要求化。swarm worker も plain Task のため同規則）。
