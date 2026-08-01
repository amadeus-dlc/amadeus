# Code Summary — u2-residue-deletion

上流入力(consumes 全数): unit-of-work, functional-design, nfr-design, bolt-plan

## 実装結果(B1={u1+u2} 統合裁定どおり bolt-u1-runner-relocation ブランチ内で実装、conductor へマージ済み)

- **D1**: `scripts/formal-verif/` 残余 30 ファイルを機械照合のうえ全削除(コミット bd43bfa15「Delete the formal-verif experiment residue left in scripts/」)。
- **D2**: 参照テスト・fixture・support を 3 値判定で処理 — D 専用テスト削除 / barrel 経由 A シンボルの直 import 書換 / 混在テストの部分外科。処理後の対象 suite green を個別確認。
- **D3/D4**: complexity-baseline / coverage-patch-allowlist の分類 D エントリを intersect 削除。allowlist は remap 中に落ちた正当エントリを直読照合で復元(コミット baa88f754)。
- **D5**: coverage registry 再生成 → `gen-coverage-registry --check` exit 0。
- **I2 成立**: `test -d scripts/formal-verif` exit 1(conductor 実測)。**I4**: record 配下の成果レポート(eligibility-report.md 等)は無変更で保存。
- **I1(green 維持)**: 統合着地(u1+u2)+origin/main 再接地後のフルスイート `bash tests/run-tests.sh --ci` **exit 0(fail 0)**(conductor 実測)。

検証 exit code 表・swarm check 結果は u1 の code-summary.md(統合 Bolt の正本)を参照 — B1 統合着地として同一の検証で確定。
