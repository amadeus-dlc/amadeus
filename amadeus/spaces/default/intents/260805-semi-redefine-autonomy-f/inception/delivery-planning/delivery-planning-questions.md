# Delivery Planning 質問記録 — semi 再定義と `--autonomy` 起動宣言(#2253)

上流入力(consumes 全数): requirements.md, components.md, unit-of-work.md, unit-of-work-dependency.md, unit-of-work-story-map.md, stories.md(不在), mockups(不在), team-practices(= `amadeus/spaces/default/memory/team.md`)

- **様式**: **0 問様式**(既習形)。`[Answer]` タグを持つ質問行は 0 件である。
- **E-OC1 判定**: **選挙不要**。根拠種別は「既決規範の機械的執行」— 本ステージの全判断事項が (i) `org.md` / `project.md` / `team.md` の既決規範 (ii) 承認済み上流成果物(`requirements.md` の Constraints、`unit-of-work.md` の 7 Unit 定義、`unit-of-work-dependency.md` の yaml edge block と §ファイル交差)の 2 つから一意に導出でき、複数の妥当解・価値判断・ownership の裁定が残らないためである(`cid:requirements-analysis:always-elect` の「権威ある一次証拠によって事実が一意に確定し、その事実を既決 contract へ機械的に適用するだけなら、判断ではなく執行として証拠を記録して自律実行し、選挙を行わない」)。
- **判定の申告と記録**: 本判定は 0 問様式であるため `[Answer]` への先記入は構造的に発生しない(`cid:requirements-analysis:no-election-judgment-gate` の 3 段順序のうち「記入」に当たる行為が無い)。ゲート提示時に conductor が実 HUMAN_TURN の ISO タイムスタンプを §裁定の記録 へ追記する。
- **本ステージからユーザーへ上げる裁定事項**: 1 件(U-2 — §ユーザー裁定へ回付する事項)。これは delivery-planning の質問ではなく、`unit-of-work.md` §未確定事項の引き取り が Bolt 6 の未確定として引き継いだ**仕様裁定**であり、リードタイム制御のため walking-skeleton ゲートで先行提示する。

---

## 裁定の記録

本ステージの戦略設問(ステージ本文 Step 3 の 6 問)に対する回答は、すべて既決規範と承認済み上流からの機械導出である。導出元を 1 問 1 行で示す。

| # | 戦略設問 | 導出した答え | 一次根拠(既決規範 / 承認済み上流) |
| --- | --- | --- | --- |
| S1 | シーケンシング・ヒューリスティックは何か | **walking-skeleton-first を第一原理、risk-first を第二原理とするハイブリッド** | `requirements.md` C-9 + `project.md` Mandated(scope が `self-feature` なら最初の Construction Bolt に walking-skeleton ゲートを維持)+ `org.md` § Walking Skeleton。walking skeleton の該当 Unit は `unit-of-work-dependency.md` §walking skeleton 候補 が実測で `semi-authorization-core` と名指し済み |
| S2 | WSJF 等のスコアリングを使うか | **使わない** | `unit-of-work-story-map.md` §カバレッジ検証 が FR 31/31・NFR 7/7・ゴール 4/4 の全数割当を示し、落とせる Unit が 0 件。落選候補が無い集合に除算スコアを当てても順序が決まらず、形式的な後付けは `org.md` Forbidden の検証劇場と同族になる(`risk-and-sequencing-rationale.md` §採用しなかった枠組み) |
| S3 | Bolt 粒度は何か | **1 Unit = 1 Bolt = 1 PR(7 Bolt)** | `requirements.md` C-8(複数 Unit を単一 PR に束ねない)+ `cid:units-generation:c1` (b)(束ねる方向の禁止は不変、分割は焦点が絞れる範囲で可)+ `team.md` § Way of Working |
| S4 | Bolt は並行実行できるか | **できる。Bolt 1 のみ単独、以降は波 A(4 並行)/ 波 B(2 並行)** | `unit-of-work-dependency.md` §並行開発の機会(非交差集合の実測)+ `cid:requirements-analysis:parallel-bolts`(同時アクティブ builder は最大 4)+ `org.md` § Walking Skeleton(Bolt 1 は単独・ゲート付き) |
| S5 | 外部依存(API・データ・承認・外部チーム引き渡し)はあるか | **外部サービス依存は 0 件。ゲートは PR CI の検査集合と人間の裁定 3 種のみ** | `unit-of-work-dependency.md` §統合点と契約 の逐語「非同期・イベント駆動の統合点は 1 つも無い」+ `components.md` §Reuse Inventory(新設 5 件はすべて repo 内)+ Team Formation SKIP の実測。詳細と反証可能な根拠は `external-dependency-map.md` §外部サービス依存の不在 |
| S6 | 最初に潰すべきリスク項目は何か | **(1) walking skeleton が貫く 7 層の成立 (2) `amadeus-orchestrate.ts` の唯一の非依存交差 (3) 共有台帳 `tests/.coverage-patch-allowlist.json` の行ピン (4) U-2 の仕様裁定リードタイム** | `unit-of-work-dependency.md` §walking skeleton 候補 / §ファイル交差 + `unit-of-work.md` §未確定事項の引き取り(U-6 / U-2)。台帳は `risk-and-sequencing-rationale.md` §リスク台帳 の R-1〜R-14 |

