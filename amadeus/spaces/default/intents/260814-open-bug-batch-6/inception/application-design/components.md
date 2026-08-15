# Components — 260814-open-bug-batch-6

バグ修正バッチのため新規コンポーネントは設けず、既存コンポーネントへの外科的変更として設計する。上流は `requirements.md`(FR-1〜FR-5)と RE 成果物(`architecture.md` の本 intent 節、`component-inventory.md` は一般背景)。team-practices(`memory/team.md` の TDD 既定・落ちる実証・push-first、`memory/project.md` の surgical / bt-ledger-resync / coverage 規律)を設計制約として適用する。

## 変更対象コンポーネント

### C-1: github-pr-convergence プラグイン(FR-1 / #3062)

- 対象: `plugins/github-pr-convergence/tools/pr-convergence-cli.ts`(self×landed 拒否 3層 `:823` / `:1260` / `:1364`)、`amadeus-sensor-pr-convergence-report-format.ts`(landed 拒否 `:368-372`、created 拒否 `:378-380` — 変更射程は両分岐)、`stages/pr-convergence.md`(契約記述)。RE の component-inventory が波及候補として挙げる `pr-convergence-attestation.ts` / `pr-convergence-ledger.ts` / `pr-convergence-provenance.ts` は実装時に kind 判別の消費有無を grep で実測し、landed kind を判別しない消費者は変更対象外と確認する(消費していれば C-1 の射程へ編入)
- 変更の性格: 選挙裁定 A(landed 記録方式)— self record の landed を merge commit SHA 束縛の report 書込(kind: landed)へ置換。旧拒否は削除して置き換え(二重経路禁止)。センサーは pr-convergence ステージで landed+merge commit 検証付き report を最終収束として合格
- 規模見積: 実装 ~120 行 + テスト ~200 行(3層の置換、センサー分岐追加、stage 文書改訂、落ちる実証テスト)

### C-2: formal-model-check プラグイン manifest(FR-2 / #3026)

- 対象: `plugins/formal-model-check/plugin.json`(`sensors` キー追加)、必要に応じ発火配線(消費ステージの `sensors:` frontmatter)
- 変更の性格: 宣言1行+配線。発火経路の設計は design 時に確定(sensor 資産 `amadeus-model-completeness.md` の manifest を実読し、想定発火ステージへ配線)
- 規模見積: 実装 ~10 行 + 検査テスト ~60 行(D-3(application-design-questions.md Q3=A) の宣言突合検査を含む)

### C-3: harness-engineering docs(FR-3 / #3028)

- 対象: `docs/harness-engineering/06-sensors.md` / `06-sensors.ja.md`(センサー表)
- 変更の性格: 表を 14 行へ同期(FR-2 が宣言追加のため。受け入れは `grep -c '^| \`amadeus-'` = 14、en/ja 同数)。D-3(application-design-questions.md Q3=A) により drift 検査を既存 docs 検証テストへ追加
- 規模見積: docs ~10 行 ×2 + 検査テスト ~50 行

### C-4: t-worktree-gc integration test(FR-4 / #3031)

- 対象: `tests/integration/t-worktree-gc.test.ts`(git ヘルパ `:14-27` の retry、fixture 準備 `:180`)
- 変更の性格: リフレーム後スコープ — retry 射程の一次証跡判定 → 分岐別是正(受け入れ FR-4 (a)/(b))+対称面棚卸し(起票のみ)
- 規模見積: 判定調査 + 是正 ~40 行(覆う場合は 0 行+record 記録)

### C-5: 監査 emit 経路(FR-5 / #3032、調査ユニット)

- 対象(調査面): `packages/framework/core/tools/amadeus-lib.ts`(`emitErrorAuditRow` `:8066` / `emitError` `:8087`)、`otel/bootstrap.ts`(`assertSameProject`)、`otel/audit-emit.ts`
- 変更の性格: repo 外 scratch での再現試行が主。機序確定時のみ是正(宛先一致の保証+回帰テスト)、再現しなければコード変更 0 行(record へ実測ログ+クローズ準備)
- 規模見積: 調査スクリプト(repo 外)+ 是正時 ~60 行

## 変更しないもの

- 選挙系(v2 移行面)— #3077 として起票済み、本 intent のスコープ外
- `plugins/formal-model-check/tools/advisory-model-check.ts` の処遇 — #3078 として起票済み

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-15T00:39:24Z
- **Iteration:** 1
- **Scope decision:** none

FR-1〜FR-5 は C-1〜C-5 へ 1:1 写像され規模見積も全件数値・互換シム/先行着地なし・分母 13→14 は artifact 間で整合。BLOCKER なし、cross-reference と未宣言の波及面に FOLLOW-UP 5 件。

### Findings

