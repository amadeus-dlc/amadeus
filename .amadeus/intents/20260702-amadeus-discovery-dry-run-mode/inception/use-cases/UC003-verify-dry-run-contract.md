# UC003: `dry-run` 契約を同期検証する

## システム境界

- Agent は source skill、昇格先成果物、eval または text contract を確認する。
- Agent は `dry-run` mode の説明が source skill と昇格先成果物で同期されていることを検証する。

## 事前条件

- `dry-run` の mode 契約が source skill に定義されている。
- 昇格先成果物への反映方針が決まっている。

## 基本フロー

1. Agent は `skills/amadeus-discovery/SKILL.md` に `dry-run` 契約を反映する。
2. Agent は `dev-scripts/promote-skill.ts` で昇格先成果物へ反映する。
3. Agent は text contract または関連 eval で、`dry-run` mode、出力項目、副作用禁止、`scaffold-only` との差分、consumer 境界を確認する。
4. Agent は対象 Intent の validator を実行する。
5. Agent は検証結果を Construction の証拠として残す。

## 代替フロー

- text contract で読み取り専用性を十分に検出できない場合、Construction で追加検証を検討する。
- promote-skill が失敗した場合、同期前の状態として扱い、昇格先成果物を手動で同期しない。

## 事後条件

- source skill と昇格先成果物の同期結果を追跡できる。
- `dry-run` 契約を検出する eval または text contract の結果を追跡できる。

## BCE候補

| 種別 | 候補 | 責務 |
|---|---|---|
| 境界 | skill synchronization request | source skill と昇格先成果物の同期対象を受け取る。 |
| 制御 | contract verification | text contract、validator、promote-skill の結果を確認する。 |
| エンティティ | verification evidence | 検証コマンド、結果、対象 path を保持する。 |

## 責務候補

| 候補 | 判断 | 保持 | 依頼 |
|---|---|---|---|
| skill synchronization check | 同期と検証の完了可否を決める。 | promote-skill、eval、validator の証拠。 | 不足があれば Construction の verification へ渡す。 |