**Bolt 別設問**(ステージ本文 Step 3 後半の 5 問 — 含む Unit / walking skeleton か / Definition of Done / 確信仮説 / 担当 mob)は、質問ではなく成果物生成のループとして `bolt-plan.md` §各 Bolt の定義 と `team-allocation.md` §Bolt ごとの割当 に 7 Bolt ぶん記述した。担当 mob については Team Formation が SKIP のため(実測: `ls .../ideation/team-formation` → `No such file or directory`)、名指しの mob を捏造せず、ソロモードの責務(conductor / builder / reviewer の帽子)として記述している(`cid:approval-handoff:c3`)。

---

## 判断が一意に定まることの確認(選挙不要判定の裏取り)

「複数の妥当解が残っていないか」を、順序決定の分岐点ごとに確認した。

| 分岐点 | 候補 | 一意に定まる根拠 |
| --- | --- | --- |
| Bolt 1 に何を置くか | 7 Unit のいずれか | `unit-of-work-dependency.md` §walking skeleton 候補 が `semi-authorization-core` を実測で名指し、`component-dependency.md` §Unit 分割の示唆 も U-A を候補としている。他 6 Unit は 7 層を貫かない |
| Bolt 1 を単独にするか並行させるか | 単独 / `launch-autonomy-flag` などと並行 | `org.md` § Walking Skeleton の「Bolt 1 は単独・ゲート付きで実行し、残りの Bolt の実行前にユーザーが明示的に承認する」により単独が既決 |
| 波 A に何本入れるか | 最大 4(上限) | 波 A の候補は 5 本(carrier / stop / flag / statusline / advisory)。`cid:requirements-analysis:parallel-bolts` の上限 4 により 1 本を後置する必要がある — 選択の余地ではなく制約 |
| 後置する 1 本をどれにするか | `launch-autonomy-flag` / `advisory-auto-resolution` | `unit-of-work-dependency.md` §ファイル交差 が `amadeus-orchestrate.ts` を「依存辺の無い 2 Unit が同一ファイルを触る唯一の組」と実測しており、後置候補はこの 2 本に絞られる。さらに `semi-docs-revision` が `launch-autonomy-flag` に依存する辺(yaml edge block)を持つため、flag を後置すると docs が第 3 の波へ落ち実行段が 4 段に増える。`advisory-auto-resolution` は yaml edge block のどの `depends_on` にも現れず後置してもクリティカルパスを伸ばさない。**後置対象は一意に定まる** |
| `semi-docs-revision` をどこへ置くか | 波 B / さらに後の独立波 | 依存 3 辺(core / stop / flag)がすべて波 A までに満たされ、波 B の `advisory-auto-resolution` とはファイル交差ゼロ(`docs/` + `stage-protocol.md` 対 `amadeus-advisory-choice.ts` + `amadeus-orchestrate.ts`)。並行させない理由が無い |

いずれの分岐も、価値判断ではなく既決規範・実測トポロジ・上限制約から一意に導かれる。したがって選挙にかける未決事項は残らない。

---

## ユーザー裁定へ回付する事項(1 件)

| # | 事項 | 回付の理由 | 提示時点 |
| --- | --- | --- | --- |
| U-2 | ADR-6 の `selector` に advisory instance を含める設計が生む「無人裁定梯子の実効 3 段への縮退」が実運用で許容できるか。許容できない場合の Option B への変更は **FR-ADV-1 逐語の改訂**に当たる | エスカレーション正準リスト(4)= 仕様変更。`unit-of-work.md` §未確定事項の引き取り U-2 が逐語で「Unit 内で単独決定しない」と定め、`unit-of-work-story-map.md` §Unit を跨ぐ関心 も「Unit 内でも Bolt 内でも単独決定しない」と重ねている | **Bolt 1 の walking-skeleton ゲート**で先行提示する。裁定のリードタイムを Bolt 6(波 B)の着手クリティカルパスから外すため(`risk-and-sequencing-rationale.md` R-1、`external-dependency-map.md` H-2) |

---

## 完全性確認

- 空の `[Answer]` タグ: **なし**(0 問様式のため `[Answer]` 行そのものが 0 件)
- 未解決の delivery-planning 判断: **なし**(§判断が一意に定まることの確認 の 5 分岐すべてが一意)
- 後続ステージ・後続 Bolt へ委ねる判断: `unit-of-work.md` §未確定事項の引き取り の 11 件(U-1〜U-7 + A〜D)。うち本ステージで扱うのは順序制御に関わる U-2(回付)と U-6(allowlist 行ピン — 4 Bolt が自 PR で remap する運用として `bolt-plan.md` §波の実行規律 に配置)であり、残る 9 件は functional-design / nfr-design / code-generation の引き取り先が確定済みである
- 上流成果物との矛盾: **なし**(DAG 適合の照合表は `bolt-plan.md` §DAG 適合の検証。トポロジ順からの逸脱 1 件は申告済み)
