# Domain Entities — answer-evidence-sensor

上流入力(consumes 全数): `../../inception/units-generation/unit-of-work.md`(単一 Unit)、`../../inception/units-generation/unit-of-work-story-map.md`、`../../inception/requirements-analysis/requirements.md`(FR-1〜7)、`../../inception/application-design/components.md`(C-1〜C-5)、`../../inception/application-design/component-methods.md`、`../../inception/application-design/services.md`(二層防衛)。

## 型(TypeScript、type+コンパニオンなし — 薄い adapter のため最小)

```
AnswerEvidenceResult = {
  pass: boolean;            // dispatcher 必須契約
  findings_count: number;   // dispatcher 必須契約(fail=1 / pass=0)
  reason: string;           // 述語 reason または "skipped"
  skipped: "not-questions" | "pre-cutoff" | null;  // 対象外顕名
}
```

- 再利用型: `QuestionsEvidence`(amadeus-lib.ts:1144-1146、判別ユニオン — import type)
- 新定数: `QUESTIONS_EVIDENCE_CUTOFF_YYMMDD = 260716`(amadeus-lib.ts へ export、checkQuestionsEvidence 直上)
- 全フィールドの消費者: pass/findings_count = dispatcher(:576/:693-699)、reason/skipped = finding ファイル+E2E 検分(検証劇場なし)

## 不変条件

pass=false ⇒ findings_count=1 かつ skipped=null(fail は必ず実検査由来)。skipped≠null ⇒ pass=true(skip は常に合格側)。構成関数がこの対を強制する。
