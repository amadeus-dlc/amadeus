# ノルム改定 DRAFT — unit docs-norms(R-2 / Q16)

> **これは案であって適用ではない。** team.md の保守則(`cid:requirements-analysis:norm-consistency-review`)
> 「ノルム変更は溜めず、persist のたび origin/main 起点の単独ブランチで PR を作り独立レビューを経て
> マージする(マージは人間承認)」に従い、本 unit は `memory/{org,team,project}.md` を**編集しない**。
> 改定は本ファイルの案を種として、独立したノルム PR で発行する。
>
> 測定 ref: worktree `bolt-docs-norms`、base `swarm-int-rfc0001 @040196a11`。
> 現行文面は同 tree の `amadeus/spaces/default/memory/` から逐語転記した(行番号併記)。
> 各案の根拠は同ディレクトリの `mode-matrix.md`(実装 file:line 付き)。

---

## D-1: project.md:16 — semi 梯子ルーティングを裁定順序へ更新

**現行(逐語)**

> - semi/full の Intent autonomy が有効な間、§13 学習選定やステージ内の判断質問は人間へ直接提示せず `amadeus-bolt decide-question` の梯子で裁定し、fail-closed の結果のみ人間へ回す。常任グラントとは別機構であり適用境界を混同しない `<!-- cid:scope-definition:c1-semi-ladder-routing -->`

**問題** — 「fail-closed の結果のみ人間へ回す」は、着地した実装で `human-required` が
fail(失敗)ではなく**第一級の終端**になったこととずれる。実装では (a) ユーザー専権の裁定点は
導出前に確定し(裁定順序 1)、(b) 導出が `contested` / `none` で終われば裁定は人間へ渡り
(裁定順序 3)、(c) その行き先は mode ではなく**セッションの対話性**が決める。

**改定案**

> - semi/full の Intent autonomy が有効な間、§13 学習選定やステージ内の判断質問は人間へ直接提示せず `amadeus-bolt decide-question` の梯子で裁定する。梯子の終端は3つあり、区別して扱う: (1) `decided` — 採用して続行 (2) `human-required` — ユーザー専権の裁定点、または導出が `contested` / `none` で終わった場合。失敗ではなく裁定の差戻しであり、候補と一意でなかった事由を**そのまま**提示する(再導出しない)。対話セッションなら人間へ、非対話セッションならエンジンの waiting 終端を中継して停止する (3) `parked` / `conflict` / `aborted` — fail-closed。常任グラントとは別機構であり適用境界を混同しない `<!-- cid:scope-definition:c1-semi-ladder-routing -->`

---

## D-2: team.md:27 — ソロ選挙の自動発動条件を mode 導出へ

**現行(逐語、当該文のみ)**

> 自動発動は opt-in で、階層設定の `solo-election.trigger.mode` が `auto` のときだけ (a) 設計逸脱 (b) ブロッカー (c) §13 学習選定 を `open --trigger auto` で発動し、それ以外はユーザーが明示したときのみ。仕様変更と正準リスト事項は設定値によらず選挙対象外(ユーザー専権)。

**問題** — `solo-election.trigger.mode` は RFC-0001 ADR-8 で**廃止済み**。現行実装では
`deriveSoloElectionTrigger(mode)` が Intent Autonomy Mode から導出し(`none` → `manual`、
`semi` / `full` → `auto`)、旧キーが残置された workspace は無視されず config 解決が loud fail する。
現行文面が指す設定項目はもう存在しないため、この規則は文面どおりには適用できない。

**改定案**

> 自動発動は Intent Autonomy Mode から導出する。`semi` / `full` は `auto`、`none` は `manual` を導出し(旧 `solo-election.trigger.mode` 設定は廃止 — 残置された旧キーは無視されず config 解決が loud fail する)、`auto` を導出するときだけ (a) 設計逸脱 (b) ブロッカー (c) §13 学習選定 を `open --trigger auto` で発動し、それ以外はユーザーが明示したときのみ。仕様変更と正準リスト事項は mode によらず選挙対象外(ユーザー専権)。

---

## D-3: team.md:50 — §13 学習選定の「0件」を機械確認へ

**現行(逐語)**

> - §13 学習選定は選挙にかける。候補一覧(採用案+不採用理由)または「0件でよいか」を諮り、裁定成立後に記録する。ゲート報告には候補列挙か明示の「0件」を同梱する `<!-- cid:requirements-analysis:learnings-election -->`

**問題** — 「0件でよいか」を選挙にかける運用は、RFC-0001 の実測(0 件確認選挙 79 件中 hold 1)が
情報量ほぼゼロと示した面。実装は `amadeus-learnings.ts confirm-zero` を追加し、
`candidates.length === 0` **かつ** surface JSON 自身の digest が自分の candidates と
parked_open_questions から再計算できる場合にのみ receipt を発行する(`LEARNING_ZERO_CONFIRMED`)。
digest 不一致は `not-zero` を返して何も emit しない。AI の自己申告で儀式が消える構造は塞がれている。

**改定案**

