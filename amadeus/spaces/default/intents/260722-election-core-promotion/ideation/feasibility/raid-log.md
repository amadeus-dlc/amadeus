# RAID Log — チーム機能のコア昇格

> 上流入力(consumes 全数): intent-statement(成功定義・スコープシグナルをリスク導出の起点として参照)
> 前 intent からの RAID 引き継ぎ: なし(本 intent は新規テーマ。feasibility:c2 の再実測対象となる先行 RAID は存在しない)

## Risks(リスク)

| ID | リスク | 影響 | 確率 | 緩和策 |
|---|---|---|---|---|
| R-1 | agmsg の公開入手経路が未確定のまま docs 執筆に到達し、prerequisite 節に入手方法を書けない | 中(クリーン環境 E2E の「docs だけで到達」が崩れる) | 中 | docs 執筆前に入手経路を確定(D-2)。確定しない場合は設計段でユーザーへ再エスカレーション |
| R-2 | herdr の CLI 面がバージョンアップで変化し、team-up.sh / fake-binary seam が破損 | 中(チーム起動の回帰) | 低〜中 | 動作確認バージョン(0.7.1)を docs・依存宣言に明記。fake-binary テストが seam の期待を固定し、変化を loud に検出 |
| R-3 | e2e クリーン環境テストが既存 CI の実行時間・負荷予算を圧迫 | 低 | 中 | serial 層の既存規律(fanout-load-settle 等)に従い配置。必要ならタグ分離 |
| R-4 | bash 実装の team-up.sh を配布面へ載せる際、ハーネス別投影・Windows 除外の整合が漏れる | 中 | 低 | T-3/T-5 の制約を設計段の明示観点にし、境界ガード+dist:check で機械検出 |

## Assumptions(前提)

| ID | 前提 | 検証状態 |
|---|---|---|
| A-1 | herdr / agmsg は利用者環境の PATH に存在し実行可能(bun と同格の必須 prerequisite) | ユーザー裁定(Q1、2026-07-23)— 設計の出発点として確定 |
| A-2 | サポート環境は macOS + Linux。Windows はチーム機能対象外 | ユーザー裁定(Q2)+herdr stable 面の実測 |
| A-3 | 選挙エンジンは Bun-only で外部依存なし | 実測(ソース5ファイルの import 走査は設計段で最終確認 — 現時点はテスト t234〜t244 green の間接根拠) |
| A-4 | 既存 e2e/integration 基盤(fake-binary、node-pty)がチーム機能の検証に再利用可能 | 実測(t-team-msg.test.ts、tests/e2e/ 現物確認)+ユーザー裁定(Q3) |

## Issues(顕在問題)

| ID | 問題 | 状態 |
|---|---|---|
| I-1 | 選挙スキル(.claude/skills/amadeus-election)が非配布面の scripts/amadeus-election.ts を参照する層またぎが現存 | 実測済み(SKILL.md compatibility 行)。昇格作業で解消し、境界ガードの「落ちる実証」実例に使う |
| I-2 | intent record 名(election-core-promotion)が確定スコープ(チーム機能一式)より狭い | 記録済み(intent-capture diary)。intent-statement が正スコープを定義して吸収 — リネームはしない |

## Dependencies(依存)

| ID | 依存 | 種別 | 備考 |
|---|---|---|---|
| D-1 | herdr(実測 0.7.1、OSS、macOS/Linux stable) | 外部必須 prerequisite | PATH 契約。不在時は loud エラー |
| D-2 | agmsg(実測 v1.1.6)— 公開入手経路の確定 | 外部必須 prerequisite+未決事項 | docs 執筆前に入手経路と配布条件を確定する(R-1/R-2 の対) |
| D-3 | bun(既存 prerequisite) | 外部必須 prerequisite | 変更なし |
| D-4 | 既存配布パイプライン(package.ts / promote-self / drift guards) | 内部 | 昇格の実行機構。変更不要の見込み(スキル投影面は設計段で確認) |
