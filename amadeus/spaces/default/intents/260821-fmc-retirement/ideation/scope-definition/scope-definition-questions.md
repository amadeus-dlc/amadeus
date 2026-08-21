# Scope Definition Questions — 260821-fmc-retirement

Intent: 260821-fmc-retirement / Depth: Standard(予算 最大8問、本ステージは3問で構成)
承認エビデンス: full autonomy grant(grant_id intent-grant-b79b828bb98fb4abcaaf2dd74c1a6a44、2026-08-21T03:22:00Z コミット)。各 [Answer] は既決裁定の機械適用または本 grant 下の一意導出であり、provenance を併記する。

## Q1: 153 参照テストファイルの扱いの基準は?

- A) FMC 専用テストは削除、FMC を一部参照するだけの混在テストは FMC 依存部分のみ除去 — 「参照 0 hit」を成功基準に機械判定
- B) 153 ファイル全削除
- C) 全ファイルを個別裁定
- X) その他

[Answer]: A — 一意導出。B は FMC 以外の被検面(例: t146 core-hygiene の一般衛生検査が fmc パスを標本に使うだけのケース)を巻き添え削除して P5(surgical)に反する。基準は「そのテストの被検 subject が FMC か否か」で、requirements 段で 153 件を機械分類(検索述語併記)する。

## Q2: ci.yml の formal-model-check job 除去の受け入れ条件は?

- A) `ci-success` 集約の require_result から除去 + job 定義削除 + 除去後の CI green を merge queue 実測 — 集約の needs 整合を同一変更で保つ
- B) job を if:false で無効化して残す
- X) その他

[Answer]: A — 裁定「完全退役」の直接適用。B は org.md Forbidden(要求されない二重実装・シム)違反。blocking 集約の整合は cid:code-generation:c1-2814-aggregate-needs-is-blocking に従い「赤が止めるか」面を同一変更で検証する。

## Q3: 退役の配送単位(Bolt 分割)の制約は?

- A) 単一 Bolt PR を志向しつつ、規模上分割する場合も各 PR 単独で CI green を保つ順序(テスト+コード同時削除)に固定。walking-skeleton gate(self-feature 必須)は最初の Bolt に維持
- B) レイヤー別に自由分割(中間状態の赤を許容)
- X) その他

[Answer]: A — Mandated「self-feature は最初の Construction Bolt に walking-skeleton gate を維持」+ NEVER「赤いスイートを完了として報告しない」の機械適用。B はトランクの緑を壊す。multi-member bolt の per-unit PR 配送禁止(cid:pr-convergence:c2-multi-member-single-pr-interim)にも整合。
