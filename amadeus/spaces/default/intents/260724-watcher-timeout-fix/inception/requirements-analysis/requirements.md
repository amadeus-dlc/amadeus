# Requirements — 260724-watcher-timeout-fix(Issue #1449)

上流入力(consumes 全数): business-overview.md, architecture.md, code-structure.md

## Intent 分析

Issue #1449 の実測により、`packages/framework/core/tools/team-up.sh` の `verify_watchers_armed`(:1139-1178、commit `0d24c6f93` / #1421 で新規追加、#1384対応)が、1メンバーでも agmsg watcher が unarmed だと、既定値 `WATCHER_READY_TIMEOUT=90`秒 × (`WATCHER_RESEND_MAX=2`+1)=最大270秒(4.5分)、`mux_attach`(ユーザーが実際にteamペインへアタッチできる時点)をブロックすることが判明した。ユーザーはこれを「team-up.sh 起動が直近で大幅に遅くなった」と体感していた。

reverse-engineering 段階の実測(`amadeus/spaces/default/codekb/amadeus/architecture.md`、`code-quality-assessment.md`、`re-scans/260724-watcher-timeout-fix.md` 参照)により、根本原因は実装逸脱ではなく、元intent #1384(`260722-teamup-prompt-race`)requirements.md FR-3 [e4] 留保が明示的に予見し先送りしていた設計トレードオフの顕在化であることが確認されている。ユーザーが達成したいのは、agmsg watcher armingの検証・再送というQ機能自体(#1384で導入済み、正しく動作している)を保ったまま、1メンバーの unarming が全体の起動体感を過大に劣化させない状態である。

## 機能要件

