# Business Rules — u5-advisories-channel

上流入力(consumes 全数): unit-of-work, unit-of-work-story-map, requirements, components, component-methods, services

## BR-U5-1: 消費側棚卸しが実装の前提

directive JSON へフィールドを足す前に、`next` の stdout を parse する全消費側(テスト・ツール・ハーネス表層)を repo grep で棚卸しし、目録を実装 PR 本文に記載する(FR-B2 AC、stderr-addition-consumer-grep の stdout 面)。棚卸しで「未知フィールドを拒否する strict parser」が見つかった場合は実装前に停止し報告する(逸脱裁定)。

## BR-U5-2: 文言は変えない

Advisory.message は既存の stderr 文面(amadeus-plugin-activation.ts:209/:211)と同一文字列。文言変更は本 Unit のスコープ外(変えると既存の文言 assert テストが壊れ、変更理由もない)。

## BR-U5-3: ラッチは fail-open

ラッチファイルの読み書きに失敗した場合は「未ラッチ」として扱い emit する(通知の欠落 > 重複の害。既存の fail-closed 判定方針 I3 と同じ向き — 発火側へ倒す)。ラッチ書込失敗も emit は行う。

## BR-U5-4: TDD 必須

u5 は挙動追加(純移設ではない)のため TDD 既定が適用される(NFR-2、component-methods.md C4/C5 の seam 契約に対して)。Red 実測 → 最小実装 → Green の vertical slice: (1) advisories フィールドの出現/非出現 (2) 発火点3点の発火/沈黙 (3) ラッチの重複抑止 (4) stderr 併用維持 **(5) `--single` 経路(emitSingleRunStage)での発火 — stage-runner スキル経由の CP1/CP2 が主経路テストの盲点にならないこと**。テスト採番は t378(advisories)+t381(発火点+ラッチ)(decisions.md 予約)。

## BR-U5-5: 落ちる実証

新設ガードではないが、テスト自体の実効を注入で確認する: 発火条件下で advisories を意図的に空にする変種で t378 が赤くなること(inject-runtime-consumed-lines — 型でなく実行時消費行へ注入)。

## BR-U5-7: stale コメントの明示改訂

実装時に amadeus-orchestrate.ts:1297-1299 の既存コメント(「single guarded call site — emitForSlug — so no latch is needed for BR-U6-8」)を2経路+ラッチの実態へ書き換える — 旧不変条件の宣言を残すと後続読者を誤誘導する(cg-invariant-conflict-explicit-revision の明示改訂)。

## BR-U5-6: 検証コマンド集合

BR-U1-6 と同一(typecheck / lint / dist:check / promote:self:check / run-tests.sh --ci+ローカル lcov)。正本変更は core のため dist 7 ハーネス+self-install の再生成を同一 PR に含める(NFR-3)。
