# Components — 260816-open-bug-batch-7

修正対象は既存コンポーネント 3 面(新規コンポーネントなし)。境界は `requirements.md` の FR 群と 1:1 に対応し、codekb `architecture.md`(3 バグの機序)と `component-inventory.md`(file:line 棚卸し)を正として引く。3 面は相互にファイル交差がない(codekb `code-structure.md` の patch surface 配置)。

## C-PI: self-install 配布面(FR-PI-1〜3)

- **責務**: dist 生成物から作業ツリーへの dogfood self-install 投影と、その対象ハーネス集合の宣言
- **公開面**: `scripts/promote-self.ts:64-71` の `managedDirs`、`scripts/plugin-projection.ts:59` の `SELF_INSTALL_HARNESSES`、`packages/framework/core/tools/data/self-install-allowlist.ts:12-19` の `GENERATED_SELF_INSTALL_ROOTS`(→ 生成 `.gitignore` / `.gitattributes`)
- **変更**: 3 つの集合定義へ pi を追加(kimi #1522 と同型)。`.pi` ルートの ignore 生成は pi の dot-gitignore の `!/.pi/vendor/` 系否定パターンと両立させる
- **ownership**: Unit `pi-distribution`。規模見積り: 変更 8 ファイル前後、+40〜80 行 / −10 行(集合 3 行 + テスト 3 本の期待値更新 + docs 2 面)
- **出典**(RA レビュー FOLLOW-UP 1 への応答): charter 件数は本設計起草時の実測 — `ls dist/pi/.pi/agents/ | wc -l` → **15**(測定対象 = 本 worktree の `bun run build`(2026-08-16)生成物 `dist/pi/.pi/agents/`、未追跡ローカルビルド出力)。dist は生成物で件数が変動しうるため、FR-PI-1 の受け入れ確認は固定値 15 でなく**件数フリーの一致述語**(配送後の `.pi/agents/` のファイル集合が同時点の `dist/pi/.pi/agents/` と一致)で読み替える — 本読み替えは decisions.md D2 に記録

## C-NSD: no-silent-drop bootstrap 検証面(FR-NSD-1〜2)

- **責務**: no-silent-drop ゲートの信頼済み台帳読み出し(`loadTrustedPreviousLedgers`)と bootstrap 系検証
- **公開面**: `tests/no-silent-drop/bootstrap.ts`(fallback 分岐 :448-451、provenance 検証チェーン)、`tests/no-silent-drop/ledger.ts`(`CANONICAL_PATHS` :301-306、`baselineAtRevision` :226-227)、`tests/no-silent-drop/bootstrap-provenance.json`、`tests/no-silent-drop/bootstrap/` fixtures
- **変更**(D1 裁定 = 退役): events-only へ一本化 — fallback 分岐・provenance 面・fixtures を除去し、`baselineAtRevision` 死経路を削除、gate テスト(`no-silent-drop-gate.test.ts` の bootstrapRepository fixture・:839・:1222-1244、`t427`)を events 前提へ再構成
- **ownership**: Unit `nsd-provenance`。規模見積り: 変更 5 ファイル前後、−250〜−450 行 / +120〜200 行(テスト再構成含む)

## C-SEN: sensor docs 同期面(FR-SEN-1〜2)

- **責務**: センサー manifest 実在集合と reference docs の列挙の同期保証
- **公開面**: `docs/reference/07-sensor-system.md:199-207` / `.ja.md:199-207` の matches 表、`tests/integration/t3028-sensors-docs-sync.integration.test.ts` の `derivedCorpus()` / `tableRows()`
- **変更**: 表を matches 宣言 13 件へ同期(欠落 4 行 + 陳腐化 2 行)し、t3028 の検査対象へ 07 en/ja を追加(matches 宣言サブセットの件数フリー導出)
- **ownership**: Unit `sensor-docs-sync`。規模見積り: 変更 3 ファイル前後、+50 行 / −10 行

## 再利用棚卸し(reuse inventory)

新規の機構・CI ジョブ・ツールはゼロ。再利用: (1) 既存 CI の blocking 集合(新規ジョブ不要) (2) t3028 の導出述語(`derivedCorpus()`)の拡張再利用 (3) kimi 追加 PR #1522 の変更パターン (4) 既存 events ULID 台帳と gate engine(C-NSD は削除のみで新機構なし)。adapter・登録スロットの先行着地なし(inception ガードレール準拠)。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-16T13:56:05Z
- **Iteration:** 1
- **Scope decision:** none

5点の設計成果物はFR7件を全てC-PI/C-NSD/C-SENへ完全にtraceし、規模見積り(数値)・reuse inventory・adapter先行着地禁止などinceptionガードレールを満たす。Unit間依存ゼロという判断も上流codekb実測(component-inventory.md『3領域はファイル交差ゼロ』)と一致し、component-methods.mdの変更契約もcode-generationへ直接渡せる具体性を持つ。しかし出典検証で虚偽引用を2件検出した。(1) components.mdのC-PI節『charter件数15はcodekb component-inventory.md #2363節(ls dist/pi/.pi/agents | wc -lの転記)』という出典は、該当節(2865-2880行)を全文確認・ファイル全体grepしても該当記述が皆無で、RAレビューのFOLLOW-UP1(『15の出典が無く検証不能』)への応答を装いながら実際には未検証のままFR-PI-1の受け入れ基準数値を固定している。(2) decisions.md D1のContext『provenance(postRevision)はPR #2127以降danglingのまま約3週間CI無影響(codekb component-inventory.md #2162節)』も該当節(2882-2893行)に『PR #2127』『3週間』いずれも記載がなく、architecture.md内の唯一のPR #2127言及(:1894)は無関係な別の古い履歴節である。本intent最重要のADR(D1: 修復vs退役)のContextに未検証の数値主張が含まれている。いずれもteam.md cid:requirements-analysis:mechanism-cite-verify-at-draft / numbers-from-command-output-only への明示的契約違反、org.md P2(『推測起票は偽の信頼を生む分だけ不在より悪い』)への抵触でありBLOCKERとする。加えてD1退役に伴うFR-NSD-1の受け入れ基準の文言不整合、stage契約scopesがself-fixを含まない点をFOLLOW-UPとして記録する。

### Findings

- BLOCKER | components.md:11(C-PI節)の出典注記『出典: charter件数15はcodekb`component-inventory.md`#2363節(`ls dist/pi/.pi/agents | wc -l`の転記)— RAレビューFOLLOW-UP1への応答として出典を本設計で固定』は虚偽引用。component-inventory.mdの#2363節(2865-2880行)全文、および`grep -n "agents.*15|15.*agents|\.pi/agents"`によるファイル全体検索(唯一のヒットは:2876のPERSONA_CHARTER_DIRS宣言で『15』もwc -lコマンドも含まない)のいずれにも該当記述は存在しない。前回のRAレビューが明示的に要求した『実測コマンドまたは出典artifactの明記』を満たさないまま『固定した』と主張しており、FR-PI-1の受け入れ確認(『charter15件が実在』)の根拠数値が未検証のまま下流(code-generation/build-and-test)へ伝播する。
- BLOCKER | decisions.md:7(D1節)のContext『fallback(`validateBootstrapHistory`)はtrustedShaに`events/`が無い場合のみ到達する分岐で、provenance(postRevision)はPR #2127以降danglingのまま約3週間CI無影響(codekb`component-inventory.md`#2162節)』も出典不一致。component-inventory.mdの#2162節(2882-2893行)を全文確認、および`grep -n "2127|3週間|三週間"`によるファイル全体検索はいずれも0件。architecture.md内で『PR #2127』が現れる唯一の箇所(:1894)は本#2162節(:5549-5559)とは異なる、より古い履歴節(#2156系repository-adoption-evidence分析)であり、そこにも『3週間』の記載はない。D1は本intent最重要の設計判断(修復 vs 退役)のADRであり、そのContextに追跡不能な数値的主張を含めることはP2(『記録と検証は実測事実のみを根拠にする』)違反。
- FOLLOW-UP | D1(退役)採用後、requirements.mdのFR-NSD-1受け入れ確認文言『到達不能postRevisionのnegative testが型付き診断+非0終了でfail-closed』は文字どおりには充足不能になる。component-methods.mdのC-NSD変更契約表が示すとおり`validateEvidenceBundle`(postRevisionの唯一の実消費点、component-inventory.md:2888)ごと削除されるため、postRevision自体を対象とするnegative testは退役後のコードベースに存在し得ない。設計は『events欠落→fail-closed』のnegative testで代替しており技術判断としては妥当だが、requirements.mdの当該ACはD1に合わせて未改訂のまま。code-generation/build-and-testが額面どおりのACを探索して混乱しないよう、FR-NSD-1のAC改訂またはdecisions.mdへの上書き明記を推奨する。
- FOLLOW-UP | stage契約`.claude/amadeus-common/stages/inception/application-design.md`のfrontmatter`scopes:`(enterprise/feature/mvp/workshop/installer-distribution/self-feature)に本intentのスコープ`self-fix`が含まれておらず、`execution: CONDITIONAL`の注記(『Skip when changes are modifications to existing components only』)も本intent(既存コンポーネントのみの変更)に文字どおり該当する。conductorのコンテキストは『units-generation/delivery-planning EXECUTEをrecompose済み』と述べるが、application-design自体がなぜself-fixスコープかつ既存コンポーネント限定の変更でEXECUTEされたかの記録がレビュー対象成果物内に見当たらない。監査追跡性のため、composeによる明示的な上書きである旨をmemory.mdまたはdecisions.mdへ一言残すことを推奨する。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-16T14:03:30Z
- **Iteration:** 2
- **Scope decision:** none

iteration 1 の BLOCKER 2 件はいずれも是正により解消を確認した。(1) components.md C-PI の charter 件数『15』の出典は codekb 引用から本設計起草時の自己実測(`ls dist/pi/.pi/agents/ | wc -l`)への差し替えに転換し、cid:requirements-analysis:numbers-from-command-output-only の要求(測定対象・コマンド・ref の明記)を満たす形式に変わった。FR-PI-1 の受け入れ確認も件数フリー述語へ decisions.md D2 で正しく読み替えられ、components.md と decisions.md 間で内容が一致している。(2) decisions.md D1 の Context は主張ごとの帰属へ書き直され、codekb 帰属の主張(1)を component-inventory.md #2162 節(2882-2891 行)で実読検証したところ、記載内容(loadTrustedPreviousLedgers の events 有無分岐、CI 起動点が validateBootstrapHistory を通らない事実)は正確に一致した。PR #2127・現存期間の主張は codekb 引用から外れ Issue 本文 / re-scan record への帰属に切り替わり(いずれもスコープ外のため帰属明示の形式確認に留めた)、旧 BLOCKER が指摘した『約3週間』の未検証数値は本文から完全に削除されている。iteration 1 の FOLLOW-UP 2 件(FR-NSD-1 の AC が文字どおりには充足不能な点、stage scopes に self-fix が無い点)も、それぞれ D1 内の明示的 AC 上書き文言と decisions.md 冒頭の recompose 監査イベント引用で解消済みと確認した。新規の BLOCKER 級は検出しなかった。軽微な指摘を FOLLOW-UP・NIT として各1件記録する。

### Findings

- FOLLOW-UP | decisions.md D1 Context 末尾の『ULID events 台帳(#2338/#2353、2026-08-05 着地)が正本』のうち、PR 番号 #2338/#2353 は codekb component-inventory.md:2889 および architecture.md:5551 で裏付けが取れたが、『2026-08-05』という日付はレビュー対象の codekb 2 ファイル中に一致箇所が見つからない(grep 0 件)。D1 冒頭は『出典を主張ごとに帰属』と宣言しているため、この日付にも出典タグを付すか、出典外の付随情報である旨を明記するかで次回是正時に揃えることを推奨する(虚偽の疑いではなく、単に本レビュー対象範囲外の情報である可能性が高い)。
- NIT | decisions.md D2 は FR-PI-1 の受け入れ確認を件数フリー述語へ読み替える旨を記録しているが、D1 の FR-NSD-1 上書きにある『code-generation / build-and-test はこの上書き後の AC を正とする』という明示的な下流拘束文言が D2 側には無い。対称性のため同種の一文を追加することを推奨する(読み替えの意図自体は文脈から明確であり blocking ではない)。
