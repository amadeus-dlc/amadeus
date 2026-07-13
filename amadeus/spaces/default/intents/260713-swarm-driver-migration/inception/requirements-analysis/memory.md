## Interpretations

- 2026-07-13T08:23:35Z — 上流成果物で確定済みの driver 契約は再質問しない。Requirements Analysis では、テスト可能な要件へ変換するために必要な未確定点だけを質問する。
- 2026-07-13T08:36:18Z — Windowsは今回の新driver保証対象から除外する。macOSとGitHub Actions上のLinuxだけをrelease criterionとし、既存Windows経路を意図的に変更しない非回帰姿勢と、検証済み保証を区別した。

## Deviations

## Tradeoffs

- 2026-07-13T08:23:35Z — Standard 深度の目安より質問の重複排除を優先する。約5問に絞り、既決事項の再確認による監査ノイズを避ける。
- 2026-07-13T08:36:18Z — topology不明時のhard errorより`claude-ultracode`を選択する。処理継続性を保ちつつ、`topology=unknown`と理由を表示・監査して暗黙判断を残さない。

## Open questions

- 2026-07-13T08:23:35Z — `auto` の topology が曖昧な場合の既定動作、互換警告、OS別保証、能力検査の鮮度、監査粒度を確定する。
