# Reliability Design — metrics-observation

- **R-1(アトミック)**: `metrics/.tmp-<captured_at>.json` へ書き→ fsync 相当(Bun.write 完了待ち)→ `rename` で確定。同一 FS 内 rename の原子性が保証機構。temp 残骸は次回実行時に警告(削除はしない — 診断材料保全)。
- **R-2(loud fail)**: fail-fast(最初の CollectorError で停止)。exit code とメッセージ様式は interaction-spec の契約。保証機構 = FR-4 注入テスト(collector 失敗・書き込み失敗・git 失敗の3系統)。
- **R-3(冪等)**: ファイル名 = captured_at 由来で衝突時は上書きせずエラー(同一秒の再実行は fault 扱い — 実運用で起きえないが握りつぶさない)。
- **R-4(分類)**: CollectorError に kind: "fault" | "defect" を持たせない(過剰設計 — 分類は運用判断であり型では固定しない。エラーメッセージの内容で判別可能に保つ)。
