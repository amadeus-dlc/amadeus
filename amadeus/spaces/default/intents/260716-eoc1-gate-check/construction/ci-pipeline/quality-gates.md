# Quality Gates — eoc1-gate-check

## 上流入力(consumes 全数)

ci-config.md、`../eoc1-gate-guard/code-generation/code-summary.md`(落ちる実証)、`../build-and-test/build-test-results.md`、`../build-and-test/build-and-test-summary.md`。

## ゲート一覧(全て既存 — 追加なし)

| ゲート | 本 intent での判定 |
|--------|-------------------|
| typecheck / lint | PR #1106 head で exit 0(ローカル+CI) |
| dist drift ×2 | 8コピー同期 exit 0 |
| coverage patch | 新規行の in-process 駆動で resident-hit(配線行 :1722 hit 185) |
| complexity | 新規違反 0(M7 ordinal 是正済み) |
| PR レビュー | e1 REVISE→増分 READY(GoA 2) |
