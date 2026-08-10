# Business Rules — U2 budget-sensor

**Intent**: 260810-grilling-frontier-resync / **Stage**: functional-design / **Unit**: budget-sensor (library)

上流入力(consumes 全数): `requirements.md`(FR-CONTRACT-3/4/6+FR-PROTO-7/8 の検査面 AC — 各 BR の正本)、`unit-of-work.md`(U2 完了条件と straddle 注記)、`components.md`(C3/C4 の所有境界)、`component-methods.md`(detectGrillingMarker / checkGrillingJustification のシグネチャ案 — 本書が精密化)、`services.md`(事後検査の役割 — センサーは advisory)、`unit-of-work-story-map.md`(スライス2の利用者価値)。

## BR 一覧

- **BR-U2-1(マーカー検知)**: `detectGrillingMarker` は questions ファイルの**先頭10行以内**の `<!-- amadeus-grilling:v1 mode=grilling -->`(U1/C1 正本の verbatim)を検知する。`amadeus-grilling:` タグは在るが版・属性が正本と異なる異形は「マーカーなし扱いで無音通過」ではなく **malformed-marker の warning finding**(pass 維持 — advisory 契約、ただし loud)。[FR-CONTRACT-4(i) 検知面]
- **BR-U2-2(justification 検査への切替)**: マーカー検知時、数値検査(over-budget FAIL)を justification 検査へ切り替える — 質問数が depth 上限(4/8/12)を超える場合、(a) 超過記録行 `<!-- amadeus-grilling:justification depth=<Depth> questions=<N> frontier-driven -->`(C1 正本の verbatim、`depth` は当該ファイルの depth と一致、`questions` は数値)の存在 と (b) 刈りノード列挙節(合意サマリの deferred 節 — 空明示可)の存在 を検査。(a)(b) いずれか欠落 = **FAIL finding**。両方あり = PASS(justified-overrun の informational finding を残す)。上限以内なら従来どおり within-budget。[FR-CONTRACT-4(i) 検査面、FR-PROTO-7/8 の事後検査]
- **BR-U2-3(未知 depth の loud 化)**: depth が非 null かつ3値(Minimal/Standard/Comprehensive)外のとき、現行の `no-depth, pass:true` 無音通過を **unknown-depth の warning finding(pass 維持)** へ変更。depth null(未検出)は従来どおり no-depth。[FR-CONTRACT-4(ii)]
- **BR-U2-4(語彙非交差の vacuity guard)**: マーカー・記録行のトークンが `[Answer]:`(ANSWER_TAG_RE)・「承認」行走査と交差しないことをテストで固定 — 正常な回答済み questions ファイルにマーカー2種を注入しても answer-evidence 述語の結果が不変であることを assert。[ADR-2 の意味論固定]
- **BR-U2-5(VALID_DEPTH_VALUES 不変 assert)**: 契約テストで `amadeus-directive.ts` の `VALID_DEPTH_VALUES` が3値 verbatim であること、および grilling 改訂ファイル群(protocol/skill/センサー)が `"Free"` を depth の wire 値として流さないことを assert。[FR-CONTRACT-3]
- **BR-U2-6(t415 の完全改訂)**: U1 の暫定 pin を完全化 — 新契約の逐語 pin(frontier 空終了・枝刈り表見出し・遮断器規定・§8 接続段落・semi 除外文言・SKILL の Free 既定)+復活禁止 pin(旧 D6 文言・`hybrid termination`・`Continue` ラベル・`8-12+`)。**対角実測**: 改訂後 t415 × 改訂後正本 = green / 改訂前 t415 × 改訂後正本 = 赤 を実測記録。[FR-CONTRACT-6]
- **BR-U2-7(センサーテスト3態+落ちる実証)**: (i) マーカー付き超過+記録・列挙あり = PASS (ii) マーカー付き超過+記録なし = FAIL(落ちる実証 — 実際に FAIL finding が出ることを注入で実測) (iii) 未知 depth = warning。テストは in-process seam(関数直接呼び出し)で駆動(bun-coverage-spawn-blindspot 回避)、実 FS を使う分は integration 層(fs-tests-integration-first)。tNNN は t530 以降を予約。[FR-CONTRACT-4 AC、FR-PROTO-8 の落ちる実証]
- **BR-U2-8(cutoff 意味論の維持)**: 新検査(justification / malformed-marker / unknown-depth)にも既存 cutoff(QUESTION_BUDGET_CUTOFF_YYMMDD = 260809、record 日付基準の enforced 切替)を同一適用 — cutoff 前 record は withheld。[requirements Assumptions]

## 合否基準

unit-of-work.md の U2 完了条件全数と1:1。coverage: 新規行は in-process seam で計測(patch gate 対象)、allowlist 行ピンへ触れる場合は機械 remap+直読照合+span 検査(c1-allowlist-mechanical-remap / cg-allowlist-straddle-swell)。
