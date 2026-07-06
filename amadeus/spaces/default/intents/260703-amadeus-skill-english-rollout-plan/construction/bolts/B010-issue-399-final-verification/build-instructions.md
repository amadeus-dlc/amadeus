# Build Instructions：B010 #399 最終検証

## 目的

Issue #399 の完了条件（全面英語化、昇格先同期、B001〜B009 の完了証拠、検証結果）を新しい証拠で確認する。

## 実行コマンド

```sh
npm run test:all
npm run validate:all
bun run .agents/skills/amadeus-validator/validator/AmadeusValidator.ts . 260703-amadeus-skill-english-rollout-plan
git diff --check
```

日本語残存と同期の検査は次で行う。

```sh
# source 32 件と昇格先 32 件の日本語残存行を列挙し、許容対象だけであることを目視確認する
grep -n -P '[\x{3040}-\x{30FF}\x{4E00}-\x{9FFF}]' skills/amadeus*/SKILL.md .agents/skills/amadeus*/SKILL.md
# source と昇格先の diff がゼロであることを確認する
for d in skills/amadeus*; do diff -q "$d/SKILL.md" ".agents/skills/$(basename $d)/SKILL.md"; done
```

## 前提

- `mise trust` は実行済み。
- B010 では skill を変更しないため、昇格フローは実行しない。

## 成功条件

- すべてのコマンドが pass する。
- 残存日本語が Skill Language Policy の許容対象だけである。
- source と昇格先の diff がゼロである。
