# Requirements — s13-label-clarity(Issue #609)

> 上流入力: Issue #609(クロスレビュー2名 — e1 2026-07-11 監査+e4 2026-07-16 現存判定)、codekb `code-structure.md`「§13 learn-candidate ラベリング面」節(RE 実測)、`re-scans/260716-s13-label-clarity.md`。
> 既決照合: 修正方向=leader 割当(否定例明記)、配置先=RE 2段列挙で L960 単独、決定的ガード新設は非採用(bugs-only 整理)。明確化質問 0 問(questions ファイル冒頭の判定参照)。

## FR-1: §13 Step 3 への否定例の明記

`packages/framework/core/amadeus-common/protocols/stage-protocol.md` §13 Step 3(生成ツリーの L960 相当 — 「render one option whose `label` is the candidate `summary` (verbatim)」)に、Issue #609 の実観測形を否定例として追記する。

- AC-1a: 否定例は **ID 単独ラベルの禁止形**を含む(例: `❌ "Persist c5 only (Recommended)" — an option label carrying only the candidate id is a protocol violation; the human cannot judge it`)— 実観測(Issue #609 スクリーンショット)由来の形を verbatim 素材にする
- AC-1b: 肯定形(label = summary verbatim)の既存規定文は**変更しない**(追記のみ — 既存挙動・意味論の保存)
- AC-1c: 追記位置は Step 3 の label 規定文の直後(L960 の同一段落内または直下)— RE 確定の「配置一意性契約」(L960 単独、L19/L577 は対象外)を維持し、他の箇所へ重複追記しない

## FR-2: 生成物同期(Mandated)

- AC-2a: 正本編集後 `bun scripts/package.ts` + `bun run promote:self` で全ツリー同期、`bun run dist:check` / `bun run promote:self:check` exit 0
- AC-2b: `.claude/` 等の生成ツリー直編集はしない(Forbidden)

## FR-3: 検証(docs prose 変更の性質に即した実測)

- AC-3a: 追記後の L960 相当行を全ツリー(core/self-install ×2/dist ×5)で grep し、否定例が同一に存在することを実測(件数は実ファイル列挙から機械再計算)
- AC-3b: `bun run typecheck` / `bun run lint` exit 0 + **実装時に `grep -rln "stage-protocol" tests/` で関連テストを再列挙**(起草時実測: 専用ファミリは t86-stage-protocol-section-13(smoke)+ t34/t35/t36/t37-stage-protocol-*(integration)の5本 — 3段列挙の実装時再確認を必須とする)し、該当テストを実行して green を確認
- AC-3c: 「落ちる実証」の適用整理: 本修正は**決定的ゲートの新設ではなく prose 契約の強化**のため、Mandated「新設のゲート・検証スクリプト・チェックは落ちる実証」の適用外(検査機構を新設しない)。**ただしこれは「リグレッションテスト追加が不要」を意味しない — bugfix の Testing Posture(org.md)によるリグレッションピンは AC-3d で別途要求する**。将来 §13 レンダリングの決定的ガードを作る場合(#609 選択肢 b)はその intent で落ちる実証を行う
- AC-3d(リグレッションピン+スイート green、org.md Testing Posture 由来): (i) `tests/smoke/t86-stage-protocol-section-13.test.ts`(起草時実測: 否定例・verbatim 文言のピンなし)に、**追記した否定例文言の存在を検査する assertion を追加**する — 将来の編集で否定例が消えたらテストが赤くなる永続ピン(prose 修正を LLM 読解依存から検査依存へ引き上げる — 本 Issue の再発機序への対称手当)。assertion 追加時は「否定例を削除すると赤くなる」ことを削除注入で実証する(こちらは新設 assertion なので落ちる実証の対象) (ii) `bash tests/run-tests.sh --ci` 相当のスイート green を維持(既存赤はベースライン記録+実文帰属)

## FR-4: クローズ条件

- AC-4a: PR マージ後、着地面 grep(否定例文字列の main 実在)を確認して Issue #609 を手動クローズ(close-after-landing-verification)。クローズコメントに「仕様面は L960 で既定済み・本修正は LLM 逸脱抑止の契約内例示」の整理(2人目レビューの現存判定)を引用する

## トレーサビリティ

| 要件 | 由来 |
|------|------|
| FR-1 | Issue #609 受け入れ条件 **AC1(ID 単独ラベル禁止の明文化)** + leader 割当の修正方針 + RE L960 単独確定 |
| FR-2 | project.md Mandated(正本編集+dist 同期) |
| FR-3 | org.md Testing Posture(bugfix = リグレッションテスト追加+スイート green)+ evidence-discipline + ledger-count-mechanical-recalc + 落ちる実証の適用範囲判断 |
| FR-4 | close-after-landing-verification |

**Issue #609 受け入れ条件4項の充足マップ**(QA 用): AC1(ID 単独ラベルにしない)= **本 intent の修正対象**(FR-1)。AC2(候補 ID と内容の対応が同一画面で分かる)/ AC3(保存内容の要約表示)/ AC4(複数候補でも ID 非依存)= **既存 L960 規定(label=summary verbatim+description=routed destination)で充足済み**(e4 クロスレビュー 2026-07-16 の現存判定 — 仕様面は解消済み、欠陥は遵守面)。本修正は AC1 の明文化+AC-3d のピンで遵守面を強化する。

## スコープ外(明示)

- AskUserQuestion レンダリング前の決定的 label 検査ガード(#609 2人目レビュー選択肢 b)— bugs-only 判断で非採用、必要が実測されたら別 Issue
- `amadeus-learnings.ts` のコード変更 — surface 出力(summary/context)は完備済みで欠陥なし(RE 実測)
