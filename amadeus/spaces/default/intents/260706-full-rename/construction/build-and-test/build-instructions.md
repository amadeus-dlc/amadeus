# build instructions（260706-full-rename）

上流入力: [code-summary.md](../full-rename/code-generation/code-summary.md)、[requirements.md](../../inception/requirements-analysis/requirements.md)

## 適用判断と検証

挙動不変の改名（NFR-1）であり、専用の build 工程は新設しない。担保は次で行う。

- `npm run test:all`（全 eval 連鎖 = engine-e2e / installer / validator 系 / rename-leftovers / linter-sensor を含む）
- `npm run parity:check`（写像後 byte 一致、199 engine files）
- rename-leftovers 検査 (e)（旧名残存ゼロの tree-wide 検査）
