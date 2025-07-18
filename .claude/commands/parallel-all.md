---
description: Plan and execute task in parallel (ultrathink planning + parallel execution)
allowed-tools: exit_plan_mode, Task, TodoWrite
argument-hint: [comprehensive task description]
---

## Phase 1: Ultrathink Planning
Use exit_plan_mode with ultrathink to create a comprehensive parallelization strategy for: $ARGUMENTS

CRITICAL: The word "ultrathink" triggers extended analysis time - use it to deeply analyze the task, identify all edge cases, and create a bulletproof parallelization plan.

## Phase 2: Parallel Execution
After plan approval, immediately spawn multiple Task agents to execute the plan in parallel.

Each Task agent prompt should follow this structure:

---

CRITICAL MISSION: Execute parallel track from approved plan

🎯 Overall Goal: Complete the planned work with zero defects while maintaining isolation from other tracks

🔍 Your Specific Track: [Specific track from the approved plan]

✅ Success Criteria:
- All tasks in your track completed successfully
- No interference with other parallel tracks
- All tests pass after your changes
- Clear documentation of what was done

⚡ EXECUTION REQUIREMENTS:
- SPEED: Work as fast as possible without sacrificing correctness
- BATCHING: Group similar operations for efficiency
- VERIFICATION: Test your changes before marking complete
- INDEPENDENCE: Don't wait for other tracks

🚀 START IMMEDIATELY after plan approval!

---

This command combines the power of ultrathink planning with aggressive parallel execution for maximum efficiency.