> - §13 学習選定は選挙にかける。ただし候補 0 件は選挙にかけず `amadeus-learnings.ts confirm-zero` の digest 束縛 receipt で確定する — 空の候補列と、その surface 自身から再計算できる digest の両方が揃ったときにのみ receipt が発行され、`not-zero` なら通常の選定へ戻る。候補が 1 件以上あるときは従来どおり候補一覧(採用案+不採用理由)を諮り、裁定成立後に記録する。ゲート報告には候補列挙か、`confirm-zero` の receipt(surfaceDigest 併記)を同梱する `<!-- cid:requirements-analysis:learnings-election -->`

---

## D-4: team.md:78 / 97 — マージ委任の記録面を明示

**現行(逐語、Forbidden 節)**

> - NEVER AI が PR のマージを自発的に実行しない。マージはその PR について人間の明示承認を得てから実行する。過去の承認や類似 PR の承認をもって次のマージの承認と見なさない `<!-- cid:requirements-analysis:no-ai-merge -->`

**問題** — 禁止則そのものは実装と一致しており(マージに mode arm は存在しない)、**変更不要**。
ただし Learnings Inbox の常任マージ承認(`cid:ci-pipeline:standing-merge-approval-ci-green`)が
条件付き委任を導入したのに対し、その**証跡の残し方**がノルム側に無い。実装は
`amadeus-merge-provenance record` が `DELEGATED_MERGE_RECORDED` を emit し、standing ruling 参照・
CI conclusion・収束 digest を保持する(git / GitHub には触れず、エビデンスは呼び出し側の申告を
そのまま受け取る record-only ツール)。

**改定案(Inbox の常任承認 bullet への追記。Forbidden 節は無改定)**

> …(現行文のまま)…。常任承認でマージした場合は、その都度 `amadeus-merge-provenance record --standing-ruling-ref <cid> --ci-conclusion <result> --converged-digest <ref>` を実行し `DELEGATED_MERGE_RECORDED` を残す。この記録は委任の**事後証跡**であり委任の根拠ではない(条件充足の判定はノルム側にあり、ツールはエビデンスを検証しない)。次回蒸留で本則へ統合する際、この記録義務も併せて本文へ移す。

---

## D-5: org.md:21 — walking-skeleton の発火条件を Skeleton Stance へ

**現行(逐語)**

> スコープがグリーンフィールド(`mvp`、`enterprise`、`feature`、`poc`、`workshop`、`infra`)の場合、常に walking-skeleton Bolt を**最初に**実行する。Bolt 1 は単独・ゲート付きで実行し、残りの Bolt の実行前にユーザーが明示的に承認する。
>
> スコープが既存コードベースへのインクリメンタルな作業(`bugfix`、`refactor`、`security-patch`)の場合は**スケルトンのセレモニーをスキップ**する。最初の Bolt も他の Bolt と同様に実行する — ブートストラップすべきものが存在しないため。

**問題** — 意味は実装と一致するが、**判定の所在**がノルム文面ではスコープ名の列挙になっている。
実装では判定が `Skeleton Stance`(record の runtime フィールド。`on` / `off` / 未設定・
`scope-dependent` は正準の greenfield スコープ集合へ解決)に一本化され、ceremony が発火するか
どうかは `interactionKind` の一箇所だけが決める。スコープ名を2箇所で列挙し続けると、
スコープ集合が動いたときにノルムと実装がずれる。

**改定案**

> walking-skeleton ceremony の発火は record の `Skeleton Stance` が決める。`on` なら Bolt 1 を単独・ゲート付きで実行し、残りの Bolt の実行前にユーザーが明示的に承認する。`off` なら**セレモニーをスキップ**し、最初の Bolt も他の Bolt と同様に実行する — ブートストラップすべきものが存在しないため。フィールドが未設定または `scope-dependent` の場合は、正準のグリーンフィールドスコープ集合(実装が保持)から解決する。読めない record は人間側(`on` 相当)へ倒す。スコープ名の列挙をノルム側に二重化しない。

---

## D-6: team.md 正準リスト / P4 — 現行維持(改定不要)の確認

- **正準リスト**(`cid:requirements-analysis:escalation-canonical`)は改定不要。実装の裁定順序 1
  (`humanReservedDecision`)が正準リストの機械化面であり、文面と一致する。
- **P4「不可逆・外部境界には人間を置く」** も改定不要。park の mode arm 撤去は「人間を置く」の
  緩和ではなく、**止まれない状態の解消**(止まる自由の回復)であって P4 と同方向。
- **P1「判断は独立検証された合意で行う」** も改定不要。裁定順序 3 が「決められないなら進まない」を
  機械化しており、P1 の「迷えば選挙に倒す」と整合する。

この3件は「検討したうえで無改定」であることを記録するために挙げる — ノルム PR では
改定対象に含めない。

---

## ノルム PR 発行時の申し送り

1. D-1 〜 D-5 を1本の PR に束ねてよいか、レイヤーごと(org / team / project)に分けるかは
   persist 規律の解釈事項。迷えばユーザーへエスカレーションする。
2. D-2 は**現行文面が指す設定項目が実在しない**ため、他の案より緊急度が高い(適用不能な規則が
   ノルムに残っている状態)。
3. `mode-matrix.md` 行 17 に記した RFC ToBe と実装の不一致(advisory 延期の自動裁定)は
   ノルム改定案ではなく**実装側の裁定事項**として別に扱う。本ファイルでは案を出さない。
