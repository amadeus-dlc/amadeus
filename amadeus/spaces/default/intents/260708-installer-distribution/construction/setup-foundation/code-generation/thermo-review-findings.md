# Thermo-Nuclear Code Quality Review — setup-foundation(遡及監査)

> 実施: 2026-07-08 / 対象: コミット 3cb6026b2 のスナップショット / 判定: FINDINGS(致命傷なし、全件 behavior-preserving)
> 適用方針: Bolt 2(install-flow)のレビュー完了直後に保守パスとして一括適用(ビルダーと同一パッケージの同時編集を避けるため)

## 指摘(適用予定)

| # | 深刻度 | 対象 | 内容 | 改善 |
|---|--------|------|------|------|
| 1 | moderate | `ports/http.ts` | getJson/downloadArchive が許可ホスト検査→fetch→classify の約15行を完全重複 | `fetchChecked(url, timeoutMs): Promise<Result<Response, FetchError>>` を抽出し各メソッドを2〜4行に |
| 2 | moderate | `modules/fetcher.ts` | tar/gzip 展開(ファイルの約80%)が fetch+リトライと同居 — Http/リトライに無依存の独立単位 | `internal/tar-archive-extractor.ts` へ切り出し `extractTarGz(archivePath, extractDir, tmpWrite)` を公開。fetcher は download+retry+delegate の約50行に |
| 3 | moderate | `ports/fsops.ts` + `modules/manifest-io.ts` | `exists()` が readFile 全読みで存在確認し、権限エラー等も false に握りつぶす silent fallback。manifest-io の read() は exists→readText の二重読み | read() が readText 1回で ENOENT のみ null 扱い・他は表面化(exists 依存を除去)。exists 自体も access/stat 化 |
| 4 | minor | `modules/resolver.ts` | fetchTagNames/fetchReleaseTagNames が同型重複(変更理由同一 = GitHub API 形状) | 汎用 `fetchNames` ヘルパーへ収束 |
| 5 | minor | tests | `semver()` parse-or-throw が4テストファイルに重複、`fakePayload()` が2ファイルに重複 | `tests/lib/` の共有ヘルパーへ寄せる |

## 問題なしと確認された観点

1000行ルール(最大260行)/ internal ファクトリ群にパススルーなし / any 皆無・cast は検証済み境界のみ / classify・BR-F05・dispositionFor の既定分岐は BR 明記の意図した動作 / import type 規律による実行時循環なし。

## 申し送り(指摘外)

ports/ がインターフェースと本番実装を同居 — U2 の CLI 組み立て時に「ports=型のみ」慣習との乖離を意識。

## 適用結果(2026-07-08)

- 5件すべて behavior-preserving で適用(コミット a7cf757f6)。指摘3はフル案(ManifestError.io 既存 variant 使用、IoError へ optional notFound を ports 層追加 — 凍結 domain 契約無変更)
- 監査元による確認: 指摘1/2/4/5 は完全適用。指摘3 の適用が孤児化させた `FsRead.exists()`(呼び出し元ゼロ)を削除して APPROVED 条件充足(既存テスト無修正のまま 255ファイル・3809 assertion グリーン、ラッパー多重性注入の赤化再実証済み)
- 監査元の申し送り(指摘外): internal/ の意味論(domain ファクトリ専用 → tar-archive-extractor は I/O オーケストレーション寄り)が将来曖昧化する可能性 — 次に internal/ へ非ファクトリを置くときは modules/ との線引きを再考
