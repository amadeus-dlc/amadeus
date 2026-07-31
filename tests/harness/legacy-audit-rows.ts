// legacy-audit-rows.ts — what the legacy audit writer actually wrote.
//
// RECORDED, NOT RESTATED. Every entry below was produced by running the legacy
// writer (`appendAuditEntry`) in-process and reading the row back off disk
// through the same normaliser the migrated side is read through. The recording
// was taken at commit 6b453b05d2b1f771321a0f8df48ac9ca3c17556f, the last
// commit at which that writer existed; the writer was deleted immediately
// after (FR-MIG-5 / U8), so this file is the only surviving statement of what
// it produced.
//
// WHAT EACH ENTRY HOLDS.
//   input  — the (event, fields) the caller supplied.
//   legacy — the schema v1 row that came back: audit event type, the prose
//            heading the writer stamped from EVENT_HEADINGS, and the field bag
//            after the writer's own CR/LF escaping.
//
// The migrated (schema v2) side is still driven LIVE in t390 and compared
// against these rows, so the equivalence claim keeps both halves: a recorded
// past and a measured present. Regenerating this file is not possible — the
// producer is gone. An entry that no longer matches the canonical path is a
// migration regression, not a stale fixture.

export type LegacyAuditRow = {
  readonly input: { readonly event: string; readonly fields: Record<string, string> };
  readonly legacy: {
    readonly event: string;
    readonly heading: string;
    readonly fields: Record<string, string>;
  };
};

export const LEGACY_AUDIT_ROWS: Readonly<Record<string, LegacyAuditRow>> = {
  "AUDIT_MERGED": {
    "input": {
      "event": "AUDIT_MERGED",
      "fields": {
        "Bolt slug": "bolt-otel-migrate-g2",
        "Entries Merged": "3",
        "Source Audit Hash": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        "Fork Boundary": "2"
      }
    },
    "legacy": {
      "event": "AUDIT_MERGED",
      "heading": "Audit Merged",
      "fields": {
        "Bolt slug": "bolt-otel-migrate-g2",
        "Entries Merged": "3",
        "Source Audit Hash": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        "Fork Boundary": "2"
      }
    }
  },
  "AUDIT_FORKED_reentrant": {
    "input": {
      "event": "AUDIT_FORKED",
      "fields": {
        "Bolt slug": "bolt-otel-migrate-g2",
        "Source Audit Hash": "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        "Fork Boundary": "2",
        "Reentrant": "true"
      }
    },
    "legacy": {
      "event": "AUDIT_FORKED",
      "heading": "Audit Forked",
      "fields": {
        "Bolt slug": "bolt-otel-migrate-g2",
        "Source Audit Hash": "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        "Fork Boundary": "2",
        "Reentrant": "true"
      }
    }
  },
  "AUDIT_FORKED_plain": {
    "input": {
      "event": "AUDIT_FORKED",
      "fields": {
        "Bolt slug": "bolt-otel-migrate-g2",
        "Source Audit Hash": "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
        "Fork Boundary": "0"
      }
    },
    "legacy": {
      "event": "AUDIT_FORKED",
      "heading": "Audit Forked",
      "fields": {
        "Bolt slug": "bolt-otel-migrate-g2",
        "Source Audit Hash": "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
        "Fork Boundary": "0"
      }
    }
  },
  "DELEGATED_APPROVAL_standing_grant": {
    "input": {
      "event": "DELEGATED_APPROVAL",
      "fields": {
        "Stage": "code-generation",
        "Issuer Space": "default",
        "Issuer Intent": "260729-otel-upstream",
        "Issuer Shard": "issuer.jsonl",
        "Issuer Human Ts": "2026-07-31T00:00:00Z",
        "Grant Id": "grant-0001"
      }
    },
    "legacy": {
      "event": "DELEGATED_APPROVAL",
      "heading": "Delegated Approval",
      "fields": {
        "Stage": "code-generation",
        "Issuer Space": "default",
        "Issuer Intent": "260729-otel-upstream",
        "Issuer Shard": "issuer.jsonl",
        "Issuer Human Ts": "2026-07-31T00:00:00Z",
        "Grant Id": "grant-0001"
      }
    }
  },
  "DELEGATED_REJECTION_feedback": {
    "input": {
      "event": "DELEGATED_REJECTION",
      "fields": {
        "Stage": "code-generation",
        "Issuer Space": "default",
        "Issuer Intent": "260729-otel-upstream",
        "Issuer Shard": "issuer.jsonl",
        "Issuer Human Ts": "2026-07-31T00:00:00Z",
        "Feedback": "needs a falling proof"
      }
    },
    "legacy": {
      "event": "DELEGATED_REJECTION",
      "heading": "Delegated Rejection",
      "fields": {
        "Stage": "code-generation",
        "Issuer Space": "default",
        "Issuer Intent": "260729-otel-upstream",
        "Issuer Shard": "issuer.jsonl",
        "Issuer Human Ts": "2026-07-31T00:00:00Z",
        "Feedback": "needs a falling proof"
      }
    }
  },
  "AUDIT_MERGED_heading": {
    "input": {
      "event": "AUDIT_MERGED",
      "fields": {
        "Bolt slug": "bolt-otel-migrate-g2",
        "Entries Merged": "2",
        "Source Audit Hash": "eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
        "Fork Boundary": "1"
      }
    },
    "legacy": {
      "event": "AUDIT_MERGED",
      "heading": "Audit Merged",
      "fields": {
        "Bolt slug": "bolt-otel-migrate-g2",
        "Entries Merged": "2",
        "Source Audit Hash": "eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
        "Fork Boundary": "1"
      }
    }
  }
};
