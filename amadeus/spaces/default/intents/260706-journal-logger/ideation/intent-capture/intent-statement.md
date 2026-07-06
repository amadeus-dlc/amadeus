# Intent Statement — 260706-journal-logger（Issue #557）

## Problem Statement

leader の Intent 横断判断（ディスパッチ・調停・委任・体制変更）には記録の受け皿がなく、暫定的に運用ジャーナル Issue（#556）へ手動記録している。Amadeus の記録契約は Intent 単位（decision / diary / audit）であり、Intent に紐づかない調整記録の置き場と書き込み機構が欠けている（Maintainer と leader の設計討議で確定、2026-07-06。Issue #557 背景）。

## Target Customer

- 内部: leader と全 engineer。調整記録の送信先（journal-logger）と参照先（journal/）が確立し、記録の抜けと Issue 手動運用の負担が消える。
- 内部: Maintainer。未昇格エントリの棚卸し（昇格スタンプ）と steering 反映 Intent の材料化が機械化可能になる。

## Success Metrics（Issue 受け入れ条件）

1. journal 契約が文書化され、validator が構造を検査する。
2. journal-logger にメッセージを送ると追記 + ack が返り、日次 PR で repo に反映される。
3. 仕分け提案（learnings / steering 候補）が 1 件以上、既存の定着経路へ接続された実績がある。
4. #556 の既存エントリが journal へ移行され、#556 は参照を残してクローズされる。

## Initiative Trigger

多体連携の実運用（本日の 5〜6 体構成）で leader の横断判断が増え、#556 の手動運用が限界。Maintainer の設計討議で 4 点構成（契約 / logger / 仕分け / 参照規約）が確定した機会。

## Initial Scope Signal

scope = feature（新しい成果物種別 + 新しいロールの導入。Amadeus 独自拡張で v2 コア意味論には触れない = pdm scope・多体連携運用と同じ系譜）。維持する。

## 実装形態の前提（ディスパッチ付帯指示）

journal-logger の実体は「設計文書 + 手順書」として納品し、実 spawn は人間 / leader の操作とする（常設 spawn の前例がないため初回は手動起動 + 運用検証）。
