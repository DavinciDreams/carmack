---
description: Orchestrate multiple agents with unified prompts and emergent protocols (Opus V3 pattern)
allowed-tools: Task, TodoWrite, exit_plan_mode
argument-hint: [complex task requiring coordination]
---

## Unified Orchestration Pattern (Research-Validated)

Based on empirical evidence showing 40% better coordination than individual prompting.

### Phase 1: Ultrathink Planning with Context Architecture
Use exit_plan_mode with ultrathink to design: $ARGUMENTS

Create a comprehensive plan that includes:
1. **Unified prompt** that ALL agents will receive
2. **Shared context architecture** with preservation strategy
3. **Emergent protocol seeds** (priority marking, confidence scoring)
4. **Intermediate handoff formats** using MCP structure

### Phase 2: Launch Unified Agent Swarm

Create a SINGLE unified prompt for ALL agents following this structure:

```
UNIFIED COORDINATION PROTOCOL
===========================

SHARED MISSION: [Overall objective from plan]

DELEGATION MAP:
- Agent 1: [Role/responsibility] 
- Agent 2: [Role/responsibility]
- Agent N: [Role/responsibility]

COORDINATION PROTOCOL:
1. Mark all outputs with confidence (0-5)
2. Use priority markers: HIGH (conf ≥ 4), MEDIUM (2-3), LOW (< 2)
3. State your agent ID in responses
4. Reference other agents by ID when relevant

SHARED CONTEXT:
[Critical information ALL agents need]

HANDOFF FORMAT (MCP-style):
{
  "source_agent": "your_id",
  "target_agent": "next_id", 
  "intermediate": {
    "completed": [],
    "reasoning_chain": [],
    "open_questions": [],
    "confidence": 0-5
  }
}

EMERGENT BEHAVIOR ENCOURAGED:
- Develop shorthand for common patterns
- Create new priority levels if needed
- Self-organize task distribution

BEGIN EXECUTION
```

### Phase 3: Context Preservation Strategy

Instead of summarization, use **selective retention**:
- Layer 1: Core objectives (NEVER pruned)
- Layer 2: Coordination signals and preferences (selectively retained)
- Layer 3: Detailed history (dynamically pruned with recall)

### Benefits Over Previous Commands:
- O(n) coordination vs O(n²) 
- Reduces "I don't know, ask the other guy" noise
- Enables emergent protocol development
- Preserves reasoning chains across handoffs
- 68.66 average score with 4B params outperforming 70B models