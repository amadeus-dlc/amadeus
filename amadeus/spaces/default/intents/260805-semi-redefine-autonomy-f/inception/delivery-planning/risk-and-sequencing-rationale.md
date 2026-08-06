# Risk and Sequencing Rationale — semi 再定義と `--autonomy` 起動宣言(#2253)

上流入力(consumes 全数): requirements.md, components.md, unit-of-work.md, unit-of-work-dependency.md, unit-of-work-story-map.md, stories.md(不在), mockups(不在), team-practices(= `amadeus/spaces/default/memory/team.md`)

本文書は上記を次のとおり実参照する。`unit-of-work-dependency.md` の yaml edge block・辺の強度注記(hard / soft)・§ファイル交差・§walking skeleton 候補 を順序制約と逸脱判定の一次根拠とし(§DAG 制約と選んだ経路・§トポロジ順からの逸脱)、`unit-of-work.md` の §未確定事項の引き取り(U-1〜U-7 + A〜D の計 11 件)をリスク台帳の母集合とし(§リスク台帳)、`requirements.md` の C-9(walking-skeleton ゲート)/ C-7(後方互換なし)/ NFR-1(落ちる実証)/ A-3・A-4(未検証の前提)をリスクの根拠とし(§リスク台帳)、`components.md` の推定行数(662 行)と複雑度を job size の代理指標とし(§採用しなかった枠組み)、`unit-of-work-story-map.md` の §ストーリー相当の単位(ゴール G1〜G4)を価値の帰属先とする(§価値と順序の関係)。

**`stories.md` と `mockups` は存在しない**(user-stories / rough-mockups / refined-mockups が SKIP。実測: `ls .../inception/user-stories` → `No such file or directory`)。価値順の議論は `unit-of-work-story-map.md` が定義したゴール G1〜G4 を単位として行い、ストーリーポイント換算は行わない。`team-practices`(`team.md`)からは `cid:requirements-analysis:parallel-bolts`(builder 上限 4)・`cid:code-generation:c6`(交差判定は静的目録でなく実 diff で再評価)・`cid:code-generation:unverified-raid-is-live-risk`(RAID に「未実測」と書いた項目はリスクが残っている)を採る。

測定 ref: worktree HEAD `5ca9b33e5d313a040f8035709f2ccc22fdcc0cb9`(`git rev-parse HEAD` の出力からの転記)。上流の測定 ref `d5ca7b4c1` との同値性は `git diff --stat d5ca7b4c1 HEAD -- packages/framework/core/ tests/ docs/` の**空出力**で確認済み。

---

## 採用した順序決定の枠組み

**walking-skeleton-first(Cockburn)を第一原理、risk-first を第二原理とするハイブリッド**である。

1. **walking-skeleton-first** — `requirements.md` C-9 と `project.md` Mandated(「active scope が `self-feature` なら、既存コードを変更する場合も最初の Construction Bolt に walking-skeleton gate を維持する」)により、この選択は裁量ではなく規範である。該当 Unit は `unit-of-work-dependency.md` §walking skeleton 候補 が実測で名指した `semi-authorization-core` であり、S5 → S3 → S1 → S2 → S3 → S4 → S11 の 7 層を 1 スライスで貫く。
2. **risk-first** — skeleton 着地後の 6 Bolt は「未確定事項の残量」と「ファイル交差の解消順」で並べる。価値順(G1〜G4 のどれを先に出すか)では並べない。理由は §価値と順序の関係。
3. **並行機会最大化(従)** — 1 と 2 が許す範囲で、`unit-of-work-dependency.md` §並行開発の機会 が示す非交差集合を波として束ねる。

### 採用しなかった枠組み

