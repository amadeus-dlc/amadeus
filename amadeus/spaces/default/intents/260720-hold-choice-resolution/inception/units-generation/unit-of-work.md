# Unit of Work — 260720-hold-choice-resolution

上流入力(consumes 全数): requirements.md、components.md、component-methods.md、services.md、component-dependency.md、decisions.md — 単一 unit の中身は components.md の変更一覧4行と component-methods.md の全設計(tie/非-tie 相互排他分岐・parseChoiceResolution・rulingOverride 拡張)、外部面は services.md の CLI 契約変更、方式根拠は decisions.md ADR-1〜3 に依拠する。

## U1: tie-choice-resolution

- **内容**: FR-1〜FR-4 の全実装 — (1) HOLD_RESOLUTIONS.tie 空化+handleHoldResolved の tie/非-tie 相互排他分岐(parseChoiceResolution+choices 実在照合、fail-closed、valid ヒント) (2) rulingOverride 合成の choice 形拡張(`裁定: <label>(choice <n> — tie 裁定)`) (3) SKILL.md 使い分け1行×3面同期 (4) テスト(tie 閉包・loud 拒否・render 貫通・旧形回帰ピン確認・落ちる実証 E-GMECG 手順)
- **規模**: 実装 ~49行(components.md の見積り 38+8+1×3 = 49 — 機械再計算 `python3 -c "print(38+8+1*3)"` → 49)+テスト ~110行 = 合計 ~159行(≒ components.md の合計160行表記)
- **受け入れ条件**: FR-1(choice:<n> 受理・二値/不正の loud 拒否)、FR-2(resolution 文字列永続化・carry-forward 無変更)、FR-3(record.md 勝者描画)、FR-4(閉包テスト+落ちる実証+docs)、FR-5(t238/t241 非接触)。検証 = typecheck / lint / --ci / 対象テスト green+落ちる実証の赤実測
- **依存**: なし(単一 unit)

## 分割判断

要件全体が election.ts 単一ファイル+docs 1行+テストの凝集変更(~160行)であり、分割は worktree 数と統合検証を増やすだけ — 単一 unit とする(AD component-dependency.md の依存辺追加ゼロと整合)。
