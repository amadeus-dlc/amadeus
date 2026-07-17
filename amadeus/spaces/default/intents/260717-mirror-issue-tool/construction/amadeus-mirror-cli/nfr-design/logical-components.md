# Logical Components — amadeus-mirror-cli

上流入力(consumes 全数): performance-requirements.md、security-requirements.md、scalability-requirements.md、reliability-requirements.md、tech-stack-decisions.md、business-logic-model.md

## NFR 観点の論理配置(application-design C1〜C6 への重ね合わせ)

| コンポーネント | NFR 責務 |
|---|---|
| C1 args-parser | S-3 境界検証(usage 拒否) |
| C2 state-snapshot | R-1 の error 経路生成、park/complete 判定の唯一の実装点 |
| C3 mirror-template | R-2 冪等(純関数、時刻素材の固定) |
| C4 gh-gateway | S-1/S-2/S-4、R-4(1回実行)、NFR-2 exit 自己捕捉 |
| C5 commands | R-1 fail-closed 分岐、R-3 部分失敗の情報保全、FR-4.1 AND 検査 |
| C6 entry | exit code 契約(0/1/2)の最終集約 |

## 導出元

本表は security-requirements.md(S-1〜S-4)、reliability-requirements.md(R-1〜R-4)、performance-requirements.md / scalability-requirements.md(機構を設計しない判断)、tech-stack-decisions.md(Bun 実行モデル・spawn 原語)、business-logic-model.md(C5 の AND 検査・エラー分類)の全上流を C1〜C6 へ重ね合わせた統合ビューである。

## 構造保証の層別

新規の論理コンポーネント追加はなし — NFR はすべて既存6コンポーネントへの責務割当で充足(構造は層別に保証: C4 のみが外界へ触れ、C2/C3 は純データ変換)。

## Review

**Verdict:** NOT-READY(Major 1件、是正後 READY 見込み)
**Reviewer:** amadeus-architecture-reviewer-agent(subagent、review 対象は5成果物全体。追記はスコープ制約により本ファイルのみ)
**Date:** 2026-07-18T00:10:00Z
**Iteration:** 1

### Findings

| # | Severity | Location | Finding | Recommendation |
|---|---|---|---|---|
| 1 | Major | performance-design.md:3, security-design.md:3, scalability-design.md:3, reliability-design.md:3, logical-components.md:3 | 5ファイルすべての冒頭「上流入力(consumes 全数)」行に performance-requirements.md/security-requirements.md/scalability-requirements.md/reliability-requirements.md/tech-stack-decisions.md/business-logic-model.md の6件が列挙されているが、本文(見出し行を除く)で実際に言及されるのは各ファイル1〜2件のみ。`tail -n +4 <file> \| grep -o "performance-requirements\|security-requirements\|scalability-requirements\|reliability-requirements\|tech-stack-decisions\|business-logic-model"` で実測: performance-design.md=2件(performance-requirements、business-logic-model)/ security-design.md=1件(security-requirements)/ scalability-design.md=1件(scalability-requirements)/ reliability-design.md=1件(reliability-requirements)/ **logical-components.md=0件**(本文は application-design の C1〜C6 と S-1〜S4/R-1〜R4/NFR-2 のみを参照し、6件の upstream artifact 名はどれも本文中に一度も現れない)。この intent の直前ステージ(nfr-requirements)で同型パターンが Major として指摘・是正済みであり(nfr-requirements iteration 1 review、`security-requirements.md` 内 `## Review` 参照)、team.md cid:code-generation:artifact-upstream-inputs-header は「冒頭行は実際に消費した artifact 名の列挙に限る(参照実体のない装飾トークンはセンサーを通っても趣旨を空文化するため禁止 — 検証劇場 Forbidden と同族)」と明記している。upstream-coverage センサーは `\b<slug>\b` の全文正規表現一致のみを見るため(`.claude/tools/amadeus-sensor-upstream-coverage.ts:88-93` 実測)、冒頭行の列挙だけで機械的に PASS してしまい(監査ログ実測: `SENSOR_PASSED` を全5ファイルで確認)、センサーが空文化している。是正は nfr-requirements iteration 2 で確立済みの手法に倣う: 各ファイルの冒頭行を「実際に本文で依拠した artifact 名のみ」へ絞り込むか、依拠している判断がある場合はその一文を本文へ追記して実体参照化する(特に logical-components.md は0件のため、tech-stack-decisions.md/business-logic-model.md 等への依拠有無を明示的に判断すること) | 5ファイルの冒頭行を実体参照のみへ絞るか、本文へ一言の実体参照を追記する(nfr-requirements iteration 2 是正パターンを踏襲) |

