# Functional Design 質問記録 — `autonomy-statusline`(#2253)

上流入力(consumes 全数): unit-of-work.md, unit-of-work-story-map.md, requirements.md, components.md, component-methods.md, services.md

- **様式**: **0 問様式**(既習形 — 本 intent の delivery-planning-questions.md と同形)。`[Answer]` タグを持つ質問行は 0 件である。
- **E-OC1 判定**: **選挙不要**。根拠種別は「既決規範の機械的執行」— 本 Unit の全設計判断が (i) 承認済み上流成果物(`component-methods.md` §C14 のシグネチャ・出力表・連結様式、`components.md` ADR-10 の Option A 裁定、`requirements.md` FR-DISP-1 の受け入れ基準)(ii) `project.md` の既決 correction(`cid:code-generation:seam-placement-measured-module`)から一意に導出でき、複数の妥当解・価値判断・ownership の裁定が残らないためである(`cid:requirements-analysis:always-elect` の執行条項)。
- **判定の申告と記録**: 0 問様式のため `[Answer]` への先記入は構造的に発生しない(`cid:requirements-analysis:no-election-judgment-gate`)。本ステージは per-unit イテレーション(gate なし)であり、ステージ全体のゲートは全 Unit 完了後に 1 回提示される。Intent autonomy は `full`(intent-grant-4c55238ea3ee5a3fe97623cbe6ea19a7)であり、ゲート効果は監査済み Intent 認可が選択する。
- ユーザー承認: 2026-08-05T04:52:54Z(Intent autonomy `full` の設定トランザクション — 監査シャード `INTENT_AUTONOMY_TRANSACTION_COMMITTED`(projection.mode=full、events=afterMode|grant)の timestamp からの転記。本 Unit 固有の追加裁定事項は 0 件)

---

## 裁定の記録

本 Unit の設計分岐は 4 点あり、すべて既決規範・承認済み上流からの機械導出である。1 分岐 1 行で導出元を示す。

| # | 設計分岐 | 導出した答え | 一次根拠(既決規範 / 承認済み上流) |
| --- | --- | --- | --- |
| D1 | `autonomySegment` の配置モジュール | **`packages/framework/core/tools/amadeus-lib.ts`(既計測モジュール)に置き、statusline は import して 1 行で連結する** | `project.md` `cid:code-generation:seam-placement-measured-module`(「seam 関数は既計測モジュールへ移設して import する」)。`amadeus-statusline.ts` は spawn-only(t168 が spawn 駆動、in-process import 実績 0 — 実測: `grep -c "amadeus-lib" tests/unit/*.ts` で lib の in-process 実績多数、statusline は 0)かつ先頭 `await main()` の副作用を持つため in-process seam にできない。statusline は既に `amadeus-lib.ts` から表示ヘルパー(`displaySlugFromDirName` 等)を import しており(`amadeus-statusline.ts:6-17` 実測)、新しい依存辺を作らない。`component-methods.md` §C14 が statusline ファイル内の関数として書いた点からの**申告付き精密化**であり、シグネチャ・出力表・連結様式は逐語で保存する(§申告 参照) |
| D2 | mode 語彙の値域検証の実装形 | **`import type { AutonomyMode }`(type-only、runtime 消去)+ `readonly AutonomyMode[]` の literal 配列で判定する** | `requirements.md` FR-DISP-1(表示専用語彙を作らない)+ phases/construction.md「canonical な 1 定義から導出」。値域の canonical は `amadeus-intent-autonomy.ts:9` verbatim `export type AutonomyMode = "none" | "semi" | "full";`。type-only import は runtime 消去され循環を作らない(実測: `amadeus-intent-autonomy.ts` は `amadeus-lib` を import しない)。配列要素は型により canonical union へピンされ、値域が変われば typecheck が赤になる |
| D3 | セグメントの挿入位置 | **`main()` の既存連結の最終段(`agentDisplay` の後)に 1 行追加。COMPLETE / ready の早期 return 経路には追加しない** | `component-methods.md` §C14 verbatim `if (autonomy) output += ` @${autonomy}`;`(連結様式の逐語指定)。`output` 変数は active-workflow 経路(`amadeus-statusline.ts:317-322` 実測)にのみ存在し、COMPLETE(`:306-315`)と ready(`:277-280` / `:299-301`)は `output` 構築前に return 済み — 挿入先は構造的に一意 |
| D4 | テスト層と駆動方式 | **t448(予約済み)を `tests/unit/` に置き、shipped surface(`dist/claude/.claude/tools/amadeus-lib.ts`)から in-process import で駆動する** | `unit-of-work.md` §テスト番号の予約(t448)+ `cid:code-generation:fs-tests-integration-first`(純関数は unit 層)+ 兄弟テストの既習様式(t168:41 verbatim `} from "../../dist/claude/.claude/tools/amadeus-lib.ts";`)。`autonomySegment` は文字列→文字列の純関数であり実 FS に触れない |

