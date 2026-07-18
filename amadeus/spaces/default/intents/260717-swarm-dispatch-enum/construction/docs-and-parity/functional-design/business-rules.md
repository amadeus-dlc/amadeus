# Business Rules — docs-and-parity(swarm-dispatch-enum / Issue #1157)

上流入力(consumes 全数): `unit-of-work.md`、`unit-of-work-story-map.md`、`requirements.md`、`components.md`、`component-methods.md`、`services.md`。

## ルール

- BR-D1(docs 表の同値): 08 節の decision 表は FR-1 表(U1 FD の16セル)と同値であること(受け入れ = 表セルの突き合わせ — code-generation で fixture 化するか手動照合を build-and-test で実測)
- BR-D2(FR-9 留保の遵守): opencode/cursor 言及は 08 既存節への1行のみ。新規ページ・新規節・dispatch 指示ファイルを作らない(受け入れ = 追加ファイル 0 の git status 実測+当該1行の grep 実在)
- BR-D3(C-15 開示): `reasoning_effort=ultra` の証拠限界(受理+child 完了まで・実適用 telemetry なし)を codex ガイドと 08 節に明記(受け入れ = 開示文の grep 実在。「実測済み」と読める表現の禁止)
## 同期・生成ルール

- BR-D4(対訳同期): `.md` を変更したガイドは対応する `.ja.md` を同一 PR で同期(受け入れ = 変更ファイル一覧の対の完全性 — 片側のみの変更 0)
- BR-D5(生成経路単一): dist/self-install への反映は package.ts / promote:self のみ(受け入れ = dist:check・promote:self:check green。手編集 diff の不在は生成再現性 check 自体が保証)
- BR-D6(旧値の docs 残存ゼロ): `AMADEUS_USE_SWARM=1` を有効値として記述する行の全撤去(受け入れ = docs 全域 grep — breaking removal の記述としての言及は許可、有効値としての記述は 0)
