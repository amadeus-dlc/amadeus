上流入力(consumes 全数): requirements.md, architecture.md, component-inventory.md, team-practices.md

# アーキテクチャ決定記録(ADR) — test-pyramid-rebuild(#684)

各 ADR は Context / Decision / Consequences / Alternatives Rejected / 可逆性 を持つ(inception.md「Architecture Standards」: 代替2案以上、後方互換は根拠付き ADR のみ)。本 intent は **設計まで**(FR-7)。実測値は RE(observed `d151561d8d9b7a01fa4f16d47da5434486a2e9e2`)からの転記。

## ADR-01: tier=size 上限規約(FR-3)

### Context

RE 実測で size 観点の medium 偏重(379/442 ≈ 85.7%)のアイスクリームコーン型を確認(scan-notes:35)。tier(runner ディレクトリ)と size(動的振る舞い)は独立軸(`test-size.ts:5-7`)だが、tier ごとに許容する size 上限を規約化しないと「unit に medium が混入し続ける」現状を是正する基準が持てない。unit 211件中 163件が非 small(scan-notes:39)。

### Decision

tier が size の上限を規約化する: **unit = small のみ / integration = medium まで / e2e = large まで**(AC-3a)。size の判定は `classifyTestSize` を唯一真実源とする(ADR-04)。**smoke tier は integration 相当(medium まで許容)として規約に含める** — E-TPR-AD Q2=B(2026-07-17、blind 3票一致、起草者推奨 A=規約対象外を多数決が覆した)。留保(e1): smoke の size 上限は medium までと明示し、large は tier 是正対象とする(青天井にしない)。**tier×size 規約の対象は 4 named tier(unit/integration/e2e/smoke)のみ**。台帳が全域再帰で拾う **harness/lib 等の補助 tier は規約対象外**(E-TPR-NR1 裁定 — 補助 tier は size ピラミッドの層序を持たず、台帳に可視化のみ。反証可能根拠付き)。

### Consequences

- 移設 intent が「どのファイルがどの tier 規約に違反しているか」を C1 台帳 + C2 規約 + C3 判定 IF で機械判定できる
- unit の 163件が是正対象として明確化(C4 選定台帳の母集団)
- 規約は文書であり、強制は C3(設計のみ、実装は移設 intent)

### Alternatives Rejected

- **A: 規約を設けず比率目標のみで運用** — 却下。比率(FR-2)は全体分布の指針であり、個別ファイルの配置是非を判定できない。tier×size 規約がないと移設対象の機械選定ができない
- **B: tier を廃し size だけでピラミッドを定義** — 却下。既存 `test_pyramid` コレクタ(`${tier}_${size}`)と run-tests.sh の tier 構造(A-2)を壊す。size と tier の独立軸(`test-size.ts:5-7`)を活かす設計が現物と整合

### 可逆性

**中**。規約は文書(C2)であり数値上限の変更は容易。ただし移設 intent が規約を前提に大量移設を進めた後の規約変更は手戻りが大きくなる。規約確定は選挙ゲートを経る。

## ADR-02: 比率・実行時間予算はガイドライン目標、強制ゲート化は Out(FR-2/FR-5)

### Context

理想ピラミッドの比率目標(small ≥ 50% / medium ≤ 45% / large ≤ 5%、AC-2a)と層別実行時間予算(FR-5)をどう扱うか。現状 small 約13.6%(scan-notes)から目標へは段階移設が必要で、いきなり強制ゲート化すると既存スイートが全面赤になりグリーン維持(FR-7)と両立しない。

### Decision

比率目標・実行時間予算は **ガイドライン目標(指針)** として文書化し、**強制ゲート化は本 intent Out**(移設 intent で検討、AC-2c / AC-5b)。数値は named 目標定数として文書化(マジックナンバー散在禁止、constants-from-code の文書版)。実行時間予算の **値** は units-generation(U-2)で各 tier の実行時間を実測したうえで選挙確定(AC-5a、scope-document「実測前提・値は選挙」)。requirements/design 段では基準値を断定しない。