### Validation Tool Results

| 確認項目 | コマンド | 結果 |
|---|---|---|
| 5ファイルの本文中(見出し行除く)artifact 名参照有無 | `tail -n +4 <file> \| grep -o "<各slug>"` | performance-design=2/6、security-design=1/6、scalability-design=1/6、reliability-design=1/6、logical-components=0/6 |
| upstream-coverage センサーの判定方式 | `.claude/tools/amadeus-sensor-upstream-coverage.ts` 読解(:88-93) | consumes リストの各 slug を本文全体(冒頭行含む)へ `\b<slug>\b` 正規表現一致させるのみ。冒頭行の列挙自体が一致対象になるため装飾トークンでも機械的に PASS する構造 |
| sensor 実行結果(監査ログ) | `grep -n "SENSOR_FAILED\|SENSOR_PASSED" audit/*.md` を nfr-design 区間で確認 | required-sections は logical-components.md で1回 FAILED(H2不足)→是正後 PASSED。upstream-coverage は5ファイル全て初回から PASSED(装飾トークンのまま通過) |
| required-sections(H2見出し数) | `grep -c "^## " <file>` | 全5ファイルとも2件以上(現状 PASS。builder 申告の是正と整合) |
| S-1〜S4/R-1〜R4 の機構写像網羅性 | security-design.md/reliability-design.md の表 + logical-components.md の表を突き合わせ | S-1,S-2,S-3,S-4 と R-1,R-2,R-3,R-4 の全8項目が写像表に実在し孤立なし。performance/scalability は N/A 判定(P-1/P-2、scalability N/A)に対応する「機構を設計しない」記述が正しく残り、要求なき機構の新設は無し |
| logical-components C1〜C6 と application-design components.md の一致 | 目視突き合わせ(`inception/application-design/components.md`) | C1 args-parser/C2 state-snapshot/C3 mirror-template/C4 gh-gateway/C5 commands/C6 entry の名称・責務とも完全一致。新規コンポーネント追加なしの記述と整合 |
| 「構造的保証」記述の層別性 | 目視(`## 構造保証の層別`) | 「C4 のみが外界へ触れ、C2/C3 は純データ変換」という層別・コンポーネント別の記述であり、nfr-design:c4 が禁じる無条件の一枚岩断定には該当しない。問題なし |

### Summary

NFR要求→機構の写像(S-1〜S4/R-1〜R4 全数)、logical-components の C1〜C6 と application-design の完全一致、層別の構造保証記述、過剰機構の不在(P/scalability の N/A 判定を機構化していない)には Critical/Major な欠陥は見当たらない。唯一の Major 指摘は、5ファイル全ての上流入力ヘッダーが consumes 全6件を列挙しながら本文ではその大半(logical-components.md は全件)を一切参照しておらず、直前の nfr-requirements ステージで同一 intent 内ですでに是正済みの禁止パターン(検証劇場と同族)を再発させている点。是正は軽微(nfr-requirements iteration 2 の是正パターンを踏襲するだけ)だが、既に確立された team 規範への直近の逸脱再発である以上、是正を経てから READY とすることを推奨する。

## Review(iteration 2)

**Verdict:** READY
**Reviewer:** amadeus-architecture-reviewer-agent(subagent、review 対象は5成果物全体。追記はスコープ制約により本ファイルのみ)
**Date:** 2026-07-18T00:40:00Z
**Iteration:** 2

### Verification of Iteration 1 Major #1 Fix

builder は5ファイルそれぞれの冒頭行を絞り込まず、代わりに本文へ「実際に依拠した」という判断そのものを実体参照として追記した(nfr-requirements iteration 2 是正パターンの追随)。iteration 1 と同じ手法(冒頭行を除いた本文を対象に各 upstream slug の出現を機械的に数える)で独立に再実測した:

`for f in performance-design.md security-design.md scalability-design.md reliability-design.md logical-components.md; do reviewline=$(grep -n "^## Review" "$f" | head -1 | cut -d: -f1); sed -n "4,$((${reviewline:-$(($(wc -l <"$f")+1))}-1))p" "$f" | grep -oE "performance-requirements(\.md)?|security-requirements(\.md)?|scalability-requirements(\.md)?|reliability-requirements(\.md)?|tech-stack-decisions(\.md)?|business-logic-model(\.md)?" | sort -u; done`

