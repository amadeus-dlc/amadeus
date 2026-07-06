# コード生成サマリ — unit: doctor-guidance

対象 Issue: [#573](https://github.com/amadeus-dlc/amadeus/issues/573)

## 変更ファイル

| ファイル | FR | 内容 |
|---|---|---|
| `.agents/amadeus/tools/amadeus-utility.ts` | FR-1 | doctor の workspace shell 検査を 3 分岐へ分離（エンジン dir 不在 = fail + installer 再実行誘導 / memory 未 seed = 固定 marker つき advisory pass / 両方あり = 従来 pass）。dist/ copy 文言を廃止 |
| `scripts/amadeus-install.ts` | FR-2 | smoke pass 時、doctor 出力に固定 marker が含まれる場合に info 1 行を表示（fail 側は不変） |
| `dev-scripts/evals/installer/check.ts` | FR-3 | makeFreshWorkspace() + #573 一連 12 検査（RED 先行 7 FAIL → GREEN 12/12） |
| `dev-scripts/data/parity-map.json` | FR-4 | exceptions へ #573 reason entry 追記 |

## TDD 証跡

- RED: 実装前に 7 検査 FAIL（installer「installed but smoke check failed」、doctor exit 1 + dist/ 文言、advisory marker 不在、破損時 fix の旧文言）。birth 後の 3 検査は現行挙動で pass = FR-1.3 の回帰ガードとして機能。
- GREEN: 12/12 ok。eval 精密化 2 件（FR-3.2 の破損状態は .claude + .agents 両方削除、dist/ assertion は shell 行に限定）は diary の Interpretations に記録。

## NFR-1 記録（接触面）

engineer5 の guide-intro とはファイル非接触（本 Intent はエンジン + installer + eval に閉じ、ガイドは触らない）。着手一報 + 回答受領（ガイド先行、merge 後の注記簡素化はどちらが拾っても可）。

## 検証結果

- `npm run typecheck`: pass
- `bun run dev-scripts/evals/installer/check.ts`: ok（#573 12 検査 + 既存全検査）
- `npm run parity:check`: ok（39 skills、199 engine files）
- `npm run test:all`: exit 0（2026-07-06T08:41:12Z、#554/#451 領域の既存 eval 含む回帰なし）
- validator（Intent 指定）: commit 後に実行し build-and-test で最終記録

## 逸脱

- なし（requirements の実装形どおり）。

## 後続候補

- doctor の他検査行の fix に残る dist/ 文言の点検（#573 スコープ外。gate 報告で申し送り）。