### Consequences

- 既存スイートのグリーンを維持しつつ(FR-7)、移設で段階的に目標へ近づける道筋が明確
- 比率目標(50/45/5)は RE 実測からの転記で確定、時間予算の数値は U-2 の実測待ち(本 intent では断定しない)
- 強制ゲートは移設 intent の OQ-2 へ引き継ぎ

### Alternatives Rejected

- **A: 比率を即 CI 強制ゲート化** — 却下。現状 small 13.6% で即赤化し FR-7 グリーン維持と矛盾。段階移設の余地を奪う
- **B: 時間予算の数値を本 intent で断定** — 却下。tier 別 wall-clock 実測データが RE record に無く(AC-5a 注記)、実測なき数値は開発者に新マジックナンバーを作らせる(constants-from-code)。値は U-2 選挙へ routing 済み

### 可逆性

**高**。ガイドライン目標は文書であり、数値・強制化方針の変更は移設 intent の裁量。強制ゲート化を後から選ぶ道は開いている(不可逆な実装を先行させない)。

## ADR-03: 移設優先度 = seam 化可能性(FR-4)

### Context

unit 非 small 163件の是正順序を決める基準が必要。signal 内訳(重複計上、単純合算不可): filesystem 153 / spawn 99 / network 1 / timer 1(scan-notes:40)。FS fixture I/O は関数直接呼び出し(in-process seam)へ置換でき small 化しやすいが、spawn は CLI/hook を子プロセス検証する本質的 medium で size ではなく tier(配置)の問題。

### Decision

移設対象を **seam 化可能性で優先度付け**(AC-4a): (i) FS fixture I/O の in-process seam 化で small 化可能な分 = 最優先(既存 seam-export 系ノルム適用先) (ii) spawn の本質的 medium = size でなく tier を正す → integration へ移設候補。**選定台帳=計画まで、実移設は Out**(AC-4b)。

### Consequences

- 最も費用対効果の高い(small 化が容易な FS 系)移設から着手できる計画になる
- spawn 系は「size 違反」ではなく「tier 誤配置」として integration へ retier する方針が明確
- signal は重複計上のため、選定台帳は「ファイル単位」で優先度を持ち、signal 出現数を件数と混同しない

### Alternatives Rejected

- **A: ファイル数/行数の大きい順に移設** — 却下。規模は seam 化容易性と相関せず、大きいが本質的 medium なファイルを先に触ると徒労になる
- **B: tier 違反(spawn 系)を先に integration へ一括 retier** — 却下。retier は size を下げず全体分布を改善しない。small 化(FS seam)を先行させる方がピラミッド是正への寄与が大きい。ただし両者は移設 intent で並行しうる(本 intent は優先度設計まで)

### 可逆性

**高**。選定台帳は計画(C4)であり、優先度の並べ替えは移設 intent で自由。実移設していないため手戻りコストなし。

## ADR-04: classifyTestSize を size の単一真実源とする

### Context

サイズ台帳・tier ゲート・移設選定・カバレッジ整合の全コンポーネントが size を必要とする。各所で size を判定すると判定ロジックが分散し、検証劇場(status ハードコード)や判定ブレを生む(org.md/team.md P2)。既存 `classifyTestSize`(`test-size.ts:49`、`SIGNAL_PATTERNS :35-40`)が既に決定的な size 判定を持つ。

### Decision

**size の唯一の真実源は `classifyTestSize`**。全コンポーネント(C1〜C5)は size 値をこの関数の計測出力から転記するのみで、独自の size 判定を持たない(FR-1 AC-1a、numbers-from-command-output-only)。新しい分類器は作らない(FR-7 Out)。台帳は「文書のふりをしたフィールド」にならない、消費者を持つ派生物とする(construction.md)。

### Consequences

- size 判定が1点に集約し、SIGNAL_PATTERNS の変更が全消費者へ一貫伝播
- 台帳のハードコード = 検証劇場 Forbidden を構造的に排除
- classifyTestSize の regex 純関数性により OS 非依存(将来条件 requirements.md:49)

