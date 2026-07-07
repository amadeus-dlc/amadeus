# Delivery Planning Questions — インストーラの実装

> Stage: delivery-planning / Intent: `260706-installer-impl`  
> Mode: Grill me  
> Source of truth for Bolt sequencing decisions.

## Q1: Sequencing Heuristic And Walking Skeleton

最初の Bolt はどの sequencing heuristic で決めますか？

A. Walking-skeleton-first + risk-first（推奨） — Bolt 1 で U1〜U5 の最小 end-to-end install path を通し、配布入口・source loading・target planning・apply/verify の architecture を人間ゲートで確認する  
B. Risk-first only — version/source、target detection、planning safety など技術リスクの高い unit を順に潰すが、最初の Bolt は必ずしも end-to-end にしない  
C. Value-first — 新規ユーザーの clean install 価値を最短で届ける順序を優先し、CI/release/docs は後回しにする  
D. WSJF scoring — value, time criticality, risk reduction, job size を点数化して順序を決める  
X. Other — 別案を指定する

[Answer]: A — Walking-skeleton-first + risk-first。Bolt 1 は U1〜U5 の最小 end-to-end install path を通し、以降の拡張前に人間ゲートで確認する。

## Q2: Bolt Granularity

Bolt はどの粒度で組みますか？

A. Thin walking skeleton + bundled follow-up Bolts（推奨） — Bolt 1 は U1〜U5 を薄く貫通し、その後は U2/U3/U4/U5 の完成度を高める Bolt、U6/U7、U8 のように束ねる  
B. One Unit per Bolt — U1 から U8 までを原則 1 unit ずつ Construction に流す  
C. Large bundled Bolts — runtime installer、tests/CI、release/docs の 3 Bolt 程度にまとめる  
D. Parallel feature Bolts — U2 と U3 を別 Bolt で並列化し、U4 以降で統合する  
X. Other — 別案を指定する

[Answer]: A — Bolt 1 は U1〜U5 の thin walking skeleton とし、後続 Bolt で runtime completeness、test harness/CI、release/docs を束ねる。

## Q3: Parallelism And Gates

Construction Bolts は並列実行を許可しますか？

A. Skeleton gate 後に限定的な並列化を許可（推奨） — Bolt 1 は直列・人間ゲート必須。以後は DAG が許す範囲で U2/U3 周辺の厚み付けや docs 下準備を並列候補にする  
B. 全 Bolt を strictly sequential にする — すべて直列で進め、統合リスクを最小化する  
C. DAG が許す限り最大並列化する — U2 と U3 などを積極的に別 Bolt として並列化する  
D. autonomous Construction にする — walking skeleton 後は自動で最後まで進める  
X. Other — 別案を指定する

[Answer]: A — Bolt 1 は直列・人間ゲート必須。以後は DAG が許す範囲で限定的な並列化を候補にし、最終的な autonomy は walking skeleton 後の ladder prompt に委ねる。

## Q4: External Dependencies

外部依存はどう扱いますか？

A. Runtime 実装は外部依存なし、release/publish は gated external dependency として分離（推奨） — GitHub tag/archive は mockable、npm token/environment protection は U8 の release gate として扱う  
B. npm publish までを実装完了条件に含める — credentials と protected environment が整うまで release Bolt は完了しない  
C. GitHub Actions release workflow は設計だけに留め、U8 では docs のみ扱う  
D. 外部依存なしとして release/publish も通常実装扱いにする  
X. Other — 別案を指定する

[Answer]: A — Runtime 実装は外部依存なしとして mockable にし、release/publish は npm token や protected environment を持つ gated external dependency として分離する。