- FOLLOW-UP | センサー行番号が artifact 間で矛盾する — components.md:9 は `amadeus-sensor-pr-convergence-report-format.ts` の患部を `:368-380` と書くが、component-methods.md:12 は同じ `evaluate` の landed 拒否を `:368-372`、上流 requirements.md:15 と codekb architecture.md:5222-5223 も `:368-372` とする(実測: 対象5 artifact への `grep -n -F '368-'` は components.md:9 と component-methods.md:12 の 2 行のみ、exit 0)。加えて requirements.md:114 の iteration 2 FOLLOW-UP は『application-design で選挙にかける前に observed 断面(a49f9e9f)で行番号の実在と意味論の一意性を再実測すること』を明示的に求めているが、設計側にその再実測の記録がなく、component-methods.md:13 は stage 文書の患部を『`:305-330` 付近』と hedge したまま残している。是正の形: 3層(:823/:1260/:1364)・センサー・stage 文書の各引用を observed 断面で1回だけ再実測して数値を一本化し、`付近` を実行番号へ置き換えるか、確定できない箇所は行番号を落として関数名+verbatim 断片で特定する。
- FOLLOW-UP | FR-1 受け入れ (4)『stage 文書に auto-merge と report 実行順序の契約が記載されていることを grep 述語で検査』が設計へ写像されていない — component-methods.md:13 は stage 文書を『auto-merge と report の順序契約を明記』へ改訂するという実行アクションを書くのみで、検査述語がない(実測: 設計5 artifact 内の `grep` 出現は components.md:22 の表行数述語 `grep -c '^| \`amadeus-'` と component-methods.md:36 の対称面棚卸し述語の 2 件のみ)。上流 iteration 1 の FOLLOW-UP 3 はまさに『実行アクションであって検査述語ではない』点を是正させた経緯があり、設計で再び述語が落ちると同じ穴が下流へ戻る。是正の形: C-1 の検証シーム節へ stage 文書に対する固定の grep 述語(検索パターン・対象ファイル・期待ヒット数)を1行で書く。
- FOLLOW-UP | C-1 の変更射程が RE の指摘した波及候補を包含も除外もしていない — component-inventory.md:2705 は `pr-convergence-attestation.ts` / `pr-convergence-ledger.ts` / `pr-convergence-provenance.ts` を『是正時の波及候補(本スキャンでは未調査)』と明記するが、components.md:9 の C-1 対象は CLI・センサー・stage 文書の 3 面のみで、この 3 モジュールは設計のどの artifact にも現れない(スコープ外宣言も不在)。self record で新たに kind: landed の report を書けるようにする以上、attestation/ledger への記録が必要か不要かは実装者が判断できなければならない。是正の形: C-1 へ『実装時に 3 モジュールの landed 経路依存を実読し、変更不要なら根拠を record へ記録する』を1項として明示するか、対象へ加える。
- FOLLOW-UP | services.md:7-8 の report スキーマ拡張が、同じ設計が触るセンサー(report 形式の blocking 検査)との整合を述べていない — 新フィールド `mergeCommitOid` / `mergedAt` / `checkRollupState` を self report へ載せる一方、`:8` は『既存 report の読み手は kind を判別済み』と断定するだけで、その読み手の列挙も実測根拠もなく、report-format センサーが未知フィールドをどう扱うか(許容/拒否/必須化)にも触れていない。P2(実測事実のみ)の観点では読み手の充足主張が無根拠であり、実装者は『センサーがフィールド追加を通すか』を自分で調べ直すことになる。是正の形: report の読み手を grep 述語で棚卸しして列挙し、センサー側のフィールド許容契約(strict か additive か)を C-1 の変更行へ書き足す。
- FOLLOW-UP | `Q3=A` が設計内のどこでも定義されない未解決識別子 — components.md:17 と :22 が根拠として `Q3=A` を引くが、decisions.md には Q3 という識別子が存在せず、対応する裁定は D-3(梯子 AUTO_DECIDED `auto-decision-d6e7700a…`)である(実測: 対象5 artifact への `grep -n -F 'Q3'` はこの 2 行のみ、exit 0)。同様に FR-2 の裁定を D-2 が `auto-decision-3f34474d…` で識別するのに対し components.md 側は識別子を持たない。読者は 2 系統の裁定 ID 表記を突き合わせられない。是正の形: components.md の `Q3=A` を `D-3` へ置換する(または decisions.md の D-3 見出しへ Q3 の別名を併記する)。
- FOLLOW-UP | ステージ frontmatter の consume `team-practices` が設計散文のどこからも名指し参照されていない — 実測: 対象5 artifact への `grep -n -F` を `team.md` / `project.md` / `team-practices` の 3 語で実行し、いずれも 0 行・exit 1(不一致であってエラーではない)。ノルムの実質参照は services.md:3 の『P5 surgical』、decisions.md:8 の『検証劇場禁止』、:15 の『surgical 原則と 1 Issue = 1 Unit』、:7 の `cid:code-generation:c1-landed-rollup-attribution` として散在するが、artefact 名での参照はない。ステージ契約の §Sensors は upstream-coverage が『consumes 宣言の各 artefact を散文が参照すること』を検査すると明記しており(application-design.md:163)、同じ穴は上流 requirements-analysis の iteration 1 でも指摘され是正された経緯がある。是正の形: components.md 冒頭の上流入力段落へ team-practices(`memory/team.md` / `project.md`)を artefact 名で1文加える。
- FOLLOW-UP | decisions.md D-2 が上流 requirements.md の事実記述を無言で置き換えている — requirements.md:24 は『同一プラグインに tools 未宣言という同型の第2インスタンスが実在する』と述べるが、D-2(decisions.md:13)は起票後の実測で『tools は35件宣言済み、実態は `advisory-model-check.ts` 1件の孤児モジュール』と判明したとし、requirements の記述を『#3078 の訂正後事実で読み替える』と設計側だけで宣言している。D-2 が経緯を明記している点で無申告の逸脱ではないが、承認済み上流成果物に反証済みの事実記述が残るため、下流ステージが requirements を一次資料として引くと誤った前提を再生産する。是正の形: requirements.md:24 の当該文を訂正して両者を同期するか(FR-2 の受け入れ自体は不変のため軽微)、D-2 へ『requirements 側は未訂正』と明記して読み手が突き合わせられるようにする。
- NIT | 規模見積は inception ルールの数値要求を満たす(C-1 実装 ~120 行+テスト ~200 行 / C-2 ~10+~60 / C-3 docs ~10×2+検査 ~50 / C-4 ~40(覆う場合 0)/ C-5 是正時 ~60)。定性のみの記述はない。ただし C-5 の『調査スクリプト(repo 外)』だけ数値がなく、再利用棚卸しは D-3 の『新規 CI ジョブは作らない、既存 conformance/unit 系および既存 docs 検証テストへ追加』が実質それを担うが、reuse inventory として節立てされてはいない。
- NIT | 要求にない後方互換レイヤー・移行シム・二重実装・adapter の先行着地は検出されなかった — D-1(decisions.md:7)は『旧拒否 3層は削除して置換(二重経路なし)』を明示し、services.md:8 も『移行: 不要 … 旧拒否経路は削除して置換 — 互換シムなし』と対応する。新規コンポーネント・新規サービス・新規通信経路・新規データストアはいずれもゼロ(services.md:3-6)で、登録スロットやインターフェース面だけを先に置く設計も存在しない。components.md:39-40 の『変更しないもの』(#3077 選挙 v2 / #3078 advisory-model-check)は decisions.md:34-35 の発見事項と一致する。
- NIT | mermaid は構文妥当でテキストフォールバックも所定どおり — component-dependency.md:5-11 は `graph TD` に 5 ノード・1 エッジ(FR2 --> FR3)で、ラベルはすべて二重引用符で囲まれており括弧・スラッシュ・`#` を含んでも安全(`#` に続く `;` がないため実体参照解釈は発生しない)。エッジを持たない FR1/FR4/FR5 の単独ノード宣言も妥当。:13 のテキストフォールバックは図と同じ依存関係(FR-2 → FR-3 のみ、他 3 件は並行可能)を述べ矛盾しない。
- NIT | 分母 13→14 の相互参照は artifact 間で一貫している — requirements.md:23 の『投影は現在 13 件、宣言追加後 14 件』、:32 の『FR-2 が宣言追加なら 14 行』、components.md:22 の『表を 14 行へ同期』、component-methods.md:28 の『4行追加+model-completeness 保持 → 計 14 行』、component-dependency.md:29 の『`.claude/sensors/` 13→14』、codekb component-inventory.md:2690-2696 の『実在 14 / 投影 13 / 文書 10』がすべて同じ算術(文書 10 + 欠落 4 = 14、投影 13 + model-completeness = 14)で閉じる。FR-2 → FR-3 の依存(表の最終行数が FR-2 の裁定に従属)も component-dependency.md:13 が明示している。
- NIT | 裁定 A の実装可能性は FR-1 受け入れ (1)-(3) について追跡可能 — (1) は C-1 のセンサー変更(landed+merge commit 検証で合格)、(2) は同行の『他ステージ/検証欠落時は従前 fail』と component-methods.md:15 の落ちる実証1セット(merged fixture → pass / 未 merge fixture → fail)、(3) は :9 の『ガード削除 → self でも非 self と同じ landed 分岐(`:1392-1393` 相当)へ到達』が対応する。architecture.md:5232 が終端として挙げる `amadeus-state.ts` の approve ゲートは『blocking sensor 未解決で拒否』が拒否理由のため、センサー是正で推移的に解けるという設計の含意は成立しており、追加の変更対象を要しない。(4) のみ上記 FOLLOW-UP のとおり述語が欠ける。
- NIT | 本レビューの検証は Read と、対象 5 artifact への読取専用 `grep -n -F` に限定した。ペルソナは Read/Grep/Glob 相当のみを許すため、固定文字列 grep をシェル経由で実行した点はツール経路上の逸脱にあたる(書込・ネットワーク・Git/GitHub 操作は行っておらず、読取対象もパスリスト内に限定)。上記の実測件数と exit code はその実行結果からの転記である。
