# U3 subagent-stats — Business Rules

**上流入力(consumes 全数)**: `requirements`(FR-4・AC-3/AC-6)/ `components`(C-7)/ `component-methods`(CLI Usage 正本)/ `unit-of-work`(U3 完了条件)/ `unit-of-work-story-map`(監査ジャーニーの受け手)/ `services`(read-only・観測手段)

**測定 ref**: observed `7060956c5617125dd2f4e284957aa180cb306484`

## BR-U3-1: CLI 契約

`bun amadeus-subagent-stats.ts [--project-dir <path>] [--space <name>] [--json]` — 既存 audit 読取 CLI の様式に倣う。既定 space は active-space。未知フラグは loud エラー(fail-closed の引数検証 — `verification-numeric-parse` 系の parse-don't-validate)。

## BR-U3-2: 入力の走査と判定

- 対象: `amadeus/spaces/<space>/intents/*/audit/*.jsonl` の全行
- イベント判定: JSON parse 後の `.attributes.Event === "SUBAGENT_COMPLETED"`(一次)/ `"SUBAGENT_STARTED"`(併記)の等値比較
- parse 不能行は skip し件数を注記(fail-open — 集計を止めない。ただし件数を隠さない)

## BR-U3-3: verdict の決定(新旧行の統一規則)

1. 行に `Type Verdict` 属性があれば `isTypeVerdict()` 述語(4値 union の等値判定)でパースして採用(記録時 verdict の尊重 — parse-don't-validate の読み側適用)。union 非適合の値(将来世代・別実装の書き手)は手順2の再分類へ落とし `verdictMismatchCount` に計上する
2. 無ければ `Agent Type` に `normalizeAgentType` 同等の trim + `"unknown"` fallback を適用してから `classifyAgentType(agentType, 現在の許可集合)` で分類(旧行の集計時分類 — 欠落・空行も必ず1 verdict に落ちる全域性の担保、domain-entities 不変条件3)
3. 属性値と再分類の食い違い件数を `verdictMismatchCount` に計上し注記行に出す(許可集合の時点差の可視化)

## BR-U3-4: model の決定

- `Model` 属性があれば `byModel[model] += 1`、`Model Source` 属性で `byModelSource[source] += 1`(pin 実効性の監査面 — story-map の「配分方針を監査する」ジャーニーへの trace)
- 無ければ `unresolvedModelCount += 1`(ADR-5 の読み side — U2 の BR-U2-2 と対)

## BR-U3-5: 出力(text / --json)

1. 測定 ref ヘッダ: 測定時刻(ISO)・走査対象(`scanScope` = space 名 + 走査 glob)・シャード数・イベント総数(FR-4b — audit は移動値)
2. verdict 別内訳(4値全て、0 も表示)
3. 型別ランキング(distinct 値・verdict・件数の降順)
4. model 別内訳 + Model Source 別内訳 + unresolved 件数
5. 注記: parse skip 件数・verdict 食い違い件数・許可集合 warnings 件数・読取失敗シャード件数(いずれも 0 のときも行を出す — 無音にしない。読取失敗シャードが正のときは exit 非0 — fail-loud、business-logic-model エラーモデル表の訂正注記参照)

いずれも `SubagentStatsReport` のフィールドからのみレンダリングする(`renderStatsText` は純関数 — レポートに無い値を出力に発明しない)。許可集合解決の warnings **本文**は AD 正本(C-1「呼び手が stderr へ流す」)どおり stderr へ流し、レポート/text/JSON には `allowedSetWarnings` として保持・件数を注記行に出す(stderr は人間向け即時信号、レポートは機械可読の記録 — 役割分担であり AD からの逸脱ではない)。

## BR-U3-6: テスト契約(AC-3 / AC-6)

- integration 層(実 FS): fixture シャード(persona / builtin / ad-hoc / unknown / Model 有無の混在)で全数勘定の不変条件(domain-entities 3/4)を固定
- **AC-3(corpus sweep 両側実証 — 決定的述語)**: 実 audit corpus 全数へ実行し、(0) 15種タリーの確定前に**組込型と同名の persona が存在しないこと**を機械確認(U1 の builtin 先勝ち判定により衝突時は帰属が persona→builtin へ移るため — 衝突ゼロの記録を成果物に残す) (i) 許可集合内(persona 8 + 組込 7 の実測15種)への警告分類(`unknown-type` / `outside-allowed-set`)がゼロ (ii) 警告対象計数(`unknown-type` + `outside-allowed-set` の出力実測値)が、**同時点の corpus を被検 CLI を経由しない独立手段(jq / grep パイプライン等)で requirements AC-3 の述語どおり機械再計算した値と完全一致**すること(再計算を CLI 自身で行う自己参照比較は検証劇場 Forbidden — 独立オラクル必須)(audit は移動値のため件数は実測時刻で再確定し、出力からの転記値と再計算値・測定時刻を成果物へ併記 — 差分が出たら不一致理由を特定するまで green にしない)
- **AC-6**: 実出力ヘッダに測定 ref が印字されること、unresolved 区分が出ることを assert
- 落ちる実証: fixture に集合外行を注入し `outside-allowed-set` 計数が増えることを実測

## BR-U3-7: R-2 の再計測の実演

U3 を担当する Bolt の完了報告に本 CLI の実出力(型別ランキング上位・verdict 内訳・測定 ref)を貼付し、intent-statement の R-2(Issue 本文の集計値の再計測)を閉じる(Bolt 番号は delivery-planning の bolt-plan を正とする — 本書では断定しない)。

## BR-U3-8: TDD(NFR-2)

CLI は spawn 盲点を避けるため主要ロジックを export 純関数(`composeStatsReport(scanned, resolution, measuredAt, scanScope): SubagentStatsReport` と `renderStatsText(report): string` — シグネチャ正本は domain-entities の seam 節)へ寄せ、in-process テストで駆動する(`spawn-blindspot-two-step` / `seam-export-handler-amend`)。
