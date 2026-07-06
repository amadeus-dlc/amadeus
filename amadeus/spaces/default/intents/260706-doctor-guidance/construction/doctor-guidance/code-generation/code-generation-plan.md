# コード生成計画 — unit: doctor-guidance

上流入力は requirements.md（FR-1〜FR-4、NFR-1〜NFR-2、AC 4 行）である。
scope bugfix により functional-design は SKIP（設計どおりの不在）。設計判断は requirements の実装形確定（2 状態分離）と本書に記録する。
Test Strategy は Minimal（要件駆動。TDD: RED 先行）。実行単位は単一 unit / 1 PR（draft 作成 → 3 条件充足で Ready 化）である。

## トレーサビリティ

| Step | 対応要求 | 対象 |
|---|---|---|
| Step 1 | FR-3.1 / FR-3.2 | RED 先行: installer eval へ #573 一連（12 検査）を追加 |
| Step 2 | FR-1 | doctor の shell 検査を 3 分岐へ分離 |
| Step 3 | FR-2 | installer smoke pass 時の info 行 |
| Step 4 | FR-4 | parity reason entry 追記 |
| Step 5 | FR-3.3 / AC #4 | 回帰確認（test:all、parity、validator） |
| Step 6 | 成果物契約 | code-summary.md |

## 実行ステップ

- [x] **Step 1: installer eval の RED（FR-3.1/FR-3.2）** — makeFreshWorkspace()（memory 非 seed）を追加し、「導入 → installer exit 0 + info 行 → doctor exit 0 + advisory marker + dist/ 文言なし → 実 CLI birth → advisory 消滅 → harness dir 削除 → doctor fail + installer 再実行誘導」の 12 検査を追加。実装前に 7 検査の FAIL（RED）を確認（birth 後の 3 検査は現行挙動で pass = FR-1.3 の回帰ガード）。
- [x] **Step 2: FR-1 実装** — amadeus-utility.ts の shell 検査を 3 分岐へ: (a) `harnessDir()` 不在 → fail、fix = `re-run the installer: bun scripts/amadeus-install.ts --target <workspace>`（dist/ 文言廃止）。(b) memory 未 seed → pass、label = `workspace shell pending first workflow — seeded at first intent birth (run your first /amadeus workflow)`（固定 marker で開始）。(c) 両方あり → 従来 pass。
- [x] **Step 3: FR-2 実装** — scripts/amadeus-install.ts の smoke pass 分岐で doctor 出力に固定 marker が含まれる場合に info 1 行（requirements の exact 文言）を表示。fail 側は不変。
- [x] **Step 4: FR-4** — parity-map exceptions へ #573 reason entry 追記（utility は engineFileExceptions 宣言済み、installer はローカルで対象外、skills/ 正準は対象なし）。
- [x] **Step 5: 回帰確認** — installer eval 12/12 GREEN、typecheck pass、parity:check ok、test:all exit 0（#554/#451 領域の既存 eval 含む）。
- [x] **Step 6: code-summary.md 作成**。

## 設計判断（bugfix scope の設計確定地点）

1. **判定契約は固定 marker の部分文字列一致**（構造化出力の新設は Right-Sizing 逸脱）。契約の共有は双方コメントの相互参照 + eval の両側検証で担保。
2. **eval の「dist/ 文言なし」assertion は shell 行に限定**（他検査行の dist/ は #573 スコープ外。全 stdout 検査は偽陽性）。
3. **FR-3.2 の破損状態は .claude と .agents/amadeus の両方削除**で作る（doctor の解決が harnessDir() 依存のため）。
