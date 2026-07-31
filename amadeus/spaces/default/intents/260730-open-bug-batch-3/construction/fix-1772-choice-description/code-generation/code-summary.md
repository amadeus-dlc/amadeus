# Code Summary — fix-1772-choice-description

上流入力(consumes 全数): requirements.md — FR-2a〜2d の充足状況を本書で対応付ける。

## 実装(PR #1809、branch bolt/fix-1772-choice-description、head bd0fff9f1)

- **FR-2a**: `packages/framework/core/tools/amadeus-election-model.ts` の `Choice` に任意 `description?: string` を追加し、`parseChoices` で保持。present な非 string は fail-closed(parse 失敗)、不在はキー省略(null にしない — `parseKindRef` と同じ既習の読みで、レビュー指摘を受け契約としてテスト固定)。
- **FR-2b**: `DistributionView` に `question` と choice ごとの `description` を追加し、`shuffleView` が搬送。投票者は設問文と選択肢本文を配布 view から受け取れる。
- **FR-2c**: BR-2 キー集合契約の明示改訂 — `tests/unit/t234-election-model.test.ts` のキー集合 verbatim assert(`["electionId","ordered","question","voter"]`+entry 側)と `amadeus-election-model.ts` の設計コメントを新集合へ改訂。**中核禁止(推薦マーカー・先行票・peer status の不搬送)は不変**で、網羅的キー集合 assert がその執行機構として維持(混入すれば assert が落ちる)。
- **FR-2d**: `amadeus-election-record.ts` は label 主表記のまま無改変。
- 付随: SKILL.md 定義 JSON 規定へ description 追記、docs/guide/20-team-mode{,.ja}.md の定義例を同一変更で英日同期、TLA model-map sha256 再ピン(FormalElection.tla は選択肢を抽象 identity として扱い label/description/view をモデル化しないため意味論不変 — #1808 と同一手順)、7ハーネス dist+self-install 再生成。

## テスト(FR-2 受け入れ基準との対応)

- 基準1(Red→Green): description 付き定義で view に description+question が存在することを assert。Red 45 pass/5 fail(exit 1)→ Green 50 pass/0 fail(exit 0)実測。
- 基準2: 改訂後キー集合 assert が新契約を固定し、推薦マーカー等の非出現を網羅 assert で維持。
- 基準3: description 無し定義の受理+view のキー省略(null でなく不在)を契約としてテスト固定。

## 検証(個別直書き・exit code 実測)

typecheck 0 / lint 0 / dist:check 0 / promote:self:check 0 / フル CI 0(RESULT: PASS、9383 assertions)/ election 系11ファイル 0(118 pass、実在 11/11 照合)/ e2e t237 0 / complexity 0(parseChoices CCN 12<15)/ coverage registry 0 / patch gate 0(added 11 / covered 11 / uncovered 0)/ GitHub CI 全 green(head bd0fff9f1、fail-fast watch exit 0)。

## 同根棚卸し

view キー集合を verbatim assert する箇所は全数 grep で t234/t236 の2件のみ(両方改訂済み)。internalNo 参照 18 ファイルにキー集合契約依存なし。allowlist 行ピンは対象ファイル 0 件で remap 不要。

## 申し送り(ゲートで開示)

CodeRabbit が SKILL.md の日本語追記を「コメント英語規約」違反と指摘。当該ファイルは本文全面日本語の既存構成(#1609/#1643 由来)のため既存に整合させたが、「skill 本文の言語方針」自体は FR-2 範囲外の方針判断として別 Issue 起票が適切(CodeRabbit は本判断を受け指摘撤回)。
