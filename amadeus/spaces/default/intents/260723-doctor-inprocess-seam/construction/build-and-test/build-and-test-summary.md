# Build and Test Summary — Doctor in-process seam

## 上流成果物

- `construction/doctor-inprocess-seam/code-generation/code-generation-plan.md`
- `construction/doctor-inprocess-seam/code-generation/code-summary.md`

## Strategy と inventory

Test Strategy は `Minimal`。要求駆動の core/unit test を中心とし、実在境界に比例して
integration と security regression を追加した。

| 種別 | 状態 | 根拠 |
|---|---|---|
| Build/type/lint/package | PASS | TypeScript source と6 harness dist |
| Unit/core | PASS | t257 11/11、unit guard 39/39 |
| Integration | PASS | 同時負荷回帰115/115、full regression 6,651/6,651 |
| Performance | N/A | 定量 NFR と service/load target がない |
| Security regression | PASS | symlink/TOCTOU、audit、cleanup 37/37 |
| Dependency audit | FAIL（既知の範囲外リスク） | dev dependency の transitive High 3件 |

## Coverage expectation

- Project line coverage: 80%以上
- Patch coverage: runtime-erased 型注釈を除く実行可能行100%
- Requirement coverage: FR-1〜FR-6 と NFR-1〜NFR-4 の全件に test evidence

## Readiness

- Build-ready: YES
- Test-ready: YES
- Security-ready: CONDITIONAL。Issue #857 の変更境界は green だが、既存 dev dependency の
  `fast-uri` と `hono` に High advisory 3件がある
- Deployment-ready: N/A（本 intent は code refactor で deployment artifact を変更しない）

`package.json` と lockfile は本 intent で変更されておらず、dependency update は
Issue #857 の外側である。full regression と coverage gate は成功しているため、
依存更新を別作業として追跡する条件で Build and Test は承認可能と評価する。
詳細は `build-test-results.md` を参照する。