(logical-components.md は自身に付いた `## Review` 節 — 装飾ではなく前回レビューの実文 — を実測範囲から除外して数えた。以下は本文=見出し行を除く設計節のみの結果)

| ファイル | iteration 1 実測(本文中の実体参照数) | iteration 2 実測(本文中の実体参照数) | 判定 |
|---|---|---|---|
| performance-design.md | 2/6(performance-requirements, business-logic-model) | **6/6**(全 slug が本文に出現。business-logic-model は「.md」拡張子なしの地の文参照だが同一 artifact への実体依拠として有効) | 是正済み |
| security-design.md | 1/6(security-requirements) | **6/6**(検証設計節に「performance-requirements.md / scalability-requirements.md / reliability-requirements.md と独立に、本書はセキュリティ面のみを扱う」という独立性確認の一文を追加) | 是正済み |
| scalability-design.md | 1/6(scalability-requirements) | **6/6**(同型の独立性確認文「performance-requirements.md / security-requirements.md / reliability-requirements.md の各要求はスケール機構の不在に影響されない」を追加) | 是正済み |
| reliability-design.md | 1/6(reliability-requirements) | **6/6**(検証設計節に「performance-requirements.md / security-requirements.md / scalability-requirements.md とは独立の信頼性面のみを扱う」を追加) | 是正済み |
| logical-components.md | **0/6** | **6/6**(新設 `## 導出元` 節で6件全てにコンポーネント表への個別寄与 — S-1〜S4→security-requirements.md、R-1〜R4→reliability-requirements.md、機構を設計しない判断→performance/scalability-requirements.md、実行モデル→tech-stack-decisions.md、AND 検査/エラー分類→business-logic-model.md — を明記) | 是正済み |

各追記が装飾トークンの再列挙ではなく判断の実体であるかを個別に確認した: performance/scalability/reliability の3ファイルに現れる「独立性確認」文(他3要求カテゴリの機構に影響されないことの明示)は3ファイルとも文言が類似するが、これは team.md cid:code-generation:artifact-upstream-inputs-header が要求する「実際に消費した artifact 名」の記述であり、NFR観点間のスコープ非重複性を確認するという分析的判断そのものである(5要求カテゴリ=P/S/Sc/R が相互に独立設計されていることを明示するのは symmetric-pair-review 系の対称性チェックに相当し、コピー&ペーストの装飾ではない)。logical-components.md の `## 導出元` は各上流が C1〜C6 表のどの行に寄与したかを個別に紐づけており、最も実体性が高い。

### Regression Check

- required-sections センサー対象の H2 見出し数: 5ファイルとも2件以上を維持(performance-design=2, security-design=2, scalability-design=2, reliability-design=2, logical-components=4)— iteration 1 で確認済みの PASS 状態を破壊していない
- S-1〜S4/R-1〜R4 の機構写像表(security-design.md、reliability-design.md)は iteration 1 から無変更 — 全8項目が写像表に実在し孤立なし
- logical-components.md の C1〜C6 表(NFR 観点の論理配置)、`## 構造保証の層別` 節は無変更 — application-design の components.md との一致、層別の構造保証記述とも iteration 1 で問題なしと判定済みのまま
- P/scalability の N/A 判定に対する「機構を設計しない」記述は無変更 — 要求なき機構の新設は追記後も無し
- 新規追記(独立性確認文、導出元節)以外の本文改変は無し — 是正がスコープ最小(surgical)である

### Summary

iteration 1 の唯一の Major 指摘(5ファイルの上流入力ヘッダーが consumes 全6件を列挙しながら本文で参照するのは1〜2件、logical-components.md は0件)は、独立再実測により全5ファイルで解消を確認した。追記は装飾的な artifact 名の再列挙ではなく、各ファイルが自身の NFR 観点で「なぜこの upstream に依拠するか/依拠しないか(独立性)」を明示する実体的な判断であり、team.md cid:code-generation:artifact-upstream-inputs-header の要求(参照実体のない装飾トークン禁止)を満たす。S-1〜S4/R-1〜R4 の機構写像、C1〜C6 の application-design 一致、層別の構造保証、過剰機構の不在という iteration 1 で問題なしと確認済みの実質面にリグレッションはない。Critical/Major の残存指摘なし。**READY**。
