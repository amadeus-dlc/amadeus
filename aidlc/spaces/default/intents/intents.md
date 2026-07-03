<!-- 生成物: 直接編集しないでください。intents/ 配下の各モジュールを更新し、`bun run IndexGenerate.ts <workspace>` で再生成してください。 -->

# インテント

## 一覧

| 識別子 | 概要 | 依存 | 詳細 |
|---|---|---|---|
| 260703-aidlc-v2-full-compliance | Amadeus DLC の workspace 構造、状態、成果物を AI-DLC v2 の規定へ完全準拠させ、衝突は常に v2 を優先する。 | なし | [260703-aidlc-v2-full-compliance.md](260703-aidlc-v2-full-compliance.md) |
| 260703-amadeus-skill-english-rollout-plan | Amadeus skill の `SKILL.md` 英語化を、小さい土台 PR から段階的に進め、全面英語化の完了まで管理する。 GitHub Issue #399 を親タスクとして扱い、#395、#400、#401、#402 の順序、依存関係、完了境界、完了状態に加えて、#391〜#394 の差分対応と RU002〜RU006 の段階的英語化完了を追跡できる状態にする。 | 260703-aidlc-v2-full-compliance | [260703-amadeus-skill-english-rollout-plan.md](260703-amadeus-skill-english-rollout-plan.md) |
| 260704-v2-parity-completion | AI-DLC v2（awslabs/aidlc-workflows、v2 branch）との完全一致を完成させる。柱は 3 本である。(A) 成果物の双方向一致（v2 規定なのに未生成・不一致の補完と、v2 の成果物で代替できる重複独自ファイルの削除）。(B) skill 一覧の一致（対応漏れ 15 skill の追加と、grilling、domain-modeling、validator を除く独自 skill の削除）。(C) TS エンジン駆動化（状態遷移、ルーティング、audit をエンジンに移し、skill を薄いラッパーにする）。基本戦略は、本家 `dist/claude/` からのコピーである（MIT-0）。親 Issue は #396、前提判断は #387 に由来する。 | 260703-aidlc-v2-full-compliance, 260703-amadeus-skill-english-rollout-plan | [260704-v2-parity-completion.md](260704-v2-parity-completion.md) |

## 依存関係

| インテント | 依存 | 理由 |
|---|---|---|
| 260703-aidlc-v2-full-compliance | なし | 再初期化後の最初の Intent であり、先行 Intent がないため。 |
| 260703-amadeus-skill-english-rollout-plan | 260703-aidlc-v2-full-compliance | 現在の `aidlc/` 構造、`aidlc-state.md`、skill 昇格契約を前提にするため。 |
| 260704-v2-parity-completion | 260703-aidlc-v2-full-compliance | 現在の `aidlc/spaces/` 構造、`aidlc-state.md`、`intents.json` を前提にするため。 |
| 260704-v2-parity-completion | 260703-amadeus-skill-english-rollout-plan | skill の英語化方針が、本家英語 skill のコピー戦略の前提になるため。 |