- **WSJF / CD3(Reinertsen)** — 採らない。WSJF は「どれを落とすか・どれを後回しにするか」の価値判断に効く枠組みだが、本 intent の 7 Unit は**すべて完了条件の必須構成要素**である(`unit-of-work-story-map.md` §カバレッジ検証 が FR 31 / 31・NFR 7 / 7・ゴール 4 / 4 の全数割当を示し、落とせる Unit が 0 件)。分母の job size(662 行の配分)で割っても、分子側に落選候補が無いためスコアが順序を決めない。スコアを形式的に計算して順序の後付け根拠にすることは、`org.md` Forbidden の検証劇場(結果を実行から導かない構築物)と同族の空文になる。
- **value-first** — 採らない。最大価値のゴールは G1(起動の一手で走行水準を宣言 = `launch-autonomy-flag`)だが、これを先頭に置くと walking-skeleton ゲートの規範(C-9)に反する。
- **単純なトポロジカル順** — 採らない。DAG は複数の妥当な順序を許すのみで 1 本に定めない(`unit-of-work-dependency.md` §並行開発の機会 の逐語「どれを選ぶかは 2.8 の経済判断であり、本文書は選ばない」)。

---

## DAG 制約と選んだ経路

`unit-of-work-dependency.md` の yaml edge block が定める辺は 6 本(hard 2 / soft 4)であり、根は 3 つ(`semi-authorization-core` / `launch-autonomy-flag` / `autonomy-statusline`)、合流は 1 つ(`semi-docs-revision`、入次数 3)である。

選んだ経路は次の 3 段である(`bolt-plan.md` §波の編成 と同一):

```
Bolt 1 (semi-authorization-core) → [walking-skeleton ゲート] →
  波 A { Bolt 2 semi-policy-carrier, Bolt 3 stop-question-carveout,
         Bolt 4 launch-autonomy-flag, Bolt 5 autonomy-statusline } →
  波 B { Bolt 6 advisory-auto-resolution, Bolt 7 semi-docs-revision }
```

この経路は 6 本の辺をすべて満たす(照合表は `bolt-plan.md` §DAG 適合の検証)。**hard 辺 2 本**(carrier → core、advisory → core)は型・コンパイル結合であり、順序違反は即座にビルド不能を招く — いずれも Bolt 1 着地後に置いた。**soft 辺 4 本**は意味論的依存であり、`unit-of-work-dependency.md` §辺の強度の注記 が「delivery-planning は soft 辺を並行機会として扱ってよい」と明示している。本計画はこの許可を**限定的にのみ**使った: `stop-question-carveout`(soft)は波 A で他 3 Bolt と並行させたが、Bolt 1 との並行はさせていない(walking-skeleton ゲートが優先するため)。`semi-docs-revision` の 3 本の soft 辺も並行化せず、記述対象が全数着地してから書く順序を保った — 記述面は「着地済みの実態を書く」ことが正しさの条件であり、並行させると FR-DOC-1 の受け入れ基準(旧定義 0 件)を判定する対象が動く。

---

## トポロジ順からの逸脱(申告と正当化)

**逸脱は 1 件のみである。**

### 逸脱 — `advisory-auto-resolution` を波 A ではなく波 B へ後置した

