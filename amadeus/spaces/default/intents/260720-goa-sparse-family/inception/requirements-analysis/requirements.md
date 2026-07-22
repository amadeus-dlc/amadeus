# Requirements — 260720-goa-sparse-family

上流入力(consumes 全数): intent-statement.md(3ギャップ定義)、scope-document.md(Must/Won't・効力条件)、business-overview.md(蒸留サイクルの位置づけ)・architecture.md/code-structure.md(core 正本層と scripts 配布外層の2層分離 — FR-4 の配布要件の構造根拠)、team-practices.md(適用プラクティス無変更の確認)

【件数改訂の申告】scope-document M-1 の「14行」は ideation 時点の実測、RE で17行(team.md)、本 reviewer 是正で 21 occurrence(memory 層全域)へ確定 — corpus は persist のたびに成長するため、受け入れ基準は固定値でなく着手時再実測を正とする。実測根拠は RE 一次資料 re-scans/260720-goa-sparse-family.md(base a326f47bc・Observed 71f67f487・Architect 再照合35点一致)。裁定依存欄は Q1/Q2 選挙の裁定後に確定転記する(ruling-dependent-placeholder — 先取り記入しない)。

## FR-1(#1254: corpus スパース GoA 行の解消)

ビジネス根拠: business-overview.md が位置づける週次蒸留サイクル(distill-candidates)は将来 GoA-variance 集計でこの corpus を消費する — スパース未達の解消はその集計実装の前提条件である。

- 方式: 【E-GSFRA1 裁定 = (a) parse 側スパース受理(2026-07-20 開票、choiceCounts = a:2 / b:0 / c:1 の 2-0-1 — 修正版 CLI の winner 自動導出の初適用。tally.json 実測転記)】parseGoaLine の bin 段をサブ問別スパース表記へ拡張する。
- 【留保転記(e1, GoA2)】(b) 成分(persist 様式の canonical 化)は**ノルム改定として norm PR トラックへ分離**する — 本 intent のコード面には含めない(e3 の (c) 票(受容度 a=6)が指した b 成分の補完はこの別トラックで扱う)。
- 【留保転記(e2, GoA2)】受理域境界の **fail-closed を明文化**する — 重複サブ問・範囲外 bin(1-8 外)・不正 token は loud 拒否(受理拡大が無検証受理に滑らない境界仕様を functional-design で確定)。
- 裁定非依存の受け入れ基準: (i) **memory 層全域 corpus 21 occurrence**(team.md 17+project.md 4 — 抽出コマンド grep -o 'GoA\[E-[A-Z0-9-]*\]:'、測定 ref = worktree HEAD 71f67f487 系 2026-07-20 実測。RE 初回は team.md 単独 grep で project.md 4件を見落とし reviewer C-1 が捕捉 — E-SDE-FD 追補『対象語彙の repo 全域 grep』の違反実例として PM 回付、母集団定義を全域 grep 由来へ是正)に対する採用方式での全数 sweep 両側実証 — 「読めるべき行が読める/拒否すべき形が拒否される」を対照で(C-7、corpus-sweep-for-new-guards) (ii) 選挙 CLI の renderGoaLine(canonical 8-bin 書き)は変更しない (iii) 方式 (a) 系採用時のスパース文法詳細(サブ問ラベル・`/` 区切り・欠落 bin=0)は functional-design で確定(明示委譲)

## FR-2(#1255: GoaLineCode 複節拡張+圧縮 workaround 撤去)

- `GOA_LINE_CODE_RE`(record.ts:34)を複節形 `^E-[A-Z0-9]+(-[A-Z0-9]+)*$` へ拡張し、:28-31 の #1226 workaround コメントを更新する
- handleOpen のエラーメッセージ(election.ts:241-242 の `^E-[A-Z0-9]+$` 表記)を新受理形へ更新する
- 旧 record(store 55ファイル・圧縮単節 code)の読み側互換は regex 拡大により構造的に保存される(RE 実測 — 受理域の純拡大)
- t238:102 の圧縮形受理ピンの扱い: 【E-GSFRA2 裁定 = (a) ピン維持(記録票数 2-1。leader 注記: e1 ballot は blind ビュー由来の choiceInternalNo mint ミスの申告があり実質 3-0 — 裁定不変、機械転記ルールは PM 材料として回付済み)】旧 record 互換の明示的保証としてテストを温存し、新規書込のみ自然形へ移行する。
- 順序依存: FR-1 の方式裁定と独立に実装可能だが、t238 の複節 parse 面(:104-109)は #1256 で着地済みの前提を維持する

## FR-3(#1257: ECODE_RE 複節整合)

- `ECODE_RE`(norm-metrics.ts:131)を `\bE-[A-Z0-9]+(?:-[A-Z0-9]+)*` へ整合(裁定済み — E-TCRRA 系ではなく #1257 クロスレビュー2名+E-DAGRA 系の既決範囲、C-3)
- 受け入れ基準: (i) count 不変の対照テスト(team.md 級 corpus で旧新 regex の matchAll 件数一致 — RE 時点実測 189=189/17行時点)を固定 (ii) 切詰め解消の正テスト(`E-SDE-CG4` が1トークンで全長 match) (iii) 消費行(:393 countMatches)の挙動不変

## FR-4(検証・配布要件)

- 落ちる実証は E-GMECG 追補準拠(fix コミット後の面切替・SHA 明示復元)+injection-surface-verify(注入はテストが読む面へ)
- norm-metrics は core 正本(architecture.md/code-structure.md の層分離どおり)— dist×6+self-install 再生成+dist:check/promote:self:check green(C-4)。election scripts 面は配布外(dist footprint 0 — RE 実測)
- push 前 lcov で diff 追加行未カバー 0(local-lcov-pre-push)
- e2 #1267 面との非交差維持(C-5 — record.ts の関数単位離隔、変動時即時相互通知)

## 未決

なし — Q1/Q2 は E-GSFRA1/2(2026-07-20 開票)で裁定済み。裁定詳細・留保転記は上記 FR-1/FR-2 と questions の [Answer] を参照(record = leader ブランチ a7cae8567)。
