# Feasibility Assessment — 260722-space-record-catalog

上流入力(consumes 全数): intent-statement(intent-capture 産)。competitive-analysis / market-trends / build-vs-buy は market-research が本スコープで SKIP のため設計上不在(N/A — 補完しない)。

測定 ref: leader worktree HEAD 0940bdf84(2026-07-22 実測。以下の件数はすべてこの tree 上のコマンド出力からの転記)。

## Technical Viability — 判定: GO

intent-statement の完了定義(整理 ADR+裁定記録+ミラー化)に対する技術的障害は観測されなかった。主要な実測結果:

1. **Intent の createdAt は全件決定論的に導出可能**: `intents.json` 全66エントリの uuid はすべて UUIDv7(version nibble = 7 を全件確認)。先頭48ビットが UNIX ms であり、実例で `019f3868-…` → `2026-07-06T17:10:08.806Z` が dirName `260706-…` と整合した。#1309 の移行方針「UUIDv7 から導出」は実現可能(仮説でなく実測)。
2. **選挙の createdAt 導出には例外2クラスがある**: `election.json` は日時フィールドを一切持たない(keys: electionId/kind/question/choices/voters/state を実測)。`timeline.json` は全103選挙に存在するが、最初のイベント種別は distributed 76 / ballot 25 / 空配列 2。よって導出規則は「timeline の最古イベント(kind 不問)」とし、**空 timeline 2件のフォールバック規則が設計時に必要**(#1309 の「timeline.json の最初のイベントから導出」は 25+2 件で字面どおりには開催時刻を意味しない)。
3. **レジストリ乖離は現実に存在する**: 本 tree で intent 実ディレクトリ65 vs `intents.json` 66。dirs 側のみ3件(`260710-p3-cleanup-batch5`、`260720-goa-sparse-family`、`260720-leader-store-sync`)、registry 側のみ4件(`260706-installer-impl` ほか)。ブランチ間スキューの可能性を含むが、いずれにせよ「正本とビューの drift を検出できる」受け入れ基準の必要性を裏付ける一次証拠である。
4. **規模は小さい**: 65 intent dirs+103 elections。投影(一覧ビュー)の全量再生成は決定論的かつ低コストで成立し、増分更新機構は初期には不要。

## Risk Analysis

- **高**: なし(本 intent は設計整理であり実装・rename を含まない)
- **中**: 「レコード」語の混在が残る既存文書との整合(裁定済みの「ライフサイクルレコード」で新規成果物は統一できるが、既存 docs の全面改稿は本 intent 非目標 — 将来の実装 intent に委ねる)
- **低**: 選挙 createdAt の例外2クラス(導出規則の設計で吸収可能)、registry 乖離の解消方針(union 解消の既決ノルム cid:intents-json-union-resolution が参照モデルになる)

## AWS / Platform Perspective(support: aws-platform)

本 intent はリポジトリ内ファイル設計のみでクラウド資源に接触しない。AWS ランドスケープ評価は N/A(反証可能な根拠: デプロイ基盤を持たない project.md Deployment 節、intent スコープに infra 要素なし)。

## Compliance Perspective(support: compliance)

個人情報・規制対象データは扱わない(record は開発工程メタデータのみ)。規制要件 N/A(根拠: 対象データは公開リポジトリの開発記録で、PCI/HIPAA/データレジデンシの適用面が存在しない)。監査整合性(append-only audit の非破壊)は constraint-register に技術制約として記載。