- **DAG 上の可能性**: `advisory-auto-resolution` の依存は `semi-authorization-core` 1 本のみであり、Bolt 1 着地後の波 A に置ける。すなわち本計画は DAG が許す最早の位置を選んでいない。
- **後置の根拠 (1) ファイル交差**: `unit-of-work-dependency.md` §ファイル交差 は `core/tools/amadeus-orchestrate.ts` (5544 行) について逐語で「**依存辺の無い 2 Unit が同一ファイルを触る唯一の組**。領域は離れている(`:781-800` と `:1044-1074`)ため textual conflict は起きにくいが、後着側は base 前進後に実 diff で再評価し、`tests/.coverage-patch-allowlist.json` の行ピンを機械 remap する」と定める。両者を同一波で並行させると「後着側」が実行時まで決まらず、実 diff 再評価と remap を**並行下で・base が動きながら**行うことになる。波を分ければ後着側は Bolt 6 に一意に確定し、再評価と remap を確定した base に対して 1 回だけ行えばよい。両領域の実在は HEAD で再確認した(`packages/framework/core/tools/amadeus-orchestrate.ts:781` verbatim `function applyPendingAdvisoryGuard(directive: Directive): Directive {` / `:1044` verbatim `    if (a === "--resume") {`)。
- **後置の根拠 (2) builder 上限**: 波 A に加えると同時アクティブ builder が 5 になり、`cid:requirements-analysis:parallel-bolts` の上限 4 を超える。上限内に収めるには波 A から 1 本外す必要があり、外す候補は「後置しても他 Bolt をブロックしない Unit」に限られる。
- **後置候補の一意性**: 交差する 2 Unit のうち `launch-autonomy-flag` を後置する案は採れない。`semi-docs-revision` が `launch-autonomy-flag` に依存する辺(FR-DOC-2 の `stage-protocol.md:125` 同期)を持つため、flag を波 B へ送ると docs は第 3 の波へ落ち、実行段が 4 段に増える。`advisory-auto-resolution` は**どの Unit からも依存されない**(`unit-of-work-dependency.md` の yaml edge block で `advisory-auto-resolution` は他の `depends_on` に一度も現れない)ため、後置してもクリティカルパスを伸ばさない。したがって後置対象は一意に定まる。
- **後置が生む副作用リスクと対処**: `advisory-auto-resolution` は未確定事項を 4 件(U-2 / U-3 / U-7 / 引き取り項目 C)抱える最多の Unit であり、risk-first の原則だけを見れば早い方がよい。このうちリードタイムが不定なのは **U-2(ユーザー裁定事項)** のみである。対処として U-2 を **Bolt 1 の walking-skeleton ゲートで先行提示**し、裁定の待ち時間を Bolt 6 の着手クリティカルパスから外す(`bolt-plan.md` §先行して起票する裁定事項)。U-3 / U-7 / C は実装時実測で閉じる項目であり、後置による悪化は無い。

---

## Bolt 内順序をリスク制御として使った箇所

`cid:delivery-planning:intra-bolt-order-as-risk-control` に従い、**順序が作業の都合ではなくリスクの窓を消すために選ばれている**箇所を明示する(具体的な並びは `bolt-plan.md` §Bolt 内の実行順序)。

| Bolt | 消している窓 | 窓を放置した場合に起きること |
| --- | --- | --- |
| Bolt 1 / Bolt 3 | 旧仕様ピン(`t431:307-313` / `t121:1138-1150`)の反転を挙動確定**後**に置く | 反転を先に置くと、挙動が着地するまで CI が赤のまま残り、その間 PR がマージ不能になる。`unit-of-work.md` §テスト・ピンの所属 が「旧仕様ピンは挙動変更と同一の変更でしか green を保てない」と実測している |
| Bolt 3 | 落ちる実証(述語を無条件共有へ戻すと赤)を FR-PIN-2 の反転**前**に置く | 反転後に実証すると、green の原因が「carve-out が効いた」のか「ピンを反転した」のか区別できない。実証の対象を取り違えると FR-STOP-1 受け入れ基準 (2) が空文化する |
| Bolt 6 | base 前進後の実 diff 再評価と allowlist 機械 remap を実装**前**に置く | remap を後回しにすると、Bolt 4 が `:1044-1074` へ挿入した行により allowlist の行ピンが別の測定可能行へ**無音転位**し、stale 検査にも映らないまま patch gate の判定を汚す(`cid:code-generation:allowlist-line-pin-stale` の追補、`cid:code-generation:cg-allowlist-straddle-swell`) |

---

## リスク台帳

`unit-of-work.md` §未確定事項の引き取り の 11 件(U-1〜U-7 + A〜D)と、`requirements.md` の未検証前提(A-3 / A-4)を母集合とする。**`cid:code-generation:unverified-raid-is-live-risk` に従い、「未実測」と書いた項目はリスクが残っているものとして扱う** — 小さいとは書かない。