### Alternatives Rejected

- **A: 台帳に size を静的記載(RE 実測値をハードコード)** — 却下。検証劇場 Forbidden(org.md/team.md P2)。テスト増減で台帳が即陳腐化し、再計測との乖離を無音で生む
- **B: 台帳生成時に独自の軽量分類器を新設** — 却下。判定ロジックの二重化を生み、SIGNAL_PATTERNS との乖離リスク。既存決定的関数の再利用が最小変更(P5 surgical)

### 可逆性

**高**。真実源を1関数に固定する決定は、将来 Phase D(#699 動的計測 `test-size.ts:72-89`)へ拡張しても出力形状が安定(`:13-14` の設計意図)。真実源の切替は容易。

## ADR-05: 後方互換シムを追加せず、既存 size ドリフトゲートを非破壊温存する

### Context

tier-aware ドリフトゲート(C3)を追加するにあたり、既存 size ドリフトゲート(`declared < measured` で CI 赤、`t-test-size-drift`、`test-size.ts:16-21`)との関係を決める必要がある。RE 実測で既存ゲートは現状ドリフト 0件の全 green(scan-notes:46)。org.md/team.md P5・inception.md は「要求にない後方互換レイヤー・移行シム・二重実装」を Forbidden とする。

### Decision

**後方互換シム・移行レイヤー・二重実装を追加しない**。既存 size ドリフトゲート(declared-vs-measured)は **非破壊で温存**(触らない)。tier-aware ゲート(tier-vs-measured)は **既存ゲートの置換ではなく、直交する別観点の追加**(同じ `classifyTestSize` を根に持つが別関数 `detectTierSizeViolation`)。両ゲートは異なる不整合(縦=宣言詐称 / 横=配置違反)を検出し、片方が他方を包含しない。

### Consequences

- 既存の全 green を壊さず(FR-7 グリーン維持)、tier 観点を追加できる
- 「非破壊追加」であり互換シムではない — 古い挙動を維持するための二重実装ではなく、新しい直交観点の追加(根拠を本 ADR に明記、inception.md 要件)
- 実装(C3 の CI 配線・落ちる実証)は移設 intent(本 ADR は設計方針の固定まで)

### Alternatives Rejected

- **A: 既存 size ドリフトゲートを tier-aware ゲートで置換(統合)** — 却下。declared-vs-measured(宣言詐称検出)と tier-vs-measured(配置違反検出)は検出対象が異なり、統合すると既存の宣言詐称検出を失う。symmetric-pair-review 観点でも別対の検査
- **B: tier-aware ゲート導入時に旧挙動の互換フラグ/シムを用意** — 却下。要求にない互換レイヤーは Forbidden(org.md/team.md P5、inception.md)。既存ゲートを触らない非破壊追加なら互換シム自体が不要

### 可逆性

**高**。既存ゲートに触らないため、tier-aware ゲート設計を破棄しても既存挙動は完全に保たれる。実装を移設 intent へ先送りしているため、本 intent 時点での不可逆コミットはない。

## 決定サマリと不可逆性フラグ

| ADR | 決定 | 可逆性 | 不可逆コミット |
| --- | --- | --- | --- |
| ADR-01 | tier=size 上限規約 | 中 | なし(規約は文書、選挙ゲート) |
| ADR-02 | 比率・時間予算はガイドライン、強制 Out | 高 | なし |
| ADR-03 | 移設優先 = seam 化可能性 | 高 | なし(計画のみ) |
| ADR-04 | classifyTestSize 単一真実源 | 高 | なし |
| ADR-05 | 互換シム不追加・既存ゲート非破壊温存 | 高 | なし(既存に触れない) |

本 intent は設計まで(FR-7)であり、実装を伴う不可逆決定は存在しない。強制ゲート化・実移設・CI 配線はすべて後続 intent の裁量として開いている(reversibility over perfection、architect P6)。