### FR-1: worst-case ブロッキング時間の短縮
- 現状: 1メンバーでもwatcher unarmedだと最大270秒(90秒×3ラウンド)ブロックする。
- 要求(E-WTFRA1 選挙裁定 = C案、choice3=4票/D案1票、GoA全票2): `verify_watchers_armed`(team-up.sh:1139-1178)の再送ループ(現状 `max_attempts = WATCHER_RESEND_MAX + 1 = 3` ラウンド、team-up.sh:1141)を縮小し、agmsg `spawn.sh`(:576-588 の単発待ち)と対称な「単発 `WATCHER_READY_TIMEOUT` 秒待ち → **1回だけ**再送 → 再度待ち」(合計 **2ラウンド**)の構造へ縮小する。これにより worst-case を 270秒(3ラウンド)から **180秒(2ラウンド)** へ確定する。純単発(1ラウンド=90秒)にしない理由は、#1384(TUI cold-start での prompt 脱落)からの回復に最低1回の再送が必要なため(留保 e3/e5/e2、NFR-1b)。
- **AC-1a**: 全メンバー unarmed の場合の worst-case 待機が、既定値(`WATCHER_READY_TIMEOUT=90`)で **180秒(2ラウンド)以下** になること(現状270秒=3ラウンドからの縮小。短縮値でのタイミング実測で検証 — NFR-1)。
- **AC-1b**: `WATCHER_READY_TIMEOUT=90` の spawn.sh:132 接地(NFR-2)を維持すること。per-wait のタイムアウト値自体は変更せず、再送回数(ラウンド数)のみを 3→2 へ減らす。
- **AC-1c**: exit code分岐(0=全員armed/非ゼロ=1名以上unarmed、team-up.sh:1462)、`mux_attach` 前に検証を完了させる実装順序(FR-3、元#1384 FR-5 [e5]、team-up.sh:1439-1442)、no-silent-success(検証劇場 Forbidden)の3制約を保持すること。

### FR-2: 正常系のコスト維持
- 全メンバーが起動直後にarmedになる正常系では、修正後も検証コストがほぼゼロ(実測ベースライン: 59.1ms、7メンバー構成)であること。回帰させない。

### FR-3: 既存契約の保持
- exit code契約(0=全員armed/非ゼロ=1名以上unarmed)を保持する。`team-up.sh` 呼び出し元・CI等がこのexit codeに依存していないか確認が必要(該当箇所の棚卸しは design 段階で実施)。
- no-silent-success(検証劇場 Forbidden): unarmedのまま黙って成功扱いにしない。

### FR-4: リカバリガイダンスの保持
- 現行の `verify_watchers_armed` は unarmed メンバーを名指しし、手動リカバリ手順(`/agmsg mode monitor` の再送方法)をstderrへ出力する(:1174-1176)。この落ちる実証・リカバリガイダンスは維持する。

## 非機能要件

### NFR-1: タイミングの実測検証可能性(E-WTFRA2 選挙裁定 = A案、5-0で成立)
- 修正はタイミングseam(`WATCHER_READY_TIMEOUT`/`WATCHER_RESEND_MAX` の環境変数オーバーライド、既存で実装済み)を使い、短縮値での実測タイミング検証を行う。実90秒統合テストは追加しない。
- **NFR-1a(落ちる実証、複数票留保・必須)**: org.md Mandated の「落ちる実証」に従い、既存シームで縮小前(270相当)の赤 → 縮小後の緑 を実測する。C案実装時もこれを必須とする(D案の妥当部分をC実装へ畳み込む)。比較型ゲートでないため、注入面はテストが実際に読む `verify_watchers_armed` のロジックに行う。
- **NFR-1b(#1384 回復力の保持、複数票留保・必須)**: #1384(prompt脱落回復力)が再送ラウンド 3→2(=再送 2回→1回)に減っても保たれるか、design/実装段で確認する。再送1回でも「初回prompt脱落 → 1回の再送で回復」の経路が機能することをテストで実証する(既存テスト `a member armed only after the re-send passes` のシナリオが再送1回設定でも green であること)。
- **NFR-1c(90デフォルトの定数 assert、E-WTFRA2 e5 留保)**: `WATCHER_READY_TIMEOUT` の既定値が 90 であること(env 未設定時に 90 に解決されること、team-up.sh:101)を、B の重い実待機テストではなく軽量な定数 assert で別途担保する。既存シームのタイミング検証(短縮値)とは別に、デフォルト解決の1点を確認する。

### NFR-2: 定数の根拠保持
- `WATCHER_READY_TIMEOUT=90` は agmsg `spawn.sh:132` に接地された値であり、変更する場合はこの接地根拠の再確立(または意図的な逸脱の明記)が必要。

## 制約

- `packages/framework/core/` が正本、`dist/<harness>/` は生成物。修正は正本編集→`bun scripts/package.ts` で dist 再生成→`bun run promote:self` の順で行う(project.md Way of Working)。
- 既存テスト `tests/integration/t-team-up-watcher-arming.test.ts`(7テスト、フィクスチャで `WATCHER_READY_TIMEOUT: "0"` を使用)との整合を維持し、必要なら拡張する。
- amadeus-bugfix スコープにつき walking-skeleton セレモニーはスキップ(既存コードへのインクリメンタル修正、team.md Walking Skeleton)。

## 前提

- 実測(scenario B: timeout=5s×3ラウンドで理論値15000ms・実測15959ms、+6.4%)により、`verify_watchers_armed` の待機時間はほぼ線形にスケールすることを確認済み。本番既定値(90秒)への外挿は理論値からの比例計算であり、90秒設定での直接実測は行っていない(実チーム起動を避けるため)。

## スコープ外

- agmsg 側(`~/.agents/skills/agmsg/scripts/spawn.sh`)の変更は対象外。今回は `team-up.sh` 側の修正のみを扱う。
- watcher arming の検証・再送という機能自体(#1384の要件)の撤去は対象外。

## 選挙裁定の記録

選挙は leader worktree(`.../runs/20260724-181510-1d8e/leader`)の amadeus-election CLI で実施された。record は leader worktree 配下に実在するが、本 engineer-1 worktree にはまだ未同期(record sync は leader が後追いする旨 agmsg 通知あり、2026-07-24T12:29:34Z)。以下の票数・GoA・留保は leader worktree の record.md をリードオンリー直読(election-protocol の読み取り参照)で verbatim 照合した(cid:requirements-analysis:agmsg-git-evidence-split — agmsg 出典の裁定通知と、直読で検証可能な record.md の事実を分離)。

- **E-WTFRA1(修正方針)**: 裁定 **C案**(choice3=**4票**、choice4=D案 **1票**、他0)。**GoA 内訳: 1x0 2x5**(成立5票すべて GoA2 = 留保付き合意)。再送ループ撤去→agmsg spawn.sh 対称の「単発+**1回**再送(合計2ラウンド)」へ縮小し worst-case を 270→**180秒**へ確定(複数留保 e3/e5/e2 が「純単発でなく1回再送=2ラウンド=180秒」で #1384 回復力を保つ設計を推奨)。record path(leader worktree 相対): `amadeus/spaces/default/elections/260724-e-wtfra1/record.md`。
  - GoA2 留保(5件、record verbatim 要旨):
    - e3: C は根本原因(spawn.sh 非対称の再送×3)への外科的修正。純単発でなく**1回再送(2ラウンド=180秒)**で #1384 ドロップ回復を保つのが妥当。A は補完のエスケープハッチになりうるが一次修正は C、B/D は不要。
    - e5: C 支持。worst-case 180秒は残り体感ゼロにはならない(体感ゼロは B だが FR-5 契約と exit code 意味論の再設計を伴い逸脱)。
    - e6: **C 実装時も org.md Mandated の『落ちる実証』を必須**とする(D案の妥当部分を C 実装へ畳み込む)→ NFR-1a。
    - e4: (1)**落ちる実証を必ず挟む**(既存シームで270相当→C適用後の縮小を実測)→ NFR-1a、(2)**再送2→1で #1384 回復力が保たれるか設計/実装段で確認**→ NFR-1b。A は補完だが既定 UX を改善しないため必須ではない。
    - e2: B は must-not-break 制約(FR-5、実装順序コメント team-up.sh:1439-1442)を破るため除外。D 採用時の具体 fix も C。A は補完併用可。
- **E-WTFRA2(検証方法)**: 裁定 **A案**(choice1=**5票**、他0)。**GoA 内訳: 1x4 2x1**。既存シームで短縮値検証、実90秒統合テストは追加しない。record path(leader worktree 相対): `amadeus/spaces/default/elections/260724-e-wtfra2/record.md`。
  - GoA2 留保(1件、record verbatim 要旨):
    - e5: デフォルト値が90であること自体は、B の重い実待機テストではなく、**`WATCHER_READY_TIMEOUT` のデフォルト解決を確認する軽量な定数 assert(env 未設定時に90になること)で別途担保**することを推奨 → NFR-1c。

## 未解決事項(次段階への引き継ぎ)

- design段階(このbugfixスコープでは code-generation へ直行)で、C案の具体的な制御フロー(再送ループ撤去後の「単発待ち→1回再送→再度待ち」の実装形)を確定する。`WATCHER_RESEND_MAX` の扱い(既定値を2→1へ変更するか、ループ構造自体を撤去して固定1回再送にするか)は実装時判断とし、NFR-2(90秒接地維持)・NFR-1b(再送1回での回復力保持)を満たすこと。
