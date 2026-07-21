# Business Logic Model — U1 tie-choice-resolution

上流入力(consumes 全数): requirements.md、components.md、component-methods.md、services.md、unit-of-work.md、unit-of-work-story-map.md — フローは component-methods.md の相互排他分岐設計を requirements.md FR-1〜FR-3 へ写像、CLI 契約面は services.md の verb 変更表、変更ファイル境界は components.md の変更一覧、検証境界は unit-of-work.md U1 完成条件、誤裁定シナリオは unit-of-work-story-map.md のジャーニー2行目(loud 拒否)から導出。

## フロー: hold-resolved(tie)

```
report --result hold-resolved --resolution <値>
  → 状態検証(state=hold、tally.kind=hold — 既存 :194-200 無変更)
  → 分岐: t.result.reason === "tie" ?
     yes → parseChoiceResolution(resolution)
            → null | internalNo 非実在 → loud 拒否(exit 1、valid ヒント = choice:<n> 実在列挙)
            → 実在 internalNo → resumedTo = "tallied"
     no  → HOLD_RESOLUTIONS[reason] テーブル検証(現行 :201-207 の移設 — 検証条件・文言無変更)
  → DURABLE append(HoldResolution { reason, resolution, resumedTo, at } — 既存 :211-221 無変更)
  → 状態遷移(→ tallied)
```

## フロー: render(tie 裁定済み)

```
handleRender → readTally → finalRuling(resolutions 末尾)
  → parseChoiceResolution(finalRuling.resolution)
     → n(choice 形)→ rulingOverride = `裁定: <label>(choice <n> — tie 裁定)`(label = electionChoices の internalNo 一致)
     → null(二値 = 他 reason 由来)→ 旧形 `裁定: 採用/不採用`(無変更)
  → renderPersistDraft(..., rulingOverride)(record.ts 無変更 — 既設 seam)
```

## 検証境界

- 入力検証は handleHoldResolved 到達時の1点(システム境界)— store 保存後の resolution は検証済みとして carry-forward(parse-don't-validate: 受理境界で正当性確定、下流は再検証しない)
- render 側の parseChoiceResolution は「表示形の選択」であり再検証ではない(不正値は受理境界で構造的に排除済み。旧 record の二値 resolution は null 側へ落ち旧形描画 — 後方互換の分岐ではなく他 reason の正常系)
