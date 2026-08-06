# Security Test Instructions — 260805-xrev-bug-batch

## 適用判断

本 intent に**セキュリティ NFR は存在しない**が、患部の性質上「認可・証跡の健全性」に直接触れるため、
その面の検証を記録する。SAST/DAST・認証・injection の新規試験は作らない（対象となる外部境界が無い）。

## 認可・証跡に関する検証（本 intent が固定したもの）

| 面 | 検証 | ファイル |
|---|---|---|
| reviewer の invocation 偽造 | 捏造 UUID の check-read / complete-review が fail-closed 拒否 | `t245` |
| reviewer の replay | 消費済み invocation の再提出を拒否 | `t245` |
| 完了認可の誤受理 | 別 Intent / 別 Goal の receipt を待機状態に畳まず error 経路へ | `t427` / `t453` |
| 計画実績の誤受理 | 過去計画（別世代）の SWARM 実績を現行の証拠に数えない | `t402` |
| 監査属性の消失 | 未登録属性が保存時に黙って落ちる経路を registry 登録で塞ぐ | `t379` |

## 秘匿情報

本 intent の変更は監査行へ**識別子と digest のみ**を書く（`Plan generation` は DAG 構造の SHA-256 前12桁）。
prompt 本文・ツール引数・絶対パス・資格情報は書かない。redaction の allow-list は event registry から導出されるため、
新属性は明示登録した 4 イベントに限る。

## 実行

```bash
bun run no-silent-drop -- --base-revision <base>   # 沈黙の失敗の混入検査
bun tests/unchecked-cast-guard.ts --check          # 未検査キャストの ratchet
```
