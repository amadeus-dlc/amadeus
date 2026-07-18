上流入力(consumes 全数): requirements.md, components.md, unit-of-work.md, unit-of-work-dependency.md, unit-of-work-story-map.md, team-practices.md

# Bolt 順序の根拠とリスク — test-pyramid-rebuild(#684)

## シーケンス方針(heuristic の明示)

**walking-skeleton-first**(org.md「Walking Skeleton」)を第一の heuristic として採用し、DAG が許す範囲(unit-of-work-dependency.md の U1→{U2,U3} 一方向)で経済的判断を行う。U1(根)を単独 Bolt として最初に出荷し、消費者(コレクタ設計 / U2 判定 IF / U3 選定台帳)が拠って立つ計測導出台帳の正しさを最初に検証する。U1 が固まらないまま U2・U3 を並行着手すると、両ユニットとも「独自 size 判定を持たない」設計原則(ADR-04、U1 の Q1 e4 留保)の再検証が二重に発生するリスクがあるため、逐次を選ぶ。

第二の heuristic として **DAG 制約の逐次尊重**(architect-agent 提供の依存グラフを変形しない)を適用し、U2 と U3 は相互依存がない(unit-of-work-dependency.md:24)ため Bolt 1 完了後に **並行**させ、フロー効率のためにリソースを寝かせない(team.md「フロー効率よりリソース効率を優先」しつつ、依存が無いユニットは並行してリソース効率も稼ぐ)。

## Bolt 順序の根拠(要約)

| 順序 | Bolt | 根拠 |
| --- | --- | --- |
| 1 | Bolt 1(U1) | 根ユニット。他2ユニットの入力(measured size)を提供する唯一真実源の materialize。先行させないと U2/U3 の受け入れ基準(measured 由来の転記)が検証不能 |
| 2(並行) | Bolt 2(U2) | U1 のみに依存、U3 と無関係。層責務規約・ゲート設計・予算ガイドラインは独立して価値提供可能(ジャーニー段階2、story-map.md) |
| 2(並行) | Bolt 3(U3) | U1 のみに依存、U2 と無関係。移設選定台帳・#683整合計画は独立して価値提供可能(ジャーニー段階3、story-map.md) |

## この Bolt 1 が「何を証明するか」(確信度仮説)

Bolt 1 の出荷は次を検証する: (a) `classifyTestSize` の決定的スイープ出力を record 成果物として materialize する構築コストが見積り(560〜600行)の範囲に収まること、(b) 台帳の出力契約(`${tier}_${size}` キー形式、既存 `test_pyramid` コレクタとの exact 一致)が実際に既存コレクタ設計と整合すること、(c) 実測 ref 併記・数値転記のみという検証劇場対策(numbers-from-command-output-only)が record 成果物の様式として運用可能であること。これらが検証できて初めて U2・U3 は「U1 台帳を信頼して消費する」設計を安心して進められる。

## リスクと緩和

| リスク | 内容 | 緩和 |
| --- | --- | --- |
| R1: 分類経路の二重化(Q1 e4 留保) | U1 が独立モジュールとして materialize される際、既存 `test_pyramid` コレクタ(`scripts/metrics-snapshot.ts:101`)が引き続き自前で `classifyTestSize` を直呼びし続け、U1 台帳と非公式に並存する形になるリスク | U1 の reuse inventory・実装スコープ境界に「コレクタは自前の size 分類を持たず本モジュールを消費する一方向依存とする」を明記済み(unit-of-work.md:60)。construction 実装 intent 側でもこの一方向依存を設計として引き継ぐ(N3 充足、unit-of-work.md:156) |
| R2: 実測値の陳腐化 | 台帳の全数値は measurement ref `3917a283a953165866170d235d3dc25ad2fd3643`(tests/ 全域再帰 442ファイル、E-TPR-NR1)時点の RE スイープに基づく。construction 進入までの間にテストファイルが増減すると台帳が stale になる | Bolt 1 gate-start 直前に `classifyTestSize` の再スイープを実施し、observed SHA を construction 進入時点の HEAD へ更新してから台帳を確定する(measurement-ref-in-artifacts の運用徹底)。数値差分が生じた場合は tier×size マトリクスを再計算してから成果物化する |
| R3: 台帳の消費契約が「文書のふりをしたフィールド」になる | construction.md「複数箇所で消費されるリスト…を手書きで複製しない」「どのコードも消費しない文書のふりをしたフィールドを持たせない」に抵触するリスク。台帳が record 文書に留まり、消費側(コレクタ移行・移設 intent・#683整合)が実際に参照しない場合に発生 | U1 受け入れ基準に「消費者(3系統)を持つ派生物であること」を明記済み(unit-of-work.md:49)。Bolt 1 の DoD で3消費者すべての参照経路(コレクタキー形式一致・U3母集団抽出・#683 tier キー共有)を明示する |
| R4: U2 の実行時間予算(FR-5)が実測前に断定される | tier 別実行時間予算は「本ユニット内で実測したうえで選挙確定」(AC-5a)。Bolt 2 着手前に見込み値を先出しすると constants-from-code 違反になる | Bolt 2 の DoD に「実測前は基準値を断定しない」を明記済み(bolt-plan.md)。予算値の選挙は Bolt 2 の construction 内で実施し、delivery-planning 段では数値を確定しない |
| R5: Bolt 2 ⇔ Bolt 3 並行時の worktree 交差 | 両 Bolt が誤って同一ファイル(例: 共有台帳やコレクタ)へ書き込むと c6 の非交差前提が崩れる | 着手前に対象ファイル目録を実 diff/静的目録で突き合わせ(c6)、交差が判明した場合は直列化に切り替える(learned 2026-07-10 の運用) |
| R6: walking-skeleton 姿勢の要否そのものが未決 | 本 intent は greenfield 要素が薄く、org.md の既定スコープ一覧に厳密該当しない。U1 単独ゲートを義務とすべきか任意とすべきか未決 | delivery-planning-questions.md Q1 で選挙/ユーザーへ委ねる。既定として Bolt 1 単独ゲートを推奨するが、断定しない |

## 落ちる実証・検証劇場の回避(本 intent への適用)

本 intent は実装 Out のため、org.md/team.md Mandated の「落ちる実証」は construction 実装 intent 側の適用対象。本 intent の delivery-planning では、Bolt DoD に含める受け入れ基準がすべて `unit-of-work.md` の AC(RE 実測から導出済み)への参照であり、新規の検証機構は導入しない。