## 申告 — component-methods.md §C14 からの精密化(D1)

`component-methods.md` §C14 は `autonomySegment` を `amadeus-statusline.ts` 内の関数として記す。本 FD は関数本体を `amadeus-lib.ts` へ置き、statusline 側は import + 連結 1 行とする。これは無申告の逸脱ではなく、次の 2 点により既決規範の執行として申告する:

1. `project.md` correction `cid:code-generation:seam-placement-measured-module` は「spawn-only の CLI モジュールを coverage seam 目的で in-process import しない — seam 関数は既計測モジュールへ移設して import する」を既決としており、`cid:requirements-analysis:no-election-for-decided-norms` により memory 層の既決規範はそのまま適用する。
2. C14 の観測可能な契約 — シグネチャ `autonomySegment(stateContent: string): string`、**返り値ドメイン**(シグネチャのコメント逐語 `// "" | "semi" | "full" | "none"` — bare の mode 名)、出力表(3 mode + 不在/不正)、**連結様式**(呼び出し側 `main()` の verbatim `if (autonomy) output += ` @${autonomy}`;` — truthy 判定と ` @` 前置は呼び出し側)、ADR-10(state のみ読む)、FR-DISP-1 の受け入れ基準 — はすべて不変である。変わるのは関数定義の所在のみで、`services.md` P5 の「追加 I/O ゼロ」制約(§プロセス境界)も不変(lib は既 import 済みモジュール)。(§12a iteration 1 の BLOCKER 指摘 — 初稿が返り値ドメインを ` @<mode>` 形へ、連結を無条件形へ変えていた — を受け、成果物 3 点を C14 逐語契約へ完全整合させた是正済みの記述である)

読み取り関数についても 1 点精密化する: 上流(component-methods.md §C14 ほか)は `extractField(state, ...)` と記すが、`extractField` は `amadeus-statusline.ts` のファイルローカル関数(:121、export なし)であり `amadeus-lib.ts` からは参照できないため、lib 側の等価な既存関数 `getField`(`amadeus-lib.ts:4845`、`amadeus-stop.ts:163` が同一フィールドの読み取りに使用中)へ置き換える(§12a iteration 2 FOLLOW-UP の申告追補)。

この精密化は §12a reviewer の独立検証対象であり、reviewer が逸脱と判定した場合は是正する。

---

## 完全性確認

- 空の `[Answer]` タグ: **なし**(0 問様式のため `[Answer]` 行そのものが 0 件)
- 未解決の設計判断: **なし**(D1〜D4 の 4 分岐すべてが一意導出)
- 後続ステージへ委ねる判断: なし。`unit-of-work.md` §未確定事項の引き取り の 11 件(U-1〜U-7 + A〜D)に本 Unit の引き取りは 0 件(表の引き取り Unit 列に `autonomy-statusline` は現れない — 実測)
- 上流との矛盾: **なし**。`unit-of-work-story-map.md` §`autonomy-statusline`(実装 2 項目: C14 実装 + FR-DISP-1 ユニットテスト)と本裁定 D1〜D4 は整合する
