# Scope Document — Amadeus Grilling 統合

**Intent**: mattpocock の grilling スキルを Amadeus Grilling として統合する
**Date**: 2026-07-06 / **Stage**: scope-definition (1.4)
**Upstream**: `../intent-capture/intent-statement.md` の Problem Statement と Initial Scope Signal を精緻化する(feasibility ステージはスコープ SKIP のため、実現可能性の仮説は本書の Risks に引き継ぐ)

## In Scope

1. **Grill me 対話モード** — stage-protocol.md の第4対話モード。既存3モード(Guide me / I'll edit the file / Chat)に並ぶ選択肢として全ゲート付きステージで選択可能。grilling の規律: 1問ずつ提示・各問に推奨回答を添付・事実はコードベース/成果物調査で自己解決し判断だけを問う・回答は質問ファイルへ即時書き戻し・監査ログは既存の QUESTION_ANSWERED 契約に完全準拠。
2. **スタンドアロンスキル `/amadeus-grilling`** — read-only・汎用。ワークフロー状態を進めず監査イベントも発しない(session-cost と同じ分類)。対象はステージ成果物・ワークフロー外の任意の計画/設計の両方。
3. **終了条件(ハイブリッド)** — depth 設定(Minimal/Standard/Comprehensive)を質問量の目安としつつ、ユーザーの「続けて」で延長、「done」でいつでも打ち切り可能。
4. **全4ハーネス同時展開** — core/ を単一ソースとし、package.ts の配布契約で claude / codex / kiro / kiro-ide へ。
5. **MIT 帰属表示** — 取り込むファイルに帰属コメント、docs にクレジット。
6. **docs 更新+テスト** — 対話モードの説明箇所への追記、既存テスト規約(4層)に沿った検証。

## Out of Scope

- 既存3モードの挙動変更・削除
- 新しい監査イベント種別の追加(既存タクソノミーの範囲内で実現する)
- ハーネス別の挙動差し込み(question-rendering annex の既存の枠を超える拡張)
- モード選択率などの利用計測基盤

## Prioritization (MoSCoW)

**すべて Must** — 両成果物は不可分の1パッケージ(モードだけでもスキルだけでも出荷しない)。docs・帰属・テストも同一リリースに含める。これはチームルール(ユーザー可視変更は同一コミットで dist 再生成・docs 更新・バージョンバンプ)とも整合する。Should/Could/Won't は空。

## Sequencing

**リスク順**を採用する:

1. **仮説検証を最初に** — 最大のリスク「1問ずつ・推奨回答つきの規律を、既存の question-rendering annex(構造化質問レンダリング)の枠内で表現できるか」。バッチサイズ1+説明文への推奨回答の織り込みで成立する見込みだが、成立しない場合は annex 拡張(= In Scope 4項との整合検討)が必要になり設計が変わる。
2. 共有の grilling 規律定義(プロトコル文書)
3. Grill me モード統合+スタンドアロンスキル
4. docs・帰属・テスト・dist 配布

## Constraints & Deadlines

- **期限なし** — 品質優先。
- **既存契約の遵守が最優先制約**: 質問ファイル= source of truth、[Answer]: 書き戻し、監査ログ形式、read-only スキルの分類規則、4ハーネスパリティ(--check ドリフトガード)。

## Risks (feasibility SKIP からの引き継ぎ)

| リスク | 影響 | 緩和 |
|---|---|---|
| 1問ずつ規律が question-rendering の枠に収まらない(仮説) | 設計変更(annex 拡張) | シーケンス1位で検証(リスク順の根拠) |
| 対話が長引き depth 契約と衝突する | UX 悪化 | ハイブリッド終了条件(Q5 決定)で吸収 |
| ハーネスごとの構造化質問 UI 差で体験が割れる | パリティ毀損 | annex の既存抽象(スペック→ハーネス別レンダリング)に乗せ、拡張しない |
