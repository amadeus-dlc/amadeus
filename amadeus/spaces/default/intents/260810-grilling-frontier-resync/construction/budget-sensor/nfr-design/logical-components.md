# Logical Components — U2 budget-sensor

**Intent**: 260810-grilling-frontier-resync / **Stage**: nfr-design / **Unit**: budget-sensor (library)

上流入力(consumes 全数): engine directive の解決済み consumes = `business-logic-model.md`(U2 functional-design — 本書の分離境界②③が依拠する判定フローの正本)。stage frontmatter 宣言の残余 consumes は nfr-requirements SKIP による `consumes_absent`(`expected: true`)— fallback は `requirements.md`(FR-CONTRACT-3/4/6)と U2 functional-design の `business-rules.md`。

## コンポーネント一覧(論理面)

| 論理コンポーネント | 実体(正本) | 役割 |
|---|---|---|
| 検査述語群 | `packages/framework/core/tools/amadeus-sensor-question-budget.ts` への判定関数の追加 — business-logic-model.md Phase 2 の3関数(detectGrillingMarker / detectDeferredSection / parseJustificationLine)を正本とする。component-methods.md のシグネチャ案 checkGrillingJustification は後2者への分解に対応(対応関係の明記 — Review i1 FOLLOW-UP 反映) | grilling マーカー検知と justification 検査 |
| 判定フロー(単一ゲート) | 同ファイルの verdict 構成部(business-logic-model.md 判定フロー Phase 3→4) | finding 候補の蓄積と cutoff 一括フィルタ |
| 契約テスト面 | `t415-interaction-budget-contract.test.ts` 改訂+新規センサーテスト(t530 以降予約、BR-U2-7) | 正本文言 pin・3態+落ちる実証・vacuity guard |

## 障害ドメインと爆発半径

- **障害ドメイン**: advisory センサー1個 — 誤動作の爆発半径は「偽の advisory finding(偽 FAIL/偽 PASS)」に限られ、workflow の前進・ゲート・exit code を直接ブロックしない(exit 0 固定の既存契約)。ただし偽 PASS は検証劇場クラスの信頼毀損のため、severity は低くても完全性統制(security-design.md §1/§2)で封鎖する。
- **分離境界**: ①dispatcher(既存 — 変更しない)と検査ロジック(本 unit)の境界は既存の embedded 呼び出し。②検査述語(純関数)と FS 読取の境界は in-process seam(BR-U2-7)。③cutoff ゲートは判定フロー内の1点(BR-U2-8)。

## 共有資源

- `QUESTION_BUDGETS` / `QUESTION_BUDGET_CUTOFF_YYMMDD` 定数(既存)— 参照のみ、意味論変更なし(数値上限4/8/12 は §8 表の不変が FR-CONTRACT-2 で確定)。
- `VALID_DEPTH_VALUES`(amadeus-directive.ts)— 3値不変を契約テストで assert(BR-U2-5、FR-CONTRACT-3)。
- audit 書込経路 — 既存 dispatcher の SENSOR_PASSED/FAILED 行をそのまま使用(新規書込面なし)。
- coverage 台帳(coverage-patch-allowlist)— 行ピンへ触れる場合は機械 remap+直読照合+span 検査(business-rules.md 合否基準)。

## Infrastructure Design への接続

- 本スコープは infrastructure-design を SKIP する — 本 unit はインフラ実体を持たず(library、常駐なし)、接続事項は「既存 CI のブロッキング集合(typecheck / lint / tests / coverage 両ゲート)で検証される」ことのみ。新規インフラ要素ゼロ。
