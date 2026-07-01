# R004: 検証証拠

## 要求

- `.amadeus/` 全体と対象 Intent の validator 結果、標準検証結果を追跡できること。
- 検証結果は、stage 判定と workspace 対応記録の証拠として読めること。

## 受け入れ条件

- 対象 Intent 指定の Amadeus Validator 結果が記録できる。
- `.amadeus/` 全体の validator 結果が記録できる。
- `npm run typecheck` と `npm run test:all` の結果が記録できる。
- 検証結果が stage0 採用判断の証拠候補として追跡できる。

## 根拠

- [Issue #233](https://github.com/amadeus-dlc/amadeus/issues/233)
- [development.md](../../../../development.md)

## 未確認事項

- Codecov など GitHub 上の検証結果をどの粒度で evidence に含めるかは Construction で確定する。
