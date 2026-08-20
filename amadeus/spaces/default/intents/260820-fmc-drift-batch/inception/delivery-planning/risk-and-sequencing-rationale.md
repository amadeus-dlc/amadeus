# Risk & Sequencing Rationale — 260820-fmc-drift-batch

上流入力: `bolt-plan.md`、`unit-of-work-dependency.md`(辺2本)、`unit-of-work.md`(§12a Review 節の申し送り)、`requirements.md`(NFR/制約)、`unit-of-work-story-map.md`(Issue クローズ条件)、`components.md`。

## シーケンシングの根拠(dependency-first + 最大並列 — scope-definition Q2=A)

1. **Bolt 1 = U3 単独**: walking-skeleton の thinnest slice(削除中心)。直列鎖 U3→U4 の先頭を最初に着地させることでクリティカルパスを最短化。全統合点(宣言/コード/契約/docs/テスト/台帳/CI/PR)を1周して以後の Bolt の配送リスクを前倒しで消化。
2. **Bolt 2 = U1 ∥ U2**: 相互非交差(実測済み)の2 unit を worktree 分離で並列。U1 は U4 の前提(leaf)、U2 は完全独立。
3. **Bolt 3 = U4**: 依存辺2本(U3 の共有面、U1 の leaf)の合流末端。

## リスク台帳

| # | リスク | 影響 | 緩和 |
|---|---|---|---|
| R1 | U3 の census 除外条件(RFC 面)が FD で退役ポインタ側に倒れ、U3 の write scope が specs/rfc へ拡大 | Bolt 1 の粒度微増 | 条件付き write scope として units 側で宣言済み。他 unit と非交差のため編成不変 |
| R2 | t3078 の述語方向次第で U1 が plugin.json を条件付きで書く(U3 と同ファイル) | Bolt 2 と Bolt 1 の交差 | Bolt 1(U3)が先に着地する編成のため時間的に直列 — FD で述語を実読し、必要なら U1 側の編集を tools[] キーに限定(U3 は advisories[] キー)して衝突面を分離 |
| R3 | 生成台帳(coverage-registry / patch-allowlist)の並列 regen 競合 | Bolt 2 の PR 着地時 conflict | 直列着地 + 再構成 + build 後 regen(既定運用、cid 参照は unit-of-work.md) |
| R4 | U4 の閾値較正(FR-ARM-2)が観測レンジ実測で難航 | Bolt 3 の遅延 | corpus は record 内 issue-evidence 群で完結(GitHub 照会なし)。レンジ外なら FD で意味論ごと再裁定(halt 条件明記済み) |
| R5 | FR-ARM-1 の落ちる実証が「現状のまま赤」にならない(検出述語が landed 欠落を拾えない) | U4 の AC 不成立 | 実証先行(TDD)で設計 — 述語が拾えない場合は実装前に判明し、述語側を是正 |
| R6 | Bolt PR の record 同梱による intents.json 競合(他 intent との構造的競合) | 着地の往復 | 既定の再構成手順(uuid 照合 + 単調 seq 検証)で解決 — 既知クラス |

## クリティカルパス

U3(Bolt 1)→ U4(Bolt 3)。U1/U2 は並列でクリティカルパス外(U1 は U4 開始までに着地していればよい)。ハードデッドラインなし(scope-definition Q3=A)のため、パス長より品質ゲート(落ちる実証・census)を優先する。
