# Requirements — eoc1-gate-check(Issue #1101)

> 上流入力(consumes 全数): `../../ideation/intent-capture/intent-statement.md`(問題・価値)、codekb `business-overview.md` / `architecture.md`(エンジン tool 内部のみの feature と非交差につき参照非該当 — code-structure.md 当該節を正とする)、Issue #1101(クロスレビュー e2+e4+e3 — 含意形述語収束)、E-PM6 L1 裁定(cid eoc1-evidence-in-questions-header、norm PR #1102 着地)、`../reverse-engineering/scan-notes.md`(挿入面4面台帳)、`../../ideation/scope-definition/scope-document.md`(In 5項/Out 3項)、`../../ideation/rough-mockups/wireframes.md`(verdict 3種の出力契約)、`../../ideation/feasibility/constraint-register.md`(C-1〜C-5)。codekb は code-structure.md「gate-start 検査挿入面」節を主参照。
> 既決照合: 述語 = 含意形(15:00 裁定+クロスレビュー収束)。#922 統合 = scope In-5(共有関数化まで in)。明確化質問 0問(questions 冒頭の判定参照)。

## FR-1: 検査述語関数(lib、共有)

`amadeus-lib.ts` に `checkQuestionsEvidence(questionsPath)` 相当を export で追加(既計測モジュール — seam-placement-measured-module。#922 が将来 sensor から消費可能な形)。

- AC-1a: **含意形** — [Answer] タグに非空の記入(裁定待ち文言以外のコンテンツ)がある場合に限り、同ファイルに (i) 裁定参照(E-code パターン `E-[A-Z0-9-]+`)または (ii) leader 承認タイムスタンプ行(ISO 8601 が抽出できる「承認」行 — L1 証跡様式)の**いずれか**の実在を要求。**無条件通過は3形**: [Answer] 空欄(タグ後が空白/裁定待ち文言/「(なし)」/「N/A」のみ)/ **[Answer] タグ自体の不在(E-OC1 標準「0問」様式 — RE 是正時再実測: 本 intent 8ファイル全てが該当、[Answer] 形は 260712 以前の実質問 intent に実在)**/ questions ファイル不在
- AC-1b: 戻り値は判別可能な3値以上(pass / fail-no-evidence / fail-unparseable-timestamp)— parse-don't-validate(タイムスタンプは数値/Date に parse してから判定 — verification-numeric-parse。型不正は fail)
- AC-1c: 読み取り専用(record への書き込みなし)

## FR-2: gate-start 配線(fail-closed)

`handleGateStart`(amadeus-state.ts :1661)の `validateSlugInState` 後・`setCheckbox` 前に検査を挿入。

- AC-2a: fail 時は既存 `error()` 経路(exit 非0・STAGE_AWAITING_APPROVAL 非 emit・checkbox 遷移なし — withAuditLock 内でアトミック)。エラーメッセージは wireframes.md の verdict 別文言(是正手順つき)に一致
- AC-2b: questions パスは handleGateStart が持つ stage 解決から導出(`<record>/<phase>/<slug>/<slug>-questions.md`)— ハードコード列挙なし
- AC-2c: 通過時は既存出力に変更なし(無音通過 — 出力契約どおり)
- AC-2d: 発火は gate-start 時のみ(approve/advance 等へ追加しない — 過去 record への遡及なし)。**遡及なしの実装形(レビュー遡及訂正、PR #1106 e1 Critical)**: intent record dir の YYMMDD 接頭辞 ≥ 260716 の intent のみ enforcement(それ以前の intent は unpark→gate-start でも素通し — 実 corpus 59/111 の旧様式 questions を偽ブロックしないため。sweep 実測: 86ファイル中 pre-guard 68 skip / enforced 18 / fail 0)

## FR-3: 落ちる実証3系(Mandated+クロスレビュー確定)

- AC-3a: 注入(i) [Answer] 記入+証跡なし → 拒否をテストで固定(gate-start spawn or in-process で exit/error 検証)
- AC-3b: 注入(ii) 承認行が非タイムスタンプ文字列 → 拒否(型不正 — verification-numeric-parse 同族)
- AC-3c: 注入(iii) **正常系非拒否** — 証跡付き記入+承認行あり → gate-start 成功、および questions 不在 → 成功(偽陽性側の固定)
- AC-3d: テストは in-process seam(lib 述語の直接駆動)+gate-start 統合面の最低1本。size purity 準拠の配置

## FR-4: 検証(既存ゲート準拠)

- AC-4a: typecheck / lint exit 0、`bun scripts/package.ts`+`promote:self` で8コピー同期、dist:check / promote:self:check exit 0
- AC-4b: registry 再生成(TOOL_DESCRIPTORS 変更なしの見込みだが gen-coverage-registry --check green を確認)
- AC-4c: push 前ローカル lcov で新規行 zero-hit 0(配線行含む — lcov-wiring-line-checklist)
- AC-4d: dogfooding — 本 intent の後続 gate-start が新検査を通過することを実測。**駆動分岐の明示**: 本 intent の questions は [Answer] 不在形のため dogfooding が駆動するのは「タグ不在→無条件通過」分岐のみ — [Answer] 記入形の通過/拒否分岐は AC-3a〜3c の注入テスト(実在する 260712 系の実データ様式を fixture 化)が担保し、dogfooding を全分岐の代替にしない(検証劇場回避)

## FR-5: クローズ条件

- AC-5a: Bolt 1(walking skeleton — 本機能自体が最小 e2e)着地後、**org.md walking-skeleton 既定(feature スコープ)によりユーザー明示承認まで停止**。(補足・agmsg 出典: leader FYI 2026-07-16T15:16:23Z が「就寝中 auto 承認は PR マージ限定、skeleton ゲートはユーザー帰還まで保留」を明確化 — git からは裏取り不能な運用連絡につき根拠は org.md 既定を正とする)。PR マージ後の着地 grep → Issue #1101 クローズ+ラベル除去は全 Bolt 完了後(単一 Bolt 想定なら Bolt 1 で完了)

## トレーサビリティ

| 要件 | 由来 |
|------|------|
| FR-1 | Issue #1101 検査案+含意形裁定+scope In-1/In-5+seam-placement-measured-module |
| FR-2 | scope In-2/In-3+RE 挿入面台帳+wireframes 出力契約 |
| FR-3 | 割当指示(落ちる実証必須)+クロスレビュー3系確定+Mandated |
| FR-4 | project.md Mandated+local-lcov-pre-push |
| FR-5 | org.md walking-skeleton 既定(正)+close-after-landing-verification(leader FYI 15:16:23Z は agmsg 出典の運用補足) |

## スコープ外(明示)

- #922 の sensor 発火点追加(共有関数の消費側 — 別対応)
- E-OC1 手順ノルム改定・過去 record の遡及検査
