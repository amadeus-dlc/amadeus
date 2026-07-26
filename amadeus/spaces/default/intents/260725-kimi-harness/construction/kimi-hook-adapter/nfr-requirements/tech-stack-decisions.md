上流入力(consumes 全数): business-logic-model, business-rules, requirements, technology-stack

# Tech Stack Decisions — kimi-hook-adapter

> 上流入力の使用箇所: business-rules.md の BR-1/BR-6、business-logic-model.md の dispatch フロー、requirements.md の FR-2d/NFR-1、technology-stack.md の既存基盤を選択の根拠とする。

## 選択

| 要素 | 決定 | 根拠 |
|---|---|---|
| 言語・実行 | TypeScript(bun 直実行) | technology-stack.md の既存基盤・全ハーネス共通 |
| 構造 | shim + lib 分割 | business-rules.md BR-1 周辺の ADR-3(cursor 踏襲。lib を in-process テスト可能に) |
| Windows 考慮 | 既存同等(実行ビット不要・ポータブルパス) | requirements.md FR-2d/NFR-1、business-rules.md BR-6 |
| payload 正規化 | 構造化 parse のみ(eval なし) | security-requirements.md の脅威モデル |

## 却下

- core hooks への変更: BR-1 で禁止(byte-shared 維持)
- 独自の状態保持(キャッシュ等): services.md の判定(無状態)により不採用
