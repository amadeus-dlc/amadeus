# Business Rules — setup-foundation

> ステージ: functional-design (3.1) / Unit: setup-foundation / 作成: 2026-07-08
> 出典: `../../../inception/requirements-analysis/requirements.md`(FR-002/006/012/016)、`../../../inception/application-design/decisions.md`(ADR-002/003)

## バージョン解決ルール(FR-006)

| ID | ルール |
|----|--------|
| BR-F01 | 既定解決の優先順位は「安定 Release → 安定 SemVer タグ」。両方空なら `no-stable-version` でファイル無変更終了 |
| BR-F02 | 「安定」= プレリリースセグメントなし・ドラフトでない。既定解決はプレリリースを**常に**除外する |
| BR-F03 | 最新判定は SemVer 数値順序。辞書順比較は禁止(`v1.10.0` > `v1.9.0`) |
| BR-F04 | `--version` 明示時は完全一致タグのみ。プレリリースは明示時のみ許可。見つからなければ `not-found` |
| BR-F05 | バージョン文字列は `v` プレフィックス有無を正規化して受け付ける(`1.2.3` ≡ `v1.2.3`) |

## 取得・リトライルール(FR-012、ADR-003)

| ID | ルール |
|----|--------|
| BR-F06 | 一時的失敗(DNS / 接続断 / 5xx / timeout)はちょうど1回自動リトライ。2回目の失敗で分類エラー |
| BR-F07 | 恒久的失敗(404 等の 4xx、rate-limit 除く)はリトライしない |
| BR-F08 | 403/429 は `rate-limit` に分類し「時間をおいて再実行」を案内する |
| BR-F09 | 1回の CLI 実行での GitHub API 呼び出しは最大2回(releases+tags フォールバック)。アーカイブ取得は別枠 |
| BR-F10 | 展開結果に `dist/<harness>/` が存在しない場合は `payload-invalid` — 部分的な展開結果を導入に使わない |

## マニフェスト不変条件(FR-016)

| ID | ルール |
|----|--------|
| BR-F11 | マニフェストパスは `amadeus/.installer/amadeus-setup-manifest.json` に固定 |
| BR-F12 | `schemaVersion` 必須。未知の schemaVersion は読み取り拒否(ManifestError) — 将来の移行はバージョンで判定 |
| BR-F13 | `files[]` の各エントリは path/class/required/md5 必須。`class ∈ {owned, shared, user-preserved}` |
| BR-F14 | md5 は配布物内容から計算(次回 upgrade の期待値)。`installedAt` = 操作開始時刻 = バックアップ `$timestamp` |
| BR-F15 | マニフェスト不在は正常系(未導入/手動導入)であり、エラーではなく `null` を返す |

## パッケージ骨格ルール(FR-001/002、ADR-002、team.md)

| ID | ルール |
|----|--------|
| BR-F16 | `packages/setup/package.json` は `license: "(MIT OR Apache-2.0)"`、`repository: https://github.com/amadeus-dlc/amadeus` — root の不備を継承しない |
| BR-F17 | 実行時依存ゼロ(`dependencies` 空)。ビルド時依存のみ許容(NFR-005) |
| BR-F18 | lint(Biome)/型検査(tsc)の配線は本パッケージ追加と同一 PR(team.md Mandated) |
| BR-F19 | publish 対象は `dist/cli.js` + README + LICENSE 2種のみ(`files` フィールドで固定 — FR-018 の契約) |
