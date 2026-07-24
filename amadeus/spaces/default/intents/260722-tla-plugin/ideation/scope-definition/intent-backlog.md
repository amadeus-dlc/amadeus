# Intent Backlog(proto-Units)— 260722-tla-plugin

上流入力(consumes 全数): intent-statement(読了)、feasibility-assessment(読了 — リスク R1〜R4 を順序へ反映)、constraint-register(読了 — 制約IDを各 proto-Unit に紐付け)

## proto-Unit 一覧(MoSCoW: 全 Must / 順序: risk-first)

| 順 | proto-Unit | 内容 | 主な依存/制約 | 対応リスク |
|---|---|---|---|---|
| P1 | tla-externalize | FormalElection を .tla 独立ファイル化し、tla-arm.ts の埋め込みを置換。バイト同一性+既知欠陥 7/7 再現の実測 | T4 | R4 |
| P2 | plugin-skeleton | formal-model-check ステージ+完備性 sensor 骨格を plugins/<name>/ にオーサリングし、compose→graph 解決→--stage --single 実行の薄い E2E | T5、O1 | R3 |
| P3 | run-model-check | TLC 実行コアを run-model-check.ts へ一般化。fail-closed 契約(T3)保持、provider 抽象(ローカル macOS sandbox-exec / CI Linux・Docker)。落ちる実証込み | T1、T2、T3 | R1 |
| P4 | ci-integration | ci.yml へ専用ジョブ統合(ubuntu + 既成イメージ digest 固定 + workflow_dispatch)、formal-verification.yml 退役 | T1、O2、G2 | R2、A1、A2 |
| P5 | completeness-sensor | モデル⇔実装対応の完備性 sensor 本実装。落ちる実証+正当データ両側+corpus sweep | G3 | — |

注: P1+P2 が walking skeleton(最初の Bolt・ゲート付き)を構成する。P3〜P5 の詳細分割・Bolt 編成は units-generation / delivery-planning で確定する。

## 価値ストリーム(Value Stream)

並行プロトコルの spec 変更(開発者)→ 完備性 sensor がモデル未更新を検出(C5)→ .tla モデル更新(C2 の様式)→ run-model-check.ts で完全探索(C3)→ ci.yml ジョブで CI 実証(C4)→ NOT_DETECTED の機械保証付きでマージへ — 「PBT では構造的に見逃す欠陥クラス(オラクル相殺)が本流に入らない」という検証価値が利用者に届く。

## 除外(Won't)の追跡

scope-document.md の Out 節を正とする。将来intentの候補として: 実験資材退役、監査ロック/provenance モデル、Linux ネイティブ sandbox provider。
