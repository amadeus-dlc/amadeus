# Construction ノート

## 実行方針

- B001 は Discovery Brief の基本見出しと Discovery 状態の整合を実装対象にします。
- 実装前に `design.md` を Design Gate evidence として確定しました。

## 対象タスク

| タスク | 状態 | 方針 | 証拠 |
|---|---|---|---|
| B001/T001 | 未着手 | Discovery Brief の基本見出しを作る | [design.md](design.md) |
| B001/T002 | 未着手 | Discovery 状態と一覧を整合させる | [design.md](design.md) |

## 実装判断

- 実装はまだ行っていません。
- 既存コード調査は例示用 greenfield のため対象外です。

## 検証入口

- `bun run .agents/skills/amadeus-validator/validator/AmadeusValidator.ts <workspace> 20260628-discovery-brief-creation`

## 未確認事項

- なし。
