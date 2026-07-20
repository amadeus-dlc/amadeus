# Code Generation Plan — U1 tie-choice-resolution

上流入力(consumes 全数): business-logic-model.md、business-rules.md、domain-entities.md、performance-design.md、security-design.md、unit-of-work.md、requirements.md

## 実装計画

- [x] Step 1: 現行 `scripts/amadeus-election.ts` と既存選挙テストを再列挙し、`HOLD_RESOLUTIONS`、`handleHoldResolved`、`handleRender`、`renderPersistDraft` の現行契約と e4 並行変更面の非交差を確認する（FR-1〜FR-5、BR-1〜BR-8）。
- [x] Step 2: `parseChoiceResolution` を module-scope の純関数として実装し、`choice:<正整数>` の構文解析を型付き結果へ変換する。tie 以外の語彙テーブルと既存遷移は変更しない（FR-1、BR-1、BR-3、NFR-2）。
- [x] Step 3: `handleHoldResolved` を tie／非 tie の相互排他分岐にし、tie では election choice の実在照合、valid hint 付き loud failure、`tallied` 復帰、検証後の durable append を実装する（FR-1、FR-2、BR-2、BR-4、BR-6、S-1、S-2、R-1）。
- [x] Step 4: `handleRender` の `rulingOverride` を choice resolution に対応させ、`裁定: <label>(choice <n> — tie 裁定)` を `renderPersistDraft` へ渡す。非 tie の二値描画は維持する（FR-3、BR-5、P-3）。
- [x] Step 5: pure parse の unit テストと、tie hold→choice resolution→tally 永続化→render の integration テストを追加する。happy path、二値拒否、非数値・先頭ゼロ・非実在 choice、非 tie 回帰を実測し、`t238` と `t241` は非接触を確認する（FR-4、FR-5、Comprehensive test strategy）。既存 Bun runner を使うため test configuration は変更しない。
- [x] Step 6: `.claude/skills/amadeus-election/SKILL.md`、`.agents/skills/amadeus-election/SKILL.md`、`contrib/skills/amadeus-election/SKILL.md` に、単一提案型は二値・多肢 tie は `choice:<n>` を使う1行を同一内容で追加し、3面の同期を機械確認する（FR-4、BR-7）。正本・配布境界の設計に従い `dist/` 再生成は行わない。
- [ ] Step 7: 対象テスト、typecheck、lint、coverage、dist/self-install drift guard、`--ci` を実行する。fix commit 後に pre-fix 面へ限定切替して新規テストの赤を実証し、fix commit SHA で復元して全 green を再確認する（FR-4、FR-5）。

## 完成条件

- tie の二値入力は無音受理されず、valid choice hint を伴って exit 1 になる。
- `choice:<internalNo>` は実在 choice のみ受理され、tally.json の resolution と record.md の勝者表示へ一貫して反映される。
- block、discussion-needed、quorum-short の既存語彙・エラー・復帰先は不変である。
- 新規・変更行は lcov で被覆され、呼び出し配線行・catch/brace・process.exit 隣接行の未被覆がない。
- 変更は `scripts/amadeus-election.ts`、関連テスト、SKILL 3面、および本 unit の code-generation 成果物に限定される。

## 承認

常任グラント `1d87113b`（stage-gates、plan approval を含む）により自動承認。設計逸脱または既存様式への準拠判断が必要になった場合は実装前に停止し、leader へ選挙を依頼する。
