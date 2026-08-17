# Code Generation Plan — unit source-work-probe(Bolt 4 / FR-4 / #3156)

方式裁定は不要(Issue #3156 完了条件が実装形を規定 — decisions.md 参照のとおり)。実装は「マージ済み Bolt PR のコードコミットが record ブランチ履歴に包含されることの検出」を第4プローブとして追加し、sibling 誤帰属防止の attribution 原則を維持する。テスト戦略 = Comprehensive。TDD 必須。

トレーサビリティ: 全ステップ → FR-4(#3156)。

- [ ] Step 1: Red — #3156 の実形状(record 初コミット(birth)がコードコミット群より後 + bolt ブランチが HEAD 祖先 + squash 件名に issue 参照なし)を合成 git repo fixture で再現し、`gitHasSourceWork` / `evaluateStageArtifacts` 相当の判定が false(拒否)になることを Red として実測(t206 seam。クロスレビュー r1 の synthetic-repro 構成を雛形に)
- [ ] Step 2: 第4プローブ実装 — `intentScopedSourceWork`(amadeus-state.ts:2622-2632)の短絡連鎖に、intent 帰属の実在ソース作業を birth 非依存で検出するプローブを追加。帰属キーは intent の宣言 issue 群(`intentIssueRefs`)/ bolt ブランチ(`boltRefsForSlug` + 命名規約)への帰属を要求し、sibling intent のコードだけでは true にならないこと
- [ ] Step 3: 両側テスト — (i) #3156 形状で受理(approve 相当の判定が true) (ii) sibling intent のコードのみが存在する形状で従来どおり拒否。既存3プローブの挙動は byte-for-byte 非退行(t206 / t185 の既存ケース green)
- [ ] Step 4: 新プローブの落ちる実証 — プローブ述語への欠陥注入 → 対応テスト赤 → revert 完了を1セットで実施し残渣ゼロを機械確認(FR-4 受け入れ(c))
- [ ] Step 5: 台帳 resync — `amadeus-state.ts` 変更に伴う model-map 実装ハッシュピン(`updateModelMap --impl-only`)+ allowlist セレクタ確認。新規テストファイルの coverage-registry regen
- [ ] Step 6: `bun run build`(t206 は dist 経由 import — build 後の dist 断面で green を確認)+ typecheck / lint / 対象テスト green。フルスイートは push 後 CI(push-first)

除外(スコープ外): AMADEUS_SKIP_ARTIFACT_GUARD バイパスの変更(現状維持)。docs-only 免除経路(#499/#848)の変更。
