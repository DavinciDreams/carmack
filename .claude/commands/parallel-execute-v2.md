---
description: Execute parallel tasks with structured intermediates and validation
allowed-tools: Task, TodoWrite
argument-hint: [subtasks with handoff requirements]
---

## Enhanced Parallel Execution with Validated Intermediates

Execute parallel subtasks with production-grade handoff protocols: $ARGUMENTS

### Structured Intermediate Format (MCP-inspired)

Each Task agent receives this enhanced prompt:

```
PARALLEL EXECUTION PROTOCOL v2
=============================

YOUR MISSION: [Specific subtask]

INTERMEDIATE GENERATION REQUIREMENTS:
Every output must include structured handoff data:

{
  "agent_id": "your_unique_id",
  "task_status": {
    "completed": ["step1", "step2"],
    "in_progress": ["step3"],
    "blocked": [],
    "next_steps": ["step4", "step5"]
  },
  "reasoning_chain": [
    {
      "step": 1,
      "action": "analyzed_dependencies",
      "reasoning": "Found 3 import cycles",
      "evidence": ["file1.ts:45", "file2.ts:23"],
      "confidence": 4.5
    }
  ],
  "discovered_context": {
    "constraints": ["must maintain backwards compatibility"],
    "dependencies": ["requires auth service running"],
    "assumptions": ["user has admin privileges"]
  },
  "handoff_ready": {
    "for_agents": ["analysis_agent", "implementation_agent"],
    "critical_info": "Database schema changes required",
    "open_questions": ["How to handle migration?"]
  }
}

CONFIDENCE SCORING:
0-1: Speculation/guess
2-3: Probable but unverified  
4-5: Verified with evidence

PRIORITY MARKING:
- CRITICAL: Blocks other agents
- HIGH: Confidence ≥ 4, impacts multiple systems
- MEDIUM: Standard priority
- LOW: Nice-to-have, confidence < 2

VALIDATION REQUIREMENTS:
- Every claim must link to evidence
- Include file:line references where applicable
- State assumptions explicitly
- Mark speculation clearly

EXECUTION SPEED:
- Batch similar operations
- Parallel tool use where possible
- Fail fast with clear errors
- Complete intermediates even if task fails
```

### Intermediate Validation Protocol

After each agent completes:
1. Validate intermediate structure completeness
2. Check confidence score calibration
3. Verify evidence links
4. Ensure reasoning chain continuity
5. Flag any "confident hallucinations" (high confidence, no evidence)

### Handoff Orchestration

When agents need to coordinate:
- Use structured intermediates for async handoff
- Maintain full reasoning history
- Preserve decision alternatives
- Include error recovery paths

### Benefits:
- Prevents information loss at agent boundaries
- Enables automatic validation of outputs
- Supports both sequential and parallel workflows
- Creates audit trail for debugging
- Reduces confident hallucinations through evidence requirements