# Unit Test Instructions — 260719-goa-multiseg-ecode

上流入力(consumes 全数): code-generation-plan.md、code-summary.md

## 対象と実行方法

- 回帰テスト(本 intent の第一級成果物、code-summary.md の実装内容): `bun test tests/unit/t-norm-metrics.test.ts` — 複節 E-code 受理(E-TPR-RE / E-SDE-CG4 / E-APG-CG13)、単節後方互換、複節 round、スパース形 fail のピン留め
- 連動反転: `bun test tests/unit/t238-election-record.test.ts` — :104-105 の複節受理正 assertion(:102 圧縮形受理は不変)
- 全層: `bash tests/run-tests.sh --ci`(smoke/unit/integration)

## 合否基準

- 対象2ファイル 54 pass / 0 fail
- 既存 t-norm-metrics :582-597(単節正常系・異常系)グリーン維持(NFR-1)
- 落ちる実証: 正本のみ pre-fix 切替で新テストが赤(4 fail)になること(実施済み — code-summary.md)