| # | リスク | 影響する Bolt | 深刻度 | 対処 / 閉包条件 |
| --- | --- | --- | --- | --- |
| R-1 | **U-2**: ADR-6 の selector に advisory instance を含める設計が生む「梯子 3 段への縮退」が実運用で許容できない可能性。Option B への変更は FR-ADV-1 逐語の改訂であり、エスカレーション正準リスト(4)によりユーザー裁定を要する | Bolt 6 | 高(裁定次第で FR 改訂) | **Bolt 1 のゲートで先行提示**し、裁定リードタイムを Bolt 6 の着手前に消化する。Bolt 内でも Bolt 間でも単独決定しない |
| R-2 | **ファイル交差**: `amadeus-orchestrate.ts` を Bolt 4(`:1044-1074`)と Bolt 6(`:781-800`)が触る | Bolt 4 / 6 | 中 | 波を分けて後着側を Bolt 6 に一意化。Bolt 6 の着手手順 (0) で実 diff 再評価(静的目録でなく実 diff — `cid:code-generation:c6`)+ allowlist 機械 remap + span 検査 |
| R-3 | **共有台帳**: `tests/.coverage-patch-allowlist.json` を Bolt 1 / 3 / 4 / 6 の 4 本が触る | 4 Bolt | 中 | 挿入位置を分散(`cid:code-generation:shared-ledger-insert-collision`)。各 PR で機械 remap + straddle 検査。波内で後にマージされる側は base 前進後にやり直す |
| R-4 | **A-3(未検証)**: semi 関与テスト 13 ファイルの現況グリーン性が未実行 | Bolt 1(最初に踏む) | 中 | Bolt 1 の着手時にベースラインを実測し、赤があれば自変更由来か既存かを未改変 base との**失敗集合の差**で切り分ける(`cid:code-generation:c4-260803-state-integrity`) |
| R-5 | **A-4(未検証)**: semi の phase 内 auto-approve が `phase_boundary` directive を受け取らないことは実 run 未検証 | Bolt 1 | 中 | FR-LAD-5 の受け入れ基準(semi + `phase-boundary` の stage-gate が `human-required`)が落ちる実証込みでこの保証を初めて固定する |
| R-6 | **U-3**: `withAuditLock` の再入可否。C16 を `guardAdvisoryChoices` の外側から呼ぶ配置でロック区間が重ならないことが未実測 | Bolt 6 | 中 | 実装時実測。重なる場合は C16 の呼び出し位置を再検討する(設計変更に及ぶ場合は逸脱として停止・裁定) |
| R-7 | **U-7**: `run_required: true` を無人経路が `run-now` で解決した後、`formalCheckRoute` の command を誰が実行するか未確定 | Bolt 6 | 中 | FR-ADV-5 の射程注記と併せて実装時に確定 |
| R-8 | **U-1**: 非 full の `confirmedDisplayDigest` 照合点を `planHumanAutonomyCommand` の分岐へ加えるか未確定 | Bolt 2 | 低 | FR-POL-2 の受け入れ基準を満たす最小形を functional-design で決める |
| R-9 | **U-4 / D**: `semi-mode-gate` / `MODE_REQUIRES_HUMAN` / `full-grant-required` を assert する既存テストの全数が未棚卸し | Bolt 1 | 中 | 識別子と展開後リテラルの 2 キーで grep(`cid:application-design:dual-key-consumer-inventory`)。片キーの棚卸しで着手しない |
| R-10 | **U-5**: stop hook 述語の最終命名と `allowlist:5268` / `t147:723` の同期 | Bolt 3 | 低 | functional-design で命名確定、同 PR で 2 箇所同期 |
| R-11 | **引き取り項目 A**: `docs/` 22 ファイルの 1 ファイルあたり改訂行数が未実測(規模見積りに数えていない) | Bolt 7 | 低 | functional-design で実測。見積り超過が判明した場合は Bolt 7 の内部分割ではなく規模の申告で扱う(C-8 により束ねも分割も PR 粒度を変えない) |
| R-12 | **引き取り項目 C**: `quality-waiver` の `PROHIBITED_EFFECTS` 収載に ADR-11 の従機構が全面依存 | Bolt 6 | 中 | 収載を assert するテストを置き、崩れると赤になることを実証する |
| R-13 | **C-7 の破り**: 旧 semi 挙動の互換シム・二重実装・skip による旧ピン温存が混入する | 全 Bolt | 高(混入時) | reviewer の標準観点に「要求されていない後方互換レイヤーの混入」を含める(`org.md` Mandated)。Bolt 1 では `semi-mode-gate` の削除を DoD に明記 |
| R-14 | **NFR-1 の空文化**: 落ちる実証が「注入したまま報告」「型消去される面へ注入」等で無効化される | 5 ゲートを持つ 5 Bolt | 中 | 注入 → 赤の実測 → 復元 → 残渣ゼロ確認を不可分の 1 セットで行い(`cid:code-generation:falling-proof-injection-one-set`)、実行時に消費される行へ注入する(`cid:code-generation:inject-runtime-consumed-lines`) |

