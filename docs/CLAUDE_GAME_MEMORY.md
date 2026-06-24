# Claude Game Memory

Updated: 2026-06-24

This file summarizes the Claude chat exports provided by the user:

- `C:/Users/95440/Desktop/conversations.json`
- `C:/Users/95440/Desktop/users.json`

Only game-related content is recorded here. The exports also contained unrelated account, environment, and API-key troubleshooting text; do not copy those details into project docs or commits.

## Relevant Claude Conversations

- `CODEX工具推荐`: main game-related conversation. It covered WeChat mini game development, `game.js` diagnostics, staff/guest pathfinding, toilet behavior, cleaning tasks, and delivery behavior.
- `这个对话框有可以直接操作本地代码的权限吗`: mostly Claude Code setup and permission guidance. Game relevance is limited to the project path and workflow expectations.

## Project Context Captured From Claude

- Project path: `C:/Users/95440/Documents/网吧小游戏`
- Game type: WeChat mini game, canvas-based internet cafe management simulation.
- Main logic is still concentrated in `game.js`.
- Current recurring problem area: character navigation and service tasks, especially staff cleaning, toilet cleaning, guest toilet return paths, and delivery pathing.
- User workflow: Codex performs code changes locally, verifies with basic checks, opens WeChat DevTools for testing, then pushes to GitHub so another machine can continue.

## Claude Diagnosis History

Claude identified the movement issues as a chain of pathing and task-state problems rather than one small bug:

1. Patrol points could be visually empty but not actually walkable, so staff targets sometimes landed near furniture collision areas.
2. When a worker switched patrol targets, stale navigation state could remain: `stuckTimer`, `detourPoint`, and `navPath`.
3. The toilet service fallback point used to be inside the toilet room, causing guests or cleaners to get trapped.
4. Guests returning from the toilet needed to ignore their own PC seat collision during the whole `backToPc` trip.
5. Worker patrol target stepping used a stride that could loop only part of the patrol list, so staff appeared to patrol only the left side.
6. PC row spacing and PC collision height created narrow or blocked aisles, causing A* to fail near machines.
7. Even after path fixes, workers could stand beside a target but fail to enter the service action because arrival checks were too strict.

## Current Code Snapshot Checked On 2026-06-24

These items appear to be implemented in the current `game.js`:

- `STUCK_REROUTE_SECONDS = 0.65`
- `NAV_GRID_SIZE = 12`
- `dt` cap is `0.1`
- `pcGapY = 116`
- `getPcDeskBounds()` height is tightened to `pc.h + 20`
- `getToiletServicePoint()` fallback is outside the toilet: `toilet.y + toilet.h + 20`
- `hasReachedToiletService()` now only accepts close range to the real service point, avoiding invisible toilet cleaning from the room side of the door.
- `getWorkerPatrolPoints()` validates:
  - not too close to placements
  - not walk-blocking
  - inside a walkable area
  - not within about `60px` of PC desk collision centers
- `getWorkerRoamTarget()` advances by `+1`, not a larger stride.
- Station patrol uses slower movement speed `22` and `idleTimer > 12`.
- Floor staff can notice nearby dirty PCs during patrol and immediately switch into a cleaning task.
- `backToPc` sets `guest.movementIgnorePcId = pc.id` until the guest returns.
- `distanceToRect()` and near-target checks allow staff to start cleaning/repairing when physically close to the PC or toilet bounds.
- PC cleaning, PC repair, delivery, and mopping task timeouts are now around `5s`.
- Toilet cleaning waits longer when occupied: `20s` if a guest is using the toilet, otherwise `8s`.
- Manual customer service calls `cancelAssignedDemandWorker()` so tapping a demand bubble can override an employee already assigned to deliver.
- Demand bubbles show a product-name suffix like `...` while a worker is assigned.
- Customer demands expire after `DEMAND_WAIT_SECONDS = 60`.

These Claude suggestions are not fully reflected in the current snapshot, or should still be treated as future tuning:

- Consider changing assigned delivery bubbles from `商品名...` to a clearer Chinese label such as `送餐中`.
- Re-check whether `pcGapY = 116` leaves enough visual and collision space after the latest PC placement changes.
- If characters still clip near desks, inspect the soft PC movement collision code before changing global spacing again.
- Staff initial patrol offsets should remain staggered so multiple employees do not stack on the same route.

## Next Debugging Guidance

If staff still stands beside dirty PCs or toilets without working, do not keep only increasing speed or changing random path constants. First inspect these values for the stuck worker:

- `worker.type`
- `worker.state`
- `worker.targetPcId`
- `worker.pathTimer`
- `worker.x`, `worker.y`
- `pc.dirty`, `pc.cleanWorkerId`
- `state.toilet.dirty`, `state.toilet.cleanWorkerId`
- current navigation path length and final target point

Likely areas to inspect next:

- `assignWorkerTasks()`
- `assignCleaningTask()`
- `updateWorkers()`
- `moveToPcServicePoint()`
- `getPcAccessPoint()`
- `sanitizeWorkerTaskLocks()`
- toilet cleaning branch in `updateWorkers()`

For visual debugging, consider adding a temporary debug overlay showing:

- worker state label
- target PC number
- service target point
- current path polyline
- dirty/locked PC status

Remove or hide the overlay before normal gameplay polish.

## User Preference Memory

- The user wants the game to keep moving toward a Stardew Valley-like warm pixel style.
- Art can remain code-drawn for now; final art polish can use the saved reference image later.
- The user prefers concrete gameplay iteration over abstract planning once a direction is agreed.
- For cross-computer work, always push meaningful updates to GitHub.
- End-of-day handoff docs are only needed when the user asks for them explicitly.
