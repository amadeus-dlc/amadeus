# Reliability Design — metrics-observation

- **R-1(アトミック)**: `metrics/<captured_at>.json.tmp` へ書き(拡張子を .tmp 終わりにし、消費側の `*.json` glob に決して合致しない命名)→ Bun.write 完了待ち → `rename` で `.json` へ確定。同一 FS 内 rename の原子性が保証機構。**rename 前クラッシュの temp 残骸は放置**(確定契約の出力面(verdict 1行様式・exit code)に新しい挙動を追加しない — interaction-spec が正本。残骸は .tmp 拡張子により観測系に無害で、診断材料として残る)。
- **R-2(loud fail)**: fail-fast(最初の CollectorError で停止)。exit code とメッセージ様式は interaction-spec の契約。保証機構 = FR-4 注入テスト(collector 失敗・書き込み失敗・git 失敗の3系統)。
- **R-3(冪等)**: ファイル名 = captured_at 由来で衝突時は上書きせずエラー(同一秒の再実行は fault 扱い — 実運用で起きえないが握りつぶさない)。
- **R-4(分類)**: CollectorError に kind: "fault" | "defect" を持たせない(過剰設計 — 分類は運用判断であり型では固定しない。エラーメッセージの内容で判別可能に保つ)。
