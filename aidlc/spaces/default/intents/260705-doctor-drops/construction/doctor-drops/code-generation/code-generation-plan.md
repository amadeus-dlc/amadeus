# Code Generation Plan — doctor-drops（Issue #432）

上流入力: [requirements.md](../../../inception/requirements-analysis/requirements.md)

## 計画（TDD）

1. RED: `dev-scripts/evals/doctor-drops/check.ts`（隔離 workspace 実 CLI、7 検査）を追加。偶然 pass する検査（settings 由来の hook 名一致、既存 fail による非 0 exit）を drops 行限定・素の pass 状態へ厳密化し、修正前は本質 3 検査が失敗することを確認する。
2. GREEN: `amadeus-utility.ts` の doctor hooks-health 節に 6b（drops 読み取り）を追加。`.drops` ごとに fail 行（hook 名 + 件数 + 末尾に近い解釈可能行の時刻・理由）を報告し、fix にファイル削除によるクリア手段を明記する。`.drops` が無ければ出力不変。
3. 検証: eval 7 検査 GREEN、`npm run test:all` exit 0（parity は `tools/aidlc-utility.ts` 宣言済みのため追加なし）。
