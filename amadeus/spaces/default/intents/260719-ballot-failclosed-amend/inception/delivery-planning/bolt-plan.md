# Bolt Plan — 260719-ballot-failclosed-amend

上流入力(consumes 全数): requirements.md、components.md、unit-of-work.md、unit-of-work-dependency.md、unit-of-work-story-map.md、team-practices.md(検証コマンド・レビュー体制の既決プラクティスは team-practices.md の live 温存版に従う)

## Bolt 列(単一 Bolt)

| Bolt | Unit | 内容 | walking-skeleton |
| --- | --- | --- | --- |
| Bolt 1 | ballot-acceptance-failclosed | unit-of-work.md の U1 全量(FR-1〜FR-5)。story map の実装順(FR-1→FR-3→FR-4→FR-2 sweep/FR-5 検証)に従う | 対象外 — scope=amadeus は既存コードベースへのインクリメンタル修正で、org.md Walking Skeleton 節の「bugfix/refactor/security-patch はセレモニースキップ」と同趣旨(ブートストラップ対象なし)。bolt-plan にスケルトンマーカーは付さない |

## Bolt 完了条件

- U1 受け入れ条件(unit-of-work.md)の全 green+PR 発行+独立レビュー(実装者以外)+CI green。
- **e1 #1261 の main 着地後に base-advance-regrounding を実施してから PR 発行**(直列合意 — unit-of-work-dependency.md 外部依存)。merge は --no-ff 明示+完遂の機械確認(base-advance-regrounding 追補)。
- マージはユーザー承認後に leader が実行(no-AI-merge / leader-executes-merge)。

## Construction Autonomy Mode

単一 Bolt につきラダープロンプト(Bolt 1 出荷後の自律/ゲート選択)は発生しない — Bolt 1 = 最終 Bolt。ゲートは常任グラント 22ab851b の範囲で執行する。
