# D003: 同期検証境界

## 背景

Amadeus の skill は source skill と昇格先成果物を分けて扱う。

`dry-run` 契約を実行環境で利用できるようにするには、source skill の更新だけではなく、昇格先成果物と text contract の検証が必要である。

## 判断

同期検証は、`dev-scripts/promote-skill.ts` と `dev-scripts/evals/amadeus-templates/check.ts` で扱う。

昇格先成果物は手動同期しない。

## 理由

promote-skill を使うと、source skill から昇格先成果物への反映経路を追跡できる。

text contract を強化すると、`dry-run` mode、出力項目、副作用禁止、`scaffold-only` 差分、consumer 境界を継続的に検出できる。

## 影響

B002 では、先に text contract を更新して失敗を確認し、その後 source skill 更新と promote-skill で成功させる。

検証結果は `test-results.md` と `traceability.md` に記録する。