---

## 価値と順序の関係

`unit-of-work-story-map.md` §ストーリー相当の単位 の 4 ゴールが、どの Bolt の着地で利用者に届くかを示す。順序は価値順ではないため、**価値の到達が遅れるゴールを明示**する。

| ゴール | 届く Bolt | 順序による遅延 |
| --- | --- | --- |
| G2(「全部止まる」と「全部任せる」の中間点) | Bolt 1(1〜4 段での解決)+ Bolt 2(0 段目)+ Bolt 3(質問で止まらない) | 最速。walking skeleton がこのゴールの最小実現そのものである |
| G3(任せた結果を後から検収できる) | Bolt 1 | 最速。既存 unreviewed queue が無改訂で受け皿になる |
| G1(起動の一手で走行水準を宣言) | Bolt 4(波 A) | walking-skeleton ゲート 1 段ぶん遅れる。DAG 上は Bolt 1 と並行できるが `org.md` の規範が優先する |
| G4(隠れた関門で headless 走行が切れない) | Bolt 6(波 B) | 2 段遅れる。**本計画で最も遅い価値到達**であり、これがトポロジ順からの逸脱が払うコストである。DAG 上は 1 段(波 A)で届けられた |

G4 の遅延を受け入れる判断の根拠は §トポロジ順からの逸脱 のとおり: 早出しの利得(1 段ぶん)より、`amadeus-orchestrate.ts` の交差を並行下で解消するリスクと builder 上限超過のコストが上回る。加えて G4 は「pending advisory がある場合にのみ発現する」条件付きの価値であり、G2 / G3 のように毎走行で効く価値ではない。

---

## 順序を変えるべき事象(再計画のトリガ)

計画は生き物であり、次の事象が観測されたら本文書の順序を再評価する。

1. **Bolt 1 の walking-skeleton ゲートで承認が得られない** — 波 A を起動しない。設計面の差し戻しなら application-design / functional-design へ戻る。
2. **R-1(U-2)がユーザー裁定で Option B(FR-ADV-1 逐語の改訂)になった** — Bolt 6 の Definition of Done が変わるため、要件改訂を経てから再計画する。
3. **R-2 の実 diff 再評価で `amadeus-orchestrate.ts` の領域が実際に重なっていた** — Bolt 4 と Bolt 6 の直列化は既に成立しているため順序変更は不要だが、交差範囲を Bolt 6 の着手前に記録する。
4. **波 A のいずれかの Bolt が想定を超えて長引き、他 3 本が完了して手空きになった** — 手空きは異常ではない(`cid:requirements-analysis:rate-limit-idle-allowance`)。上限枠を埋めるために波 B を前倒しする判断は、R-2 の交差制御を壊すため**取らない**。
