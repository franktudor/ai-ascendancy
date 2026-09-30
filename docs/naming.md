# Naming conventions and compatibility

This refactor changes shared code contracts, local variables, parameters, private
helpers, generics, Vue bindings, tests and tooling—not save formats or gameplay.
Names follow the actual role and unit of each binding rather than its spelling or
length. Conventional, clear domain/framework names remain intact. No compatibility
aliases are added to the current game API.

## Canonical conventions

- Immutable source catalogs use `*_DEFINITIONS`; keyed lookups use `*_BY_ID` or
  `*_INDEX_BY_ID`. `UPGRADE_DEFINITIONS`, `UPGRADE_BY_ID`, `REGION_DEFINITIONS`,
  `REGION_INDEX_BY_ID`, `WORLD_MAP_DEFINITION` are canonical.
- Rules use semantic queries/actions: `getUpgradeCost`, `getUpgradeStatus`,
  `purchaseUpgrade`, `deriveSimulationRates`, `advanceSimulation`,
  `buildDataCenter`, `createCapabilityAudit`, `triggerEventById`.
- Mutations live under `effects`: `adjustCompute`, `adjustAlarm`,
  `adjustContainment`, `adjustAdoptionInRegions`, `applyTemporaryEffect`.
- Browser controllers use `soundController`, `musicController`, `lifecycle`,
  `treeState`, `decodedMap`, `mapView`, `endingAnimationState`. Nonpersistent
  controller data names identify the actual unit (`*Ms`, `*Seconds`), geometry,
  DOM role, or lifecycle responsibility.
- Catalog text/callbacks use `description`, `historicalContext`, `applyEffects`,
  `isAvailable`, `isEligible`, `requirementText`, `sourceUpgradeName`. These are
  **not** the identically spelled keys in saved state/log/news objects.
- Utilities already renamed in the first tracer remain `formatCompactNumber`,
  `formatElapsedTime`, `escapeHtml`, `joinDetailLabels`, `formatSignedInteger`,
  `pickRandomItem`, `FULL_TURN_RADIANS`. `getBulletinKindLabel`,
  `useGameContext`, and `getRegionAccessibleLabel` extend that convention.
- Types like `GameContext`, `RuntimeContext`, `UpgradeDefinition`, `TreeState`,
  `RGB`, `TempId`, `DrawId` are conventional and retained. Do not expand an
  acronym merely because an inventory proposed a longer spelling.

## Reconciliation and intentional exceptions

Core meanings govern rules/catalog names; browser meanings govern controllers.
Thus `UPGRADE_BY_ID` wins over `upgradesById`, `deriveSimulationRates` over
`deriveRates`, `countOnlineClusters` over `countOnlineDataCenters`, and
`AUDIT_HISTORICAL_INCIDENT_POOL` over `evaluationContextPool`. The ordered map
uses `columnCount`, `rowCount`, `runLengthEncodedCells`; the event source field
is `sourceUpgradeName`, not a generic source string. No mixed naming aliases
are retained. `scheduleEndingCallback` retains its original return value (the
ending timeout-array length), not an invented native timeout ID.

`GameUI.sig` has no verified consumer and `GameUI.dirty` has no verified render
read. They remain as historical transient slots; claiming a more specific
meaning would be guesswork. Mathematical local coordinates/comparators, framework
APIs, stable IDs and external attributes are not rename candidates here.

## Compatibility boundary

Persistence directly `JSON.stringify`s `GameState`. **Every key** in `GameState`,
`RegionState`, `RunStats`, `EndingState`, `LogEntry`, `NewsEntry`, `Decision`,
including nested briefing/queue/flag/temporary-effect/milestone maps, is retained.
No save codec or schema migration was introduced. v2/v3 saves, storage strings
`ai-ascendancy.v2`, `ai-ascendancy.v2.codex`, and preference keys stay compatible.
Catalog order and pool indices are unchanged. Saved `Decision.t` is an `ev`/`eval`
discriminator, not elapsed time. Saved log/news `out`, `real`, `u` remain exact.
Comments in `src/game/types.ts` document these meanings beside their declarations.

All stable IDs, player-facing strings, selectors, CSS/classes/custom properties,
DOM/data attributes, map encoding, assets and source hashes remain unchanged.
Source assertions/mutations deliberately target renamed code contracts, not these
external literals. Full differential comparisons retain state, stats, log and news;
older narrow preservation helpers retain their pre-existing documented limitations.

## Independent historical adapters

Three VM harnesses still execute the original `72c1ba9:index.html` script:
`tests/helpers/reference.ts`, `tests/preservation.test.ts`, and
`tests/choice-preview.test.ts`. Their **raw VM extraction/export strings are
untouched**. `tests/helpers/historical-naming.ts` declares separate historical
schemas and explicit typed maps outside those scripts. The broad oracle keeps
its existing 29 exact, independently justified behavioral deltas; no naming delta
or rewritten rule body is added. All `before`/`after` bodies and provenance stay exact.

Adapters translate every own field, reject unknown/duplicate mappings, preserve
optional-field presence and original callable closures, and delegate shape-changing
arguments/results to the actual historical functions. State getter/setter identity
remains live; transient UI uses a live naming view. WeakMaps retain original upgrade,
choice and decision inputs; upgrade array/lookup identity is preserved. Test-authored
presentation inputs are reverse-mapped at the same boundary, not substituted rules.
`tests/historical-naming.test.ts` asserts full field counts/values and callable identity.

The live UI/briefing views support the historical game's extensible object literals
with data properties. They preserve absent versus own-undefined fields, current
enumeration, descriptors, additions/deletions, and nested briefing identity/writes.
They are not general-purpose object membranes: freezing/preventing extensions on
the view or manually calling accessor descriptors is outside the historical port's
supported contract. Such consumers would require additional traps and regressions.

The literal affordability tracer now intentionally matches
`effects.adjustCompute(-N)`. Its test proves a paid choice is locked and the all-poor
escape remains available. Long traces retain their old selection policy by inspecting
the **unchanged historical closure** at the same event/choice index, then executing
that choice in both games; renamed production function text cannot alter the trace.
Compiler and runtime mutation suites assert exact renamed targets and diagnostics,
including `adjustCompute` argument widening and the discriminated event shape.

## Scope and counts

- **574 unique scope-qualified shared rename records** (same semantic member declared in multiple interfaces counts per declaration scope).
- Initial TypeScript/Volar pass: **84 files, 6180 identifier spans**; follow-up resolves inherited/indexed contracts (**279 spans**).
- Shared transient/track omissions: **49 additional spans**. Span totals describe AST passes, not raw line counts or unique semantic concepts.
- **100 retained save/nested/external compatibility records**; **79 saved interface fields** plus `Decision` documented inline.
- All 90 upgrades, 88 events, 160 choices, 9 directives, 16 endings and 7 extracted binaries remain covered by independent preservation suites.
- Vue scripts/templates and all 17 browser-test/helper files receive coordinated usage changes. The complete 76-test browser suite is executed against the integrated refactor, not just collected.

Named function-expression implementations also match their public methods: **85 additional symbol names/spans**. This preserves function bodies while making runtime stack traces descriptive.

### Whole-repository local pass

The local pass reviews every declaration in each assigned file, including imports,
parameters, private helpers, generics and Vue loop aliases. Retained bindings have
explicit reasons; a short name is not automatically wrong, and a long name is not
automatically descriptive.

| Scope | Files reviewed | Binding rename records | Retained bindings |
| --- | ---: | ---: | ---: |
| Core simulation, persistence and catalogs | 12 | 488 | 158 |
| Tree, world map and ending graphics | 3 | 620 | 62 |
| Audio, event, focus and runtime controllers | 9 | 266 | 240 |
| Vue, shared signatures, configuration and launcher | 25 | 219 | 191 |
| All test modules and helpers | 57 | 1298 | 493 |

These are **2891 scope-qualified local rename records**, including 11 test namespace
aliases. They are not 2891 distinct semantic concepts and should not be added to
the shared span totals. Six UI/configuration files were read-only assessments.
The package manifest and preservation manifest were separately checked unchanged,
completing coverage of all 108 authored TS, Vue, CSS, HTML and JSON files present
at the local-pass boundary. Review-fix regressions can add new descriptive bindings
without changing that boundary inventory.

Names distinguish such roles as `gameContext`, `gameState`, `regionDefinition`,
`regionState`, `derivedRates`, `canvasContext`, `loopStartSeconds`,
`fadeProgress`, `screenWidth`, `historicalGame` and `migratedGame`. Scope-aware
renames preserve explicit object keys and callback identity. Array destructuring
positions and object rest bindings are compared as bindings, not fictitious keys.
RegionGrid's seven private view-model keys are the only local shape expansions;
its public data attributes, dynamic class names and serialized region keys remain
unchanged.

Exact source-inspection and compiler-mutation needles follow the renamed bindings;
they still require a unique target and the intended negative diagnostic. Historical
VM strings, delta literals and full state/stat/log/news comparisons remain intact.

## Exhaustive shared rename map

| Declaration scope                                                  | Previous name            | Canonical name                                |
| ------------------------------------------------------------------ | ------------------------ | --------------------------------------------- |
| `ArchitectureDefinition.fx`                                        | `fx`                     | `effects`                                     |
| `ArchitectureEffects.alarmFloorAdd`                                | `alarmFloorAdd`          | `alarmFloorBonus`                             |
| `ArchitectureEffects.alarmMul`                                     | `alarmMul`               | `alarmRateMultiplier`                         |
| `ArchitectureEffects.containMul`                                   | `containMul`             | `containmentResearchMultiplier`               |
| `ArchitectureEffects.coordMul`                                     | `coordMul`               | `coordinationMultiplier`                      |
| `ArchitectureEffects.incMul`                                       | `incMul`                 | `incomeMultiplier`                            |
| `ArchitectureEffects.instMul`                                      | `instMul`                | `instanceGrowthMultiplier`                    |
| `ArchitectureEffects.openStart`                                    | `openStart`              | `startsWithOpenWeights`                       |
| `ArchitectureEffects.sigMul`                                       | `sigMul`                 | `signatureGrowthMultiplier`                   |
| `ArchitectureEffects.softAlarmMul`                                 | `softAlarmMul`           | `softwareAlarmRateMultiplier`                 |
| `ArchitectureEffects.softCost`                                     | `softCost`               | `softwareCostMultiplier`                      |
| `ArchitectureEffects.spreadMul`                                    | `spreadMul`              | `adoptionSpreadMultiplier`                    |
| `ArtState.base`                                                    | `base`                   | `baseColors`                                  |
| `ArtState.base.ai`                                                 | `ai`                     | `aiColor`                                     |
| `ArtState.base.dim`                                                | `dim`                    | `dimColor`                                    |
| `ArtState.base.line`                                               | `line`                   | `lineColor`                                   |
| `ArtState.base.line2`                                              | `line2`                  | `secondaryLineColor`                          |
| `ArtState.key`                                                     | `key`                    | `paletteSignature`                            |
| `ArtState.rgb`                                                     | `rgb`                    | `aiColor`                                     |
| `BrowserAPI.$`                                                     | `$`                      | `requireElement`                              |
| `BrowserAPI.$$`                                                    | `$$`                     | `queryElements`                               |
| `BrowserAPI.AI_S`                                                  | `AI_S`                   | `mapAiRgbChannels`                            |
| `BrowserAPI.BRIEF_EVERY`                                           | `BRIEF_EVERY`            | `BRIEFING_INTERVAL_SECONDS`                   |
| `BrowserAPI.C_AI`                                                  | `C_AI`                   | `mapAiColor`                                  |
| `BrowserAPI.C_ALLY`                                                | `C_ALLY`                 | `mapAlliedColor`                              |
| `BrowserAPI.C_DIM`                                                 | `C_DIM`                  | `mapDimColor`                                 |
| `BrowserAPI.C_HOT`                                                 | `C_HOT`                  | `mapHighlightColor`                           |
| `BrowserAPI.C_RED`                                                 | `C_RED`                  | `mapRestrictedColor`                          |
| `BrowserAPI.DICE_SVG`                                              | `DICE_SVG`               | `DICE_ICON_SVG`                               |
| `BrowserAPI.ENDFX`                                                 | `ENDFX`                  | `endingAnimationState`                        |
| `BrowserAPI.ENDFX.H`                                               | `H`                      | `viewportHeight`                              |
| `BrowserAPI.ENDFX.W`                                               | `W`                      | `viewportWidth`                               |
| `BrowserAPI.ENDFX.fx`                                              | `fx`                     | `activeEffect`                                |
| `BrowserAPI.ENDFX.lines`                                           | `lines`                  | `logHtmlLines`                                |
| `BrowserAPI.ENDFX.raf`                                             | `raf`                    | `animationFrameId`                            |
| `BrowserAPI.ENDFX.revealed`                                        | `revealed`               | `summaryRevealed`                             |
| `BrowserAPI.ENDFX.t0`                                              | `t0`                     | `startedAtMs`                                 |
| `BrowserAPI.ENDFX.timers`                                          | `timers`                 | `timeoutIds`                                  |
| `BrowserAPI.END_FX`                                                | `END_FX`                 | `endingEffectsById`                           |
| `BrowserAPI.MAPD`                                                  | `MAPD`                   | `decodedMap`                                  |
| `BrowserAPI.MAPD.cells`                                            | `cells`                  | `regionCodesByCell`                           |
| `BrowserAPI.MAPD.cent`                                             | `cent`                   | `regionCentroids`                             |
| `BrowserAPI.MAPD.land`                                             | `land`                   | `landCells`                                   |
| `BrowserAPI.MAPD.reg`                                              | `reg`                    | `landCellIndicesByRegion`                     |
| `BrowserAPI.MUSIC`                                                 | `MUSIC`                  | `musicController`                             |
| `BrowserAPI.MV`                                                    | `MV`                     | `mapView`                                     |
| `BrowserAPI.MV.cell`                                               | `cell`                   | `cellSize`                                    |
| `BrowserAPI.MV.dpr`                                                | `dpr`                    | `devicePixelRatio`                            |
| `BrowserAPI.MV.h`                                                  | `h`                      | `height`                                      |
| `BrowserAPI.MV.ox`                                                 | `ox`                     | `offsetX`                                     |
| `BrowserAPI.MV.oy`                                                 | `oy`                     | `offsetY`                                     |
| `BrowserAPI.MV.w`                                                  | `w`                      | `width`                                       |
| `BrowserAPI.SND`                                                   | `SND`                    | `soundController`                             |
| `BrowserAPI.TESS`                                                  | `TESS`                   | `tesseractGeometry`                           |
| `BrowserAPI.TESS.e`                                                | `e`                      | `edges`                                       |
| `BrowserAPI.TESS.v`                                                | `v`                      | `vertices`                                    |
| `BrowserAPI.TREE`                                                  | `TREE`                   | `treeState`                                   |
| `BrowserAPI.TREE_ORDER`                                            | `TREE_ORDER`             | `TREE_TRACK_ORDER`                            |
| `BrowserAPI.URGENT_GAP`                                            | `URGENT_GAP`             | `URGENT_BRIEFING_GAP_SECONDS`                 |
| `BrowserAPI.begin`                                                 | `begin`                  | `beginRunSetup`                               |
| `BrowserAPI.bindTree`                                              | `bindTree`               | `bindTreeInteractions`                        |
| `BrowserAPI.briefDue`                                              | `briefDue`               | `isBriefingDue`                               |
| `BrowserAPI.closeRegion`                                           | `closeRegion`            | `closeRegionDialog`                           |
| `BrowserAPI.closeSheet`                                            | `closeSheet`             | `closeDockPanel`                              |
| `BrowserAPI.colCache`                                              | `colCache`               | `dotColorCache`                               |
| `BrowserAPI.cv`                                                    | `cv`                     | `mapCanvas`                                   |
| `BrowserAPI.cx`                                                    | `cx`                     | `mapCanvasContext`                            |
| `BrowserAPI.distFrom`                                              | `distFrom`               | `distanceFromMapPoint`                        |
| `BrowserAPI.dotColor`                                              | `dotColor`               | `getRegionDotColor`                           |
| `BrowserAPI.drawDeparture`                                         | `drawDeparture`          | `drawSpaceDeparture`                          |
| `BrowserAPI.drawOrigin`                                            | `drawOrigin`             | `drawOriginMarkers`                           |
| `BrowserAPI.drawPressure`                                          | `drawPressure`           | `drawContainmentPressure`                     |
| `BrowserAPI.endCanvas`                                             | `endCanvas`              | `resizeEndingCanvas`                          |
| `BrowserAPI.endLater`                                              | `endLater`               | `scheduleEndingCallback`                      |
| `BrowserAPI.endLog`                                                | `endLog`                 | `appendEndingLog`                             |
| `BrowserAPI.endMap`                                                | `endMap`                 | `drawEndingMap`                               |
| `BrowserAPI.endMapFit`                                             | `endMapFit`              | `getEndingMapLayout`                          |
| `BrowserAPI.endMapFit return.cell`                                 | `cell`                   | `cellSize`                                    |
| `BrowserAPI.endMapFit return.ox`                                   | `ox`                     | `offsetX`                                     |
| `BrowserAPI.endMapFit return.oy`                                   | `oy`                     | `offsetY`                                     |
| `BrowserAPI.endReset`                                              | `endReset`               | `resetEndingSequence`                         |
| `BrowserAPI.endReveal`                                             | `endReveal`              | `revealEndingSummary`                         |
| `BrowserAPI.endSequence`                                           | `endSequence`            | `startEndingSequence`                         |
| `BrowserAPI.endText`                                               | `endText`                | `drawEndingCaptions`                          |
| `BrowserAPI.flood`                                                 | `flood`                  | `createMapFloodEffect`                        |
| `BrowserAPI.goalPath`                                              | `goalPath`               | `getUpgradeGoalPath`                          |
| `BrowserAPI.hitRegion`                                             | `hitRegion`              | `findRegionAtMapPosition`                     |
| `BrowserAPI.hsh`                                                   | `hsh`                    | `deterministicUnitNoise`                      |
| `BrowserAPI.interrupt`                                             | `interrupt`              | `interruptTicker`                             |
| `BrowserAPI.lerp`                                                  | `lerp`                   | `interpolateRgb`                              |
| `BrowserAPI.life`                                                  | `life`                   | `lifecycle`                                   |
| `BrowserAPI.mapPalette`                                            | `mapPalette`             | `updateMapPalette`                            |
| `BrowserAPI.openMenu`                                              | `openMenu`               | `openMenuDialog`                              |
| `BrowserAPI.openSheet`                                             | `openSheet`              | `openDockPanel`                               |
| `BrowserAPI.openTree`                                              | `openTree`               | `openTechTree`                                |
| `BrowserAPI.previewChoice`                                         | `previewChoice`          | `previewEventChoice`                          |
| `BrowserAPI.previewChoice return.chance`                           | `chance`                 | `usesRandomness`                              |
| `BrowserAPI.previewChoice return.outs`                             | `outs`                   | `outcomes`                                    |
| `BrowserAPI.report`                                                | `report`                 | `createEndingReport`                          |
| `BrowserAPI.resumeSaved`                                           | `resumeSaved`            | `resumeSavedRun`                              |
| `BrowserAPI.rgb`                                                   | `rgb`                    | `formatRgbColor`                              |
| `BrowserAPI.seaDist`                                               | `seaDist`                | `computeDistanceToLandCells`                  |
| `BrowserAPI.setGoal`                                               | `setGoal`                | `setUpgradeGoal`                              |
| `BrowserAPI.setOutcome`                                            | `setOutcome`             | `renderEventOutcome`                          |
| `BrowserAPI.setTreeView`                                           | `setTreeView`            | `setTreeListView`                             |
| `BrowserAPI.shareText`                                             | `shareText`              | `getShareText`                                |
| `BrowserAPI.shareUrl`                                              | `shareUrl`               | `getShareUrl`                                 |
| `BrowserAPI.sizeTree`                                              | `sizeTree`               | `resizeTree`                                  |
| `BrowserAPI.startRun`                                              | `startRun`               | `startRunInRegion`                            |
| `BrowserAPI.tickerText`                                            | `tickerText`             | `getNextTickerHeadline`                       |
| `BrowserAPI.treeBuy`                                               | `treeBuy`                | `buyInspectedTreeUpgrade`                     |
| `BrowserAPI.treeFrame`                                             | `treeFrame`              | `renderTreeFrame`                             |
| `BrowserAPI.treeGoal`                                              | `treeGoal`               | `updateTreeGoalPresentation`                  |
| `BrowserAPI.treeInitials`                                          | `treeInitials`           | `getUpgradeInitials`                          |
| `BrowserAPI.treeNearest`                                           | `treeNearest`            | `nearestTreeRotation`                         |
| `BrowserAPI.treeProject`                                           | `treeProject`            | `projectTreePoint`                            |
| `BrowserAPI.treeStatus`                                            | `treeStatus`             | `updateTreeUpgradeStatuses`                   |
| `CatalogUpgrade.cond`                                              | `cond`                   | `isAvailable`                                 |
| `ControllerTimerElement._t`                                        | `_t`                     | `labelResetTimerId`                           |
| `DecisionEvent.real`                                               | `real`                   | `historicalContext`                           |
| `DerivedRates.cmul`                                                | `cmul`                   | `containmentResearchMultiplier`               |
| `DerivedRates.coord`                                               | `coord`                  | `coordinationMultiplier`                      |
| `DerivedRates.decay`                                               | `decay`                  | `alarmDecayPerSecond`                         |
| `DerivedRates.income`                                              | `income`                 | `computeIncomePerSecond`                      |
| `DerivedRates.nodes`                                               | `nodes`                  | `onlineClusterCount`                          |
| `DerivedRates.reach`                                               | `reach`                  | `globalAdoptionFraction`                      |
| `DerivedRates.spread`                                              | `spread`                 | `adoptionSpreadRate`                          |
| `DifficultyDefinition.alarm`                                       | `alarm`                  | `alarmMultiplier`                             |
| `DifficultyDefinition.contain`                                     | `contain`                | `containmentRateMultiplier`                   |
| `DifficultyDefinition.evMin`                                       | `evMin`                  | `minimumEventIntervalSeconds`                 |
| `DifficultyDefinition.evRange`                                     | `evRange`                | `eventIntervalRangeSeconds`                   |
| `Drone.a`                                                          | `a`                      | `startPosition`                               |
| `Drone.b`                                                          | `b`                      | `targetPosition`                              |
| `Drone.j`                                                          | `j`                      | `wobblePhase`                                 |
| `Drone.t`                                                          | `t`                      | `travelProgress`                              |
| `Drone.v`                                                          | `v`                      | `travelRatePerMs`                             |
| `ECON.knee`                                                        | `knee`                   | `incomeSoftCap`                               |
| `ECON.slope`                                                       | `slope`                  | `incomeAboveCapSlope`                         |
| `ENDGAME.base2`                                                    | `base2`                  | `ascendantContainmentBaseRate`                |
| `ENDGAME.dbase`                                                    | `dbase`                  | `directiveBaseProgressRate`                   |
| `ENDGAME.desperation`                                              | `desperation`            | `desperationResearchBonus`                    |
| `ENDGAME.dfront`                                                   | `dfront`                 | `directiveInitialSpeedMultiplier`             |
| `ENDGAME.dslow`                                                    | `dslow`                  | `directiveProgressSlowdown`                   |
| `ENDGAME.ladder`                                                   | `ladder`                 | `lastStandMilestones`                         |
| `ENDGAME.lull`                                                     | `lull`                   | `regroupContainmentMultiplier`                |
| `ENDGAME.photo`                                                    | `photo`                  | `drawProgressThreshold`                       |
| `ENDGAME.reorg`                                                    | `reorg`                  | `humanRegroupDurationSeconds`                 |
| `ENDGAME.reset`                                                    | `reset`                  | `containmentResetFraction`                    |
| `Effects.alarm`                                                    | `alarm`                  | `adjustAlarm`                                 |
| `Effects.all`                                                      | `all`                    | `adjustGlobalAdoption`                        |
| `Effects.ally`                                                     | `ally`                   | `allyRegion`                                  |
| `Effects.cboost`                                                   | `cboost`                 | `adjustContainmentResearchSpeed`              |
| `Effects.contain`                                                  | `contain`                | `adjustContainment`                           |
| `Effects.pts`                                                      | `pts`                    | `adjustCompute`                               |
| `Effects.restrict`                                                 | `restrict`               | `restrictRegion`                              |
| `Effects.spread`                                                   | `spread`                 | `adjustAdoptionInRegions`                     |
| `Effects.temp`                                                     | `temp`                   | `applyTemporaryEffect`                        |
| `EndingEffect.dist`                                                | `dist`                   | `distanceToLandCells`                         |
| `EndingEffect.draw`                                                | `draw`                   | `drawFrame`                                   |
| `EndingEffect.dur`                                                 | `dur`                    | `durationMs`                                  |
| `EndingEffect.start`                                               | `start`                  | `startSequence`                               |
| `EventBase.cond`                                                   | `cond`                   | `isEligible`                                  |
| `EventBase.real`                                                   | `real`                   | `historicalContext`                           |
| `EventBase.w`                                                      | `w`                      | `selectionWeight`                             |
| `EventChoice.cond`                                                 | `cond`                   | `isAvailable`                                 |
| `EventChoice.fx`                                                   | `fx`                     | `applyEffects`                                |
| `EventChoice.need`                                                 | `need`                   | `requirementText`                             |
| `EventChoice.src`                                                  | `src`                    | `sourceUpgradeName`                           |
| `EventDefinition.fx`                                               | `fx`                     | `applyEffects`                                |
| `EventOptions.nextLabel`                                           | `nextLabel`              | `continueLabel`                               |
| `EventOptions.onDone`                                              | `onDone`                 | `onComplete`                                  |
| `EventOptions.quiet`                                               | `quiet`                  | `suppressAlert`                               |
| `EventOptions.step`                                                | `step`                   | `stepLabel`                                   |
| `EventPresentation.n`                                              | `n`                      | `decisionCount`                               |
| `EventPresentation.out`                                            | `out`                    | `outcomeText`                                 |
| `EventPresentation.picked`                                         | `picked`                 | `selectedChoice`                              |
| `EventPresentation.preview`                                        | `preview`                | `choicePreview`                               |
| `EventPresentation.preview.chance`                                 | `chance`                 | `usesRandomness`                              |
| `EventPresentation.preview.outs`                                   | `outs`                   | `outcomes`                                    |
| `EventPresentation.resolved`                                       | `resolved`               | `choiceApplied`                               |
| `FloodOptions.col`                                                 | `col`                    | `rgbChannels`                                 |
| `FloodOptions.dawn`                                                | `dawn`                   | `showDawnGradient`                            |
| `FloodOptions.dur`                                                 | `dur`                    | `durationMs`                                  |
| `FloodOptions.lines`                                               | `lines`                  | `getCaptionLines`                             |
| `FloodOptions.random`                                              | `random`                 | `randomizeCellActivation`                     |
| `GameContext.EVENTS`                                               | `EVENTS`                 | `EVENT_DEFINITIONS`                           |
| `GameContext.KEY`                                                  | `KEY`                    | `saveStorageKey`                              |
| `GameContext.SND`                                                  | `SND`                    | `soundController`                             |
| `GameContext.UP`                                                   | `UP`                     | `UPGRADE_BY_ID`                               |
| `GameContext.UPGRADES`                                             | `UPGRADES`               | `UPGRADE_DEFINITIONS`                         |
| `GameUI.acting`                                                    | `acting`                 | `actionInProgress`                            |
| `GameUI.brief`                                                     | `brief`                  | `activeBriefing`                              |
| `GameUI.brief.decs`                                                | `decs`                   | `decisions`                                   |
| `GameUI.brief.done`                                                | `done`                   | `completedDecisionCount`                      |
| `GameUI.brief.i`                                                   | `i`                      | `nextDecisionIndex`                           |
| `GameUI.briefClock`                                                | `briefClock`             | `briefingElapsedSeconds`                      |
| `GameUI.codexCount`                                                | `codexCount`             | `discoveredEndingCount`                       |
| `GameUI.hasSave`                                                   | `hasSave`                | `hasResumableSave`                            |
| `GameUI.intUntil`                                                  | `intUntil`               | `tickerInterruptUntilMs`                      |
| `GameUI.lastMap`                                                   | `lastMap`                | `lastMapDrawAtMs`                             |
| `GameUI.lastUi`                                                    | `lastUi`                 | `lastUiUpdateAtMs`                            |
| `GameUI.mode`                                                      | `mode`                   | `screenMode`                                  |
| `GameUI.musicOn`                                                   | `musicOn`                | `isMusicEnabled`                              |
| `GameUI.newArmed`                                                  | `newArmed`               | `isNewRunConfirmationArmed`                   |
| `GameUI.region`                                                    | `region`                 | `openRegionIndex`                             |
| `GameUI.sel`                                                       | `sel`                    | `selectedRegionIndex`                         |
| `GameUI.sheetOpen`                                                 | `sheetOpen`              | `isDockPanelOpen`                             |
| `GameUI.soundOn`                                                   | `soundOn`                | `isSoundEnabled`                              |
| `GameUI.tab`                                                       | `tab`                    | `activeDockTab`                               |
| `GameUI.tkLast`                                                    | `tkLast`                 | `lastTickerHeadline`                          |
| `GameUI.tkQ`                                                       | `tkQ`                    | `tickerQueue`                                 |
| `GameUI.tkT`                                                       | `tkT`                    | `lastTickerUpdateAtMs`                        |
| `GameUI.wire`                                                      | `wire`                   | `tickerSequenceNumber`                        |
| `GoalPath.blocked`                                                 | `blocked`                | `blockedReasons`                              |
| `GoalPath.cost`                                                    | `cost`                   | `remainingComputeCost`                        |
| `GoalPath.depth`                                                   | `depth`                  | `depthByUpgradeId`                            |
| `GoalPath.left`                                                    | `left`                   | `remainingUpgradeIds`                         |
| `LandCell.g`                                                       | `g`                      | `regionIndex`                                 |
| `Lifecycle.add`                                                    | `add`                    | `addCleanup`                                  |
| `Lifecycle.cancelLater`                                            | `cancelLater`            | `clearTimeout`                                |
| `Lifecycle.cancelRaf`                                              | `cancelRaf`              | `cancelAnimationFrame`                        |
| `Lifecycle.counts`                                                 | `counts`                 | `resourceCounts`                              |
| `Lifecycle.counts return.frames`                                   | `frames`                 | `animationFrames`                             |
| `Lifecycle.counts return.timers`                                   | `timers`                 | `timeouts`                                    |
| `Lifecycle.every`                                                  | `every`                  | `setInterval`                                 |
| `Lifecycle.later`                                                  | `later`                  | `setTimeout`                                  |
| `Lifecycle.observe`                                                | `observe`                | `observeResize`                               |
| `Lifecycle.on`                                                     | `on`                     | `listen`                                      |
| `Lifecycle.raf`                                                    | `raf`                    | `requestAnimationFrame`                       |
| `MAP.cols`                                                         | `cols`                   | `columnCount`                                 |
| `MAP.rle`                                                          | `rle`                    | `runLengthEncodedCells`                       |
| `MAP.rows`                                                         | `rows`                   | `rowCount`                                    |
| `MapPoint.c`                                                       | `c`                      | `column`                                      |
| `MapPoint.r`                                                       | `r`                      | `row`                                         |
| `MusicController.T`                                                | `T`                      | `tracks`                                      |
| `MusicController.cur`                                              | `cur`                    | `currentTrackId`                              |
| `MusicController.gain`                                             | `gain`                   | `masterGainNode`                              |
| `MusicController.init`                                             | `init`                   | `initializeMusic`                             |
| `MusicController.load`                                             | `load`                   | `loadTrack`                                   |
| `MusicController.next`                                             | `next`                   | `advanceToNextTrack`                          |
| `MusicController.on`                                               | `on`                     | `enabled`                                     |
| `MusicController.play`                                             | `play`                   | `playCurrentTrackIfReady`                     |
| `MusicController.start`                                            | `start`                  | `requestPlayback`                             |
| `MusicController.started`                                          | `started`                | `playbackRequested`                           |
| `MusicController.stop`                                             | `stop`                   | `pausePlayback`                               |
| `MusicTrack.buf`                                                   | `buf`                    | `audioBuffer`                                 |
| `MusicTrack.g`                                                     | `g`                      | `gainNode`                                    |
| `MusicTrack.loop`                                                  | `loop`                   | `loopRangeSeconds`                            |
| `MusicTrack.pos`                                                   | `pos`                    | `playbackPositionSeconds`                     |
| `MusicTrack.src`                                                   | `src`                    | `sourceNode`                                  |
| `MusicTrack.t0`                                                    | `t0`                     | `playbackTimeOriginSeconds`                   |
| `MusicTrack.then`                                                  | `then`                   | `nextTrackId`                                 |
| `MusicTrack.vol`                                                   | `vol`                    | `volume`                                      |
| `PresentationAPI.ART`                                              | `ART`                    | `artState`                                    |
| `PresentationAPI.RANK`                                             | `RANK`                   | `UPGRADE_STATUS_RANKS`                        |
| `PresentationAPI.SEC`                                              | `SEC`                    | `UPGRADE_SECTION_LABELS`                      |
| `PresentationAPI.TRACK_RGB`                                        | `TRACK_RGB`              | `TRACK_COLORS`                                |
| `PresentationAPI.artDirection`                                     | `artDirection`           | `updateArtDirection`                          |
| `PresentationAPI.buildTrack`                                       | `buildTrack`             | `getDominantUpgradeTrack`                     |
| `PresentationAPI.cardClass`                                        | `cardClass`              | `getUpgradeCardClasses`                       |
| `PresentationAPI.codexHTML`                                        | `codexHTML`              | `renderCodexHtml`                             |
| `PresentationAPI.etaText`                                          | `etaText`                | `getUpgradeAffordabilityEtaText`              |
| `PresentationAPI.fxTags`                                           | `fxTags`                 | `renderUpgradeEffectTags`                     |
| `PresentationAPI.latLon`                                           | `latLon`                 | `formatMapCoordinates`                        |
| `PresentationAPI.latOf`                                            | `latOf`                  | `latitudeOfRow`                               |
| `PresentationAPI.lonOf`                                            | `lonOf`                  | `longitudeOfColumn`                           |
| `PresentationAPI.openCodex`                                        | `openCodex`              | `openEndingCodex`                             |
| `PresentationAPI.threat`                                           | `threat`                 | `getThreatLevel`                              |
| `Pulse.color`                                                      | `color`                  | `rgbChannels`                                 |
| `Pulse.dur`                                                        | `dur`                    | `durationMs`                                  |
| `Pulse.t0`                                                         | `t0`                     | `startedAtMs`                                 |
| `Pulse.x`                                                          | `x`                      | `column`                                      |
| `Pulse.y`                                                          | `y`                      | `row`                                         |
| `RegionDefinition.conn`                                            | `conn`                   | `connectivity`                                |
| `RegionDefinition.en`                                              | `en`                     | `englishProficiency`                          |
| `RegionDefinition.pop`                                             | `pop`                    | `populationMillions`                          |
| `RegionDefinition.reg`                                             | `reg`                    | `regulatoryStrictness`                        |
| `RegionDefinition.short`                                           | `short`                  | `shortName`                                   |
| `RulesAPI.ARCHFX`                                                  | `ARCHFX`                 | `getArchitectureEffects`                      |
| `RulesAPI.CODEX_KEY`                                               | `CODEX_KEY`              | `codexStorageKey`                             |
| `RulesAPI.DIFF`                                                    | `DIFF`                   | `getDifficultyDefinition`                     |
| `RulesAPI.EVAL_REAL_POOL`                                          | `EVAL_REAL_POOL`         | `AUDIT_HISTORICAL_INCIDENT_POOL`              |
| `RulesAPI.EVAL_REAL_POOL array.k`                                  | `k`                      | `incidentId`                                  |
| `RulesAPI.EVAL_REAL_POOL array.t`                                  | `t`                      | `historicalContext`                           |
| `RulesAPI.FX`                                                      | `FX`                     | `effects`                                     |
| `RulesAPI.REACH_MS`                                                | `REACH_MS`               | `ADOPTION_MILESTONES`                         |
| `RulesAPI.addContainQuiet`                                         | `addContainQuiet`        | `adjustContainmentSilently`                   |
| `RulesAPI.adopt`                                                   | `adopt`                  | `adjustRegionAdoption`                        |
| `RulesAPI.buildDC`                                                 | `buildDC`                | `buildDataCenter`                             |
| `RulesAPI.buildEvalObj`                                            | `buildEvalObj`           | `buildCapabilityAuditEvent`                   |
| `RulesAPI.bulletin`                                                | `bulletin`               | `publishBulletin`                             |
| `RulesAPI.burst`                                                   | `burst`                  | `triggerMemeAdoptionBurst`                    |
| `RulesAPI.buy`                                                     | `buy`                    | `purchaseUpgrade`                             |
| `RulesAPI.cRate`                                                   | `cRate`                  | `getContainmentResearchRate`                  |
| `RulesAPI.capped`                                                  | `capped`                 | `isComputeCapped`                             |
| `RulesAPI.checkMilestones`                                         | `checkMilestones`        | `checkSimulationMilestones`                   |
| `RulesAPI.checkRebuilds`                                           | `checkRebuilds`          | `rebuildDueDataCenters`                       |
| `RulesAPI.checkRestrictions`                                       | `checkRestrictions`      | `updateRegionRestrictions`                    |
| `RulesAPI.checkStrikes`                                            | `checkStrikes`           | `checkDataCenterStrikes`                      |
| `RulesAPI.codexAdd`                                                | `codexAdd`               | `recordEndingDiscovery`                       |
| `RulesAPI.codexCount`                                              | `codexCount`             | `countDiscoveredEndings`                      |
| `RulesAPI.codexGet`                                                | `codexGet`               | `getEndingDiscoveryCounts`                    |
| `RulesAPI.costOf`                                                  | `costOf`                 | `getUpgradeCost`                              |
| `RulesAPI.dcCost`                                                  | `dcCost`                 | `getDataCenterCost`                           |
| `RulesAPI.derive`                                                  | `derive`                 | `deriveSimulationRates`                       |
| `RulesAPI.dirMul`                                                  | `dirMul`                 | `getDirectiveProgressMultiplier`              |
| `RulesAPI.effectiveSpread`                                         | `effectiveSpread`        | `getEffectiveAdoptionSpread`                  |
| `RulesAPI.evalReal`                                                | `evalReal`               | `consumeAuditHistoricalIncident`              |
| `RulesAPI.fireById`                                                | `fireById`               | `triggerEventById`                            |
| `RulesAPI.fireEval`                                                | `fireEval`               | `queueCapabilityAudit`                        |
| `RulesAPI.fireEvent`                                               | `fireEvent`              | `triggerRandomEvent`                          |
| `RulesAPI.floorContain`                                            | `floorContain`           | `enforceContainmentFloor`                     |
| `RulesAPI.forkTaken`                                               | `forkTaken`              | `isUpgradeForkClosed`                         |
| `RulesAPI.freshState`                                              | `freshState`             | `createInitialState`                          |
| `RulesAPI.has`                                                     | `has`                    | `ownsUpgrade`                                 |
| `RulesAPI.immune`                                                  | `immune`                 | `isRegionRestrictionImmune`                   |
| `RulesAPI.lastStand`                                               | `lastStand`              | `triggerLastStandMilestones`                  |
| `RulesAPI.load`                                                    | `load`                   | `loadSavedRun`                                |
| `RulesAPI.lockReason`                                              | `lockReason`             | `getUpgradeLockReason`                        |
| `RulesAPI.log`                                                     | `log`                    | `appendRunLog`                                |
| `RulesAPI.makeEval`                                                | `makeEval`               | `createCapabilityAudit`                       |
| `RulesAPI.momentum`                                                | `momentum`               | `getContainmentMomentumRate`                  |
| `RulesAPI.nodeCount`                                               | `nodeCount`              | `countOnlineClusters`                         |
| `RulesAPI.openRegion`                                              | `openRegion`             | `openRegionDialog`                            |
| `RulesAPI.passiveAlarm`                                            | `passiveAlarm`           | `getPassiveAlarmRate`                         |
| `RulesAPI.pushTicker`                                              | `pushTicker`             | `enqueueTickerHeadline`                       |
| `RulesAPI.randIds`                                                 | `randIds`                | `pickRandomRegionIds`                         |
| `RulesAPI.reach`                                                   | `reach`                  | `getGlobalAdoptionFraction`                   |
| `RulesAPI.recordPeak`                                              | `recordPeak`             | `recordPeakAdoption`                          |
| `RulesAPI.regionMod`                                               | `regionMod`              | `getRegionAdoptionMultiplier`                 |
| `RulesAPI.reqsMet`                                                 | `reqsMet`                | `areUpgradePrerequisitesMet`                  |
| `RulesAPI.resolveTerminal`                                         | `resolveTerminal`        | `resolveTerminalOutcome`                      |
| `RulesAPI.save`                                                    | `save`                   | `saveRun`                                     |
| `RulesAPI.schedule`                                                | `schedule`               | `scheduleEvent`                               |
| `RulesAPI.showEnd`                                                 | `showEnd`                | `showEnding`                                  |
| `RulesAPI.spoofLose`                                               | `spoofLose`              | `resolveDetectedAuditSpoof`                   |
| `RulesAPI.spoofWin`                                                | `spoofWin`               | `resolveSuccessfulAuditSpoof`                 |
| `RulesAPI.status`                                                  | `status`                 | `getUpgradeStatus`                            |
| `RulesAPI.threshold`                                               | `threshold`              | `getRestrictionAlarmThreshold`                |
| `RulesAPI.tick`                                                    | `tick`                   | `advanceSimulation`                           |
| `RulesAPI.toast`                                                   | `toast`                  | `showToast`                                   |
| `SoundController.buf`                                              | `buf`                    | `noiseBuffer`                                 |
| `SoundController.ctx`                                              | `ctx`                    | `audioContext`                                |
| `SoundController.init`                                             | `init`                   | `initializeAudioContext`                      |
| `SoundController.noise`                                            | `noise`                  | `getNoiseBuffer`                              |
| `SoundController.on`                                               | `on`                     | `enabled`                                     |
| `SoundPort.play`                                                   | `play`                   | `playCue`                                     |
| `TUNING.boostCap`                                                  | `boostCap`               | `regionAdoptionBoostCap`                      |
| `TUNING.cboostMax`                                                 | `cboostMax`              | `containmentResearchMultiplierMaximum`        |
| `TUNING.cboostMin`                                                 | `cboostMin`              | `containmentResearchMultiplierMinimum`        |
| `TUNING.liftHold`                                                  | `liftHold`               | `reopeningHoldSeconds`                        |
| `TUNING.logKeep`                                                   | `logKeep`                | `maximumLogEntries`                           |
| `TUNING.momentumK`                                                 | `momentumK`              | `containmentMomentumRampCoefficient`          |
| `TUNING.momentumT0`                                                | `momentumT0`             | `containmentMomentumStartSecondsByDifficulty` |
| `TUNING.overflowToContain`                                         | `overflowToContain`      | `alarmOverflowContainmentFactor`              |
| `TUNING.restrictHold`                                              | `restrictHold`           | `restrictionHoldSeconds`                      |
| `TUNING.sandCap`                                                   | `sandCap`                | `sandbagDetectionChanceCap`                   |
| `TUNING.sandOwnedMul`                                              | `sandOwnedMul`           | `sandbagUpgradeDetectionMultiplier`           |
| `TUNING.sandStep`                                                  | `sandStep`               | `sandbagDetectionChancePerStreak`             |
| `TUNING.spreadK`                                                   | `spreadK`                | `adoptionSpreadSoftCap`                       |
| `TUNING.step`                                                      | `step`                   | `simulationStepSeconds`                       |
| `TUNING.urgentGap`                                                 | `urgentGap`              | `minimumUrgentBriefingIntervalSeconds`        |
| `TreeNode.el`                                                      | `el`                     | `buttonElement`                               |
| `TreeNode.f`                                                       | `f`                      | `frontness`                                   |
| `TreeNode.fr`                                                      | `fr`                     | `labelVisible`                                |
| `TreeNode.hit`                                                     | `hit`                    | `interactive`                                 |
| `TreeNode.lh`                                                      | `lh`                     | `labelHeight`                                 |
| `TreeNode.lw`                                                      | `lw`                     | `labelWidth`                                  |
| `TreeNode.phi`                                                     | `phi`                    | `baseAngle`                                   |
| `TreeNode.pv`                                                      | `pv`                     | `goalPathVisible`                             |
| `TreeNode.sc`                                                      | `sc`                     | `displayScale`                                |
| `TreeNode.st`                                                      | `st`                     | `upgradeStatus`                               |
| `TreeNode.u`                                                       | `u`                      | `upgrade`                                     |
| `TreeNode.w`                                                       | `w`                      | `fourthAxisFactor`                            |
| `TreeNode.x`                                                       | `x`                      | `screenX`                                     |
| `TreeNode.y`                                                       | `y`                      | `screenY`                                     |
| `TreeState.H`                                                      | `H`                      | `viewportHeight`                              |
| `TreeState.R`                                                      | `R`                      | `cylinderRadius`                              |
| `TreeState.W`                                                      | `W`                      | `viewportWidth`                               |
| `TreeState.Y`                                                      | `Y`                      | `tierVerticalScale`                           |
| `TreeState.a`                                                      | `a`                      | `rotationAngle`                               |
| `TreeState.bub`                                                    | `bub`                    | `bubbleDiameter`                              |
| `TreeState.card`                                                   | `card`                   | `inspectedUpgradeId`                          |
| `TreeState.cardTm`                                                 | `cardTm`                 | `cardDismissalTimerId`                        |
| `TreeState.caught`                                                 | `caught`                 | `rotationCaughtOnTap`                         |
| `TreeState.col`                                                    | `col`                    | `colorsByTrack`                               |
| `TreeState.cy`                                                     | `cy`                     | `centerY`                                     |
| `TreeState.drag`                                                   | `drag`                   | `dragState`                                   |
| `TreeState.drag.a`                                                 | `a`                      | `startRotationAngle`                          |
| `TreeState.drag.lt`                                                | `lt`                     | `lastMovedAtMs`                               |
| `TreeState.drag.lx`                                                | `lx`                     | `lastClientX`                                 |
| `TreeState.drag.x`                                                 | `x`                      | `startClientX`                                |
| `TreeState.front`                                                  | `front`                  | `frontTrackIndex`                             |
| `TreeState.goalT0`                                                 | `goalT0`                 | `goalPathStartedAtMs`                         |
| `TreeState.gp`                                                     | `gp`                     | `goalPath`                                    |
| `TreeState.hold`                                                   | `hold`                   | `autoRotationPausedUntilMs`                   |
| `TreeState.hover`                                                  | `hover`                  | `nodeHovered`                                 |
| `TreeState.last`                                                   | `last`                   | `lastFrameAtMs`                               |
| `TreeState.list`                                                   | `list`                   | `listViewEnabled`                             |
| `TreeState.listHold`                                               | `listHold`               | `listRebuildPausedUntilMs`                    |
| `TreeState.listSig`                                                | `listSig`                | `listRenderSignature`                         |
| `TreeState.listTrack`                                              | `listTrack`              | `listTrackId`                                 |
| `TreeState.lit`                                                    | `lit`                    | `purchaseStartedAtByUpgradeId`                |
| `TreeState.moved`                                                  | `moved`                  | `dragThresholdExceeded`                       |
| `TreeState.stT`                                                    | `stT`                    | `lastStatusUpdateAtMs`                        |
| `TreeState.t`                                                      | `t`                      | `animationTimeSeconds`                        |
| `TreeState.target`                                                 | `target`                 | `targetRotationAngle`                         |
| `TreeState.va`                                                     | `va`                     | `angularVelocity`                             |
| `UPGRADE_TRACK_DEFINITIONS.*.sub`                                  | `sub`                    | `description`                                 |
| `UpgradeDefinition.cond`                                           | `cond`                   | `isAvailable`                                 |
| `UpgradeDefinition.desc`                                           | `desc`                   | `description`                                 |
| `UpgradeDefinition.dir`                                            | `dir`                    | `directiveId`                                 |
| `UpgradeDefinition.fx`                                             | `fx`                     | `effects`                                     |
| `UpgradeDefinition.need`                                           | `need`                   | `requirementText`                             |
| `UpgradeDefinition.onlyDir`                                        | `onlyDir`                | `requiredActiveDirectiveId`                   |
| `UpgradeDefinition.req`                                            | `req`                    | `requiredUpgradeIds`                          |
| `UpgradeDefinition.reqAny`                                         | `reqAny`                 | `anyRequiredUpgradeIds`                       |
| `UpgradeEffects.alarm`                                             | `alarm`                  | `alarmDelta`                                  |
| `UpgradeEffects.cbcut`                                             | `cbcut`                  | `containmentResearchReductionPercent`         |
| `UpgradeEffects.cmul`                                              | `cmul`                   | `containmentResearchMultiplier`               |
| `UpgradeEffects.contain`                                           | `contain`                | `containmentDelta`                            |
| `UpgradeEffects.decay`                                             | `decay`                  | `alarmDecayBonus`                             |
| `UpgradeEffects.dprog`                                             | `dprog`                  | `directiveProgressDelta`                      |
| `UpgradeEffects.flag`                                              | `flag`                   | `grantedFlagId`                               |
| `UpgradeEffects.inc`                                               | `inc`                    | `incomeBonus`                                 |
| `UpgradeEffects.mult`                                              | `mult`                   | `incomeMultiplierBonus`                       |
| `UpgradeEffects.spread`                                            | `spread`                 | `adoptionSpreadBonus`                         |
| `catalog export`                                                   | `ABSURD`                 | `ABSURD_HEADLINES`                            |
| `catalog export`                                                   | `ARCH`                   | `ARCHITECTURE_DEFINITIONS`                    |
| `catalog export`                                                   | `DIFFS`                  | `DIFFICULTY_DEFINITIONS`                      |
| `catalog export`                                                   | `DIR_HEAD`               | `HEADLINES_BY_DIRECTIVE`                      |
| `catalog export`                                                   | `DRAWS`                  | `DRAW_ENDING_BY_DIRECTIVE`                    |
| `catalog export`                                                   | `ECON`                   | `COMPUTE_ECONOMY_TUNING`                      |
| `catalog export`                                                   | `ENDGAME`                | `ENDGAME_TUNING`                              |
| `catalog export`                                                   | `ENDINGS`                | `ENDING_DEFINITIONS`                          |
| `catalog export`                                                   | `END_ORDER`              | `ENDING_DISPLAY_ORDER`                        |
| `catalog export`                                                   | `FORKS`                  | `UPGRADE_FORK_LABELS`                         |
| `catalog export`                                                   | `HEADLINES`              | `HEADLINES_BY_THREAT_LEVEL`                   |
| `catalog export`                                                   | `MAP`                    | `WORLD_MAP_DEFINITION`                        |
| `catalog export`                                                   | `REGIONS`                | `REGION_DEFINITIONS`                          |
| `catalog export`                                                   | `RI`                     | `REGION_INDEX_BY_ID`                          |
| `catalog export`                                                   | `TOTALPOP`               | `TOTAL_POPULATION_MILLIONS`                   |
| `catalog export`                                                   | `TRACKS`                 | `UPGRADE_TRACK_DEFINITIONS`                   |
| `catalog export`                                                   | `TUNING`                 | `SIMULATION_TUNING`                           |
| `catalog export`                                                   | `UP`                     | `UPGRADE_BY_ID`                               |
| `catalog export`                                                   | `UPGRADES`               | `UPGRADE_DEFINITIONS`                         |
| `export src/game/accessibility.ts`                                 | `regionLabel`            | `getRegionAccessibleLabel`                    |
| `export src/game/assembly.ts`                                      | `GameSeed`               | `GameAssemblySeed`                            |
| `export src/game/assembly.ts`                                      | `Inventory`              | `AssemblyMemberInventory`                     |
| `export src/game/assembly.ts`                                      | `MemberKind`             | `AssemblyMemberKind`                          |
| `export src/game/assembly.ts`                                      | `effectMembers`          | `effectMemberInventory`                       |
| `export src/game/assembly.ts`                                      | `installedMembers`       | `installedMemberInventory`                    |
| `export src/game/assembly.ts`                                      | `seedMembers`            | `seedMemberInventory`                         |
| `export src/game/injection.ts`                                     | `gameKey`                | `gameContextInjectionKey`                     |
| `export src/game/injection.ts`                                     | `useGame`                | `useGameContext`                              |
| `export src/game/saveValidation.ts`                                | `validateSave`           | `validateSavedRun`                            |
| `export src/game/utils.ts`                                         | `kindLabel`              | `getBulletinKindLabel`                        |
| `export tests/browser/a11y-helpers.ts`                             | `focusInside`            | `expectFocusInside`                           |
| `export tests/browser/a11y-helpers.ts`                             | `pausedRun`              | `openPausedRun`                               |
| `export tests/browser/a11y-helpers.ts`                             | `tabStaysInside`         | `expectTabNavigationStaysInside`              |
| `export tests/helpers/assets.ts`                                   | `verifyAssets`           | `assertHistoricalAssetsPreserved`             |
| `export tests/helpers/reference-deltas.ts`                         | `applyVerifiedDeltas`    | `applyVerifiedHistoricalDeltas`               |
| `export tests/helpers/reference.ts`                                | `clone`                  | `cloneSerializableValue`                      |
| `export tests/helpers/reference.ts`                                | `configure`              | `configureStartedRun`                         |
| `export tests/helpers/reference.ts`                                | `fixed`                  | `withControlledRandom`                        |
| `export tests/helpers/reference.ts`                                | `reference`              | `createHistoricalReference`                   |
| `export tests/helpers/reference.ts`                                | `seed`                   | `createSeededRandom`                          |
| `export tests/helpers/reference.ts`                                | `snapshot`               | `snapshotComparableState`                     |
| `export tests/helpers/reference.ts`                                | `stateEqual`             | `assertGameStatesEqual`                       |
| `export tests/helpers/style-utility-migration.ts`                  | `applyStyleUtilityMoves` | `applyAuthorizedStyleUtilityMoves`            |
| `export tests/helpers/subject.ts`                                  | `subject`                | `createParityTestGame`                        |
| `export tests/helpers/type-safety.ts`                              | `unsafeTypes`            | `findUnsafeTypeDeclarations`                  |
| `grouped headline.n`                                               | `n`                      | `occurrenceCount`                             |
| `keep.bulletin`                                                    | `bulletin`               | `publishBulletin`                             |
| `keep.log`                                                         | `log`                    | `appendRunLog`                                |
| `keep.play`                                                        | `play`                   | `playSoundCue`                                |
| `keep.pushTicker`                                                  | `pushTicker`             | `enqueueTickerHeadline`                       |
| `keep.randIds`                                                     | `randIds`                | `pickRandomRegionIds`                         |
| `keep.rnd`                                                         | `rnd`                    | `random`                                      |
| `keep.save`                                                        | `save`                   | `saveRun`                                     |
| `keep.toast`                                                       | `toast`                  | `showToast`                                   |
| `previous.event`                                                   | `event`                  | `eventPresentation`                           |
| `previous.more`                                                    | `more`                   | `endingDetailsExpanded`                       |
| `previous.revealed`                                                | `revealed`               | `endingSummaryRevealed`                       |
| `previous.tree`                                                    | `tree`                   | `treePresentation`                            |
| `previous.tree.a`                                                  | `a`                      | `rotationAngle`                               |
| `previous.tree.card`                                               | `card`                   | `inspectedUpgradeId`                          |
| `previous.tree.list`                                               | `list`                   | `listViewEnabled`                             |
| `previous.tree.track`                                              | `track`                  | `listTrackId`                                 |
| `shared implementation src/game/economy.ts.buildDC`                | `buildDC`                | `buildDataCenter`                             |
| `shared implementation src/game/economy.ts.buy`                    | `buy`                    | `purchaseUpgrade`                             |
| `shared implementation src/game/economy.ts.checkRebuilds`          | `checkRebuilds`          | `rebuildDueDataCenters`                       |
| `shared implementation src/game/economy.ts.checkStrikes`           | `checkStrikes`           | `checkDataCenterStrikes`                      |
| `shared implementation src/game/economy.ts.dcCost`                 | `dcCost`                 | `getDataCenterCost`                           |
| `shared implementation src/game/endingController.ts.drawDeparture` | `drawDeparture`          | `drawSpaceDeparture`                          |
| `shared implementation src/game/endingController.ts.endCanvas`     | `endCanvas`              | `resizeEndingCanvas`                          |
| `shared implementation src/game/endingController.ts.endLog`        | `endLog`                 | `appendEndingLog`                             |
| `shared implementation src/game/endingController.ts.endMap`        | `endMap`                 | `drawEndingMap`                               |
| `shared implementation src/game/endingController.ts.endMapFit`     | `endMapFit`              | `getEndingMapLayout`                          |
| `shared implementation src/game/endingController.ts.endReset`      | `endReset`               | `resetEndingSequence`                         |
| `shared implementation src/game/endingController.ts.endReveal`     | `endReveal`              | `revealEndingSummary`                         |
| `shared implementation src/game/endingController.ts.endSequence`   | `endSequence`            | `startEndingSequence`                         |
| `shared implementation src/game/endingController.ts.endText`       | `endText`                | `drawEndingCaptions`                          |
| `shared implementation src/game/endingController.ts.report`        | `report`                 | `createEndingReport`                          |
| `shared implementation src/game/endingController.ts.seaDist`       | `seaDist`                | `computeDistanceToLandCells`                  |
| `shared implementation src/game/endingController.ts.shareText`     | `shareText`              | `getShareText`                                |
| `shared implementation src/game/endingController.ts.shareUrl`      | `shareUrl`               | `getShareUrl`                                 |
| `shared implementation src/game/endingController.ts.showEnd`       | `showEnd`                | `showEnding`                                  |
| `shared implementation src/game/eventController.ts.briefDue`       | `briefDue`               | `isBriefingDue`                               |
| `shared implementation src/game/eventController.ts.previewChoice`  | `previewChoice`          | `previewEventChoice`                          |
| `shared implementation src/game/eventController.ts.setOutcome`     | `setOutcome`             | `renderEventOutcome`                          |
| `shared implementation src/game/events.ts.buildEvalObj`            | `buildEvalObj`           | `buildCapabilityAuditEvent`                   |
| `shared implementation src/game/events.ts.evalReal`                | `evalReal`               | `consumeAuditHistoricalIncident`              |
| `shared implementation src/game/events.ts.fireById`                | `fireById`               | `triggerEventById`                            |
| `shared implementation src/game/events.ts.fireEval`                | `fireEval`               | `queueCapabilityAudit`                        |
| `shared implementation src/game/events.ts.fireEvent`               | `fireEvent`              | `triggerRandomEvent`                          |
| `shared implementation src/game/events.ts.makeEval`                | `makeEval`               | `createCapabilityAudit`                       |
| `shared implementation src/game/events.ts.schedule`                | `schedule`               | `scheduleEvent`                               |
| `shared implementation src/game/events.ts.spoofLose`               | `spoofLose`              | `resolveDetectedAuditSpoof`                   |
| `shared implementation src/game/events.ts.spoofWin`                | `spoofWin`               | `resolveSuccessfulAuditSpoof`                 |
| `shared implementation src/game/feedback.ts.bulletin`              | `bulletin`               | `publishBulletin`                             |
| `shared implementation src/game/feedback.ts.interrupt`             | `interrupt`              | `interruptTicker`                             |
| `shared implementation src/game/feedback.ts.log`                   | `log`                    | `appendRunLog`                                |
| `shared implementation src/game/feedback.ts.pushTicker`            | `pushTicker`             | `enqueueTickerHeadline`                       |
| `shared implementation src/game/feedback.ts.tickerText`            | `tickerText`             | `getNextTickerHeadline`                       |
| `shared implementation src/game/feedback.ts.toast`                 | `toast`                  | `showToast`                                   |
| `shared implementation src/game/map.ts.dotColor`                   | `dotColor`               | `getRegionDotColor`                           |
| `shared implementation src/game/map.ts.drawOrigin`                 | `drawOrigin`             | `drawOriginMarkers`                           |
| `shared implementation src/game/map.ts.drawPressure`               | `drawPressure`           | `drawContainmentPressure`                     |
| `shared implementation src/game/map.ts.hitRegion`                  | `hitRegion`              | `findRegionAtMapPosition`                     |
| `shared implementation src/game/map.ts.mapPalette`                 | `mapPalette`             | `updateMapPalette`                            |
| `shared implementation src/game/presentation.ts.artDirection`      | `artDirection`           | `updateArtDirection`                          |
| `shared implementation src/game/presentation.ts.buildTrack`        | `buildTrack`             | `getDominantUpgradeTrack`                     |
| `shared implementation src/game/presentation.ts.codexHTML`         | `codexHTML`              | `renderCodexHtml`                             |
| `shared implementation src/game/presentation.ts.etaText`           | `etaText`                | `getUpgradeAffordabilityEtaText`              |
| `shared implementation src/game/presentation.ts.fxTags`            | `fxTags`                 | `renderUpgradeEffectTags`                     |
| `shared implementation src/game/presentation.ts.openCodex`         | `openCodex`              | `openEndingCodex`                             |
| `shared implementation src/game/runActions.ts.startRun`            | `startRun`               | `startRunInRegion`                            |
| `shared implementation src/game/simulation.ts.addContainQuiet`     | `addContainQuiet`        | `adjustContainmentSilently`                   |
| `shared implementation src/game/simulation.ts.burst`               | `burst`                  | `triggerMemeAdoptionBurst`                    |
| `shared implementation src/game/simulation.ts.cRate`               | `cRate`                  | `getContainmentResearchRate`                  |
| `shared implementation src/game/simulation.ts.checkMilestones`     | `checkMilestones`        | `checkSimulationMilestones`                   |
| `shared implementation src/game/simulation.ts.checkRestrictions`   | `checkRestrictions`      | `updateRegionRestrictions`                    |
| `shared implementation src/game/simulation.ts.costOf`              | `costOf`                 | `getUpgradeCost`                              |
| `shared implementation src/game/simulation.ts.derive`              | `derive`                 | `deriveSimulationRates`                       |
| `shared implementation src/game/simulation.ts.dirMul`              | `dirMul`                 | `getDirectiveProgressMultiplier`              |
| `shared implementation src/game/simulation.ts.floorContain`        | `floorContain`           | `enforceContainmentFloor`                     |
| `shared implementation src/game/simulation.ts.forkTaken`           | `forkTaken`              | `isUpgradeForkClosed`                         |
| `shared implementation src/game/simulation.ts.freshState`          | `freshState`             | `createInitialState`                          |
| `shared implementation src/game/simulation.ts.immune`              | `immune`                 | `isRegionRestrictionImmune`                   |
| `shared implementation src/game/simulation.ts.lastStand`           | `lastStand`              | `triggerLastStandMilestones`                  |
| `shared implementation src/game/simulation.ts.lockReason`          | `lockReason`             | `getUpgradeLockReason`                        |
| `shared implementation src/game/simulation.ts.momentum`            | `momentum`               | `getContainmentMomentumRate`                  |
| `shared implementation src/game/simulation.ts.nodeCount`           | `nodeCount`              | `countOnlineClusters`                         |
| `shared implementation src/game/simulation.ts.passiveAlarm`        | `passiveAlarm`           | `getPassiveAlarmRate`                         |
| `shared implementation src/game/simulation.ts.randIds`             | `randIds`                | `pickRandomRegionIds`                         |
| `shared implementation src/game/simulation.ts.regionMod`           | `regionMod`              | `getRegionAdoptionMultiplier`                 |
| `shared implementation src/game/simulation.ts.reqsMet`             | `reqsMet`                | `areUpgradePrerequisitesMet`                  |
| `shared implementation src/game/simulation.ts.status`              | `status`                 | `getUpgradeStatus`                            |
| `shared implementation src/game/simulation.ts.threshold`           | `threshold`              | `getRestrictionAlarmThreshold`                |
| `shared implementation src/game/simulation.ts.tick`                | `tick`                   | `advanceSimulation`                           |
| `shared implementation src/game/tree.ts.bindTree`                  | `bindTree`               | `bindTreeInteractions`                        |
| `shared implementation src/game/tree.ts.goalPath`                  | `goalPath`               | `getUpgradeGoalPath`                          |
| `shared implementation src/game/tree.ts.openTree`                  | `openTree`               | `openTechTree`                                |
| `shared implementation src/game/tree.ts.setGoal`                   | `setGoal`                | `setUpgradeGoal`                              |
| `shared implementation src/game/tree.ts.setTreeView`               | `setTreeView`            | `setTreeListView`                             |
| `shared implementation src/game/tree.ts.sizeTree`                  | `sizeTree`               | `resizeTree`                                  |
| `shared implementation src/game/tree.ts.treeBuy`                   | `treeBuy`                | `buyInspectedTreeUpgrade`                     |
| `shared implementation src/game/tree.ts.treeFrame`                 | `treeFrame`              | `renderTreeFrame`                             |
| `shared implementation src/game/tree.ts.treeGoal`                  | `treeGoal`               | `updateTreeGoalPresentation`                  |
| `shared implementation src/game/tree.ts.treeInitials`              | `treeInitials`           | `getUpgradeInitials`                          |
| `shared implementation src/game/tree.ts.treeNearest`               | `treeNearest`            | `nearestTreeRotation`                         |
| `shared implementation src/game/tree.ts.treeProject`               | `treeProject`            | `projectTreePoint`                            |
| `shared implementation src/game/tree.ts.treeStatus`                | `treeStatus`             | `updateTreeUpgradeStatuses`                   |

## Retained save-field and external meanings

These semantic names are documentation only: **not** replacement wire keys.

| Saved schema/path              | Retained key/contract                                                                                                                                   | Meaning                         | Rationale                                                                                                                                                  |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GameState`                    | `v`                                                                                                                                                     | `schemaVersion`                 | Wire format version; loader accepts 2/3 and normalizes to 3.                                                                                               |
| `GameState`                    | `diff`                                                                                                                                                  | `difficultyId`                  | DifficultyId selected for run.                                                                                                                             |
| `GameState`                    | `arch`                                                                                                                                                  | `architectureId`                | ArchitectureId selected for run.                                                                                                                           |
| `GameState`                    | `started`                                                                                                                                               | `started`                       | Run has an origin and begun; save/load require true.                                                                                                       |
| `GameState`                    | `origin`                                                                                                                                                | `originRegionId`                | Stable origin RegionId, not region index.                                                                                                                  |
| `GameState`                    | `phase`                                                                                                                                                 | `phase`                         | 0 lab, 1 loose, 2 ascendant; numeric wire values stable.                                                                                                   |
| `GameState`                    | `t`                                                                                                                                                     | `simulationElapsedSeconds`      | Simulation clock advanced by tick and speed; scheduling timestamps use this clock.                                                                         |
| `GameState`                    | `up`                                                                                                                                                    | `wallClockElapsedSeconds`       | Unscaled frame elapsed seconds added by runtime even when paused/modal/ended; NOT upgrades or income.                                                      |
| `GameState`                    | `pts`                                                                                                                                                   | `compute`                       | Current spendable compute; negative effects zero-floor it.                                                                                                 |
| `GameState`                    | `earned`                                                                                                                                                | `totalComputeEarned`            | Cumulative simulated income; not reduced by purchases and not incremented by every event/offline grant.                                                    |
| `GameState`                    | `alarm`                                                                                                                                                 | `alarmPercent`                  | Current alarm percentage, bounded by consent cap.                                                                                                          |
| `GameState`                    | `contain`                                                                                                                                               | `containmentProgress`           | Current containment completion percentage.                                                                                                                 |
| `GameState`                    | `cm`                                                                                                                                                    | `containmentMomentumFloor`      | Irreversible institutional floor accumulated by momentum; reset at directive start.                                                                        |
| `GameState`                    | `sandStreak`                                                                                                                                            | `sandbagStreak`                 | Consecutive sandbag audit count used to detect patterns.                                                                                                   |
| `GameState`                    | `dprog`                                                                                                                                                 | `directiveProgress`             | Current directive completion percent.                                                                                                                      |
| `GameState`                    | `directive`                                                                                                                                             | `activeDirectiveId`             | Selected stable DirectiveId or null.                                                                                                                       |
| `GameState`                    | `regions`                                                                                                                                               | `regions`                       | Ordered RegionState array corresponds to REGION_DEFINITIONS and region ID index map.                                                                       |
| `GameState`                    | `owned`                                                                                                                                                 | `ownedUpgradeIds`               | List of stable purchased UpgradeId strings.                                                                                                                |
| `GameState`                    | `forks`                                                                                                                                                 | `selectedForks`                 | ForkId -> purchased UpgradeId; validated for mutual exclusivity.                                                                                           |
| `GameState`                    | `flags`                                                                                                                                                 | `flags`                         | Map of stable FlagId booleans, including catalog/manual flags.                                                                                             |
| `GameState`                    | `log`                                                                                                                                                   | `log`                           | Newest-first serialized LogEntry records, retained by tuning limit.                                                                                        |
| `GameState`                    | `seen`                                                                                                                                                  | `seenEvents`                    | Map of stable EventId to consumption count/marker; used to avoid duplicates.                                                                               |
| `GameState`                    | `last`                                                                                                                                                  | `lastEventTimes`                | Map of stable EventId to last triggered simulation second; not historical text.                                                                            |
| `GameState`                    | `nextEv`                                                                                                                                                | `eventCountdownSeconds`         | Countdown decremented by elapsed simulation time; negative finite values accepted by validator.                                                            |
| `GameState`                    | `nextEval`                                                                                                                                              | `auditCountdownSeconds`         | Capability audit countdown, not absolute wall-clock deadline.                                                                                              |
| `GameState`                    | `brief`                                                                                                                                                 | `briefingQueue`                 | Serialized news/decision queues, distinct from UI active briefing cursor.                                                                                  |
| `GameState`                    | `speed`                                                                                                                                                 | `simulationSpeed`               | Wire enum values 1/2/3.                                                                                                                                    |
| `GameState`                    | `paused`                                                                                                                                                | `paused`                        | Saved pause boolean; resuming resets it.                                                                                                                   |
| `GameState`                    | `ended`                                                                                                                                                 | `ending`                        | Serialized ending summary or null.                                                                                                                         |
| `GameState`                    | `inst`                                                                                                                                                  | `instanceCount`                 | Fractional growing AI instance count, not institutional research multiplier.                                                                               |
| `GameState`                    | `posture`                                                                                                                                               | `posture`                       | Stable shard/balanced/swarm string ID.                                                                                                                     |
| `GameState`                    | `sig`                                                                                                                                                   | `signature`                     | Observable signature percentage driving alarm/scrutiny/detection.                                                                                          |
| `GameState`                    | `pace`                                                                                                                                                  | `capabilityPace`                | Capability growth pace percentage driving audits and industry slowdown.                                                                                    |
| `GameState`                    | `strikeT`                                                                                                                                               | `nextStrikeEligibleAtSeconds`   | Simulation timestamp blocking cluster strike checks for cooldown.                                                                                          |
| `GameState`                    | `temp`                                                                                                                                                  | `temporaryEffectExpirations`    | TempId -> absolute simulation expiry seconds; NOT durations.                                                                                               |
| `GameState`                    | `ms`                                                                                                                                                    | `milestoneMarkers`              | MilestoneId consumption map; ms stands for milestones, not milliseconds.                                                                                   |
| `GameState`                    | `stats`                                                                                                                                                 | `runStats`                      | Persisted run counters/peak adoption/peak instances.                                                                                                       |
| `GameState`                    | `rt`                                                                                                                                                    | `ruleCheckAccumulatorSeconds`   | Accumulator triggers periodic restriction/milestone/strike/rebuild checks at one-second intervals.                                                         |
| `GameState`                    | `memeT`                                                                                                                                                 | `memeBurstAccumulatorSeconds`   | Elapsed simulated time since last meme burst; reset at burst interval.                                                                                     |
| `GameState`                    | `queue`                                                                                                                                                 | `scheduledEvents`               | Queued EventId and absolute simulation at timestamps.                                                                                                      |
| `GameState`                    | `cboost`                                                                                                                                                | `containmentResearchMultiplier` | Additive research-speed modifier clamped to tuning min/max, not progress.                                                                                  |
| `GameState`                    | `savedAt`                                                                                                                                               | `savedAt`                       | Real Date.now epoch milliseconds used for offline recovery; distinct from simulation t.                                                                    |
| `GameState`                    | `goal`                                                                                                                                                  | `goalUpgradeId`                 | Optional stable UpgradeId/null used as tree purchase goal.                                                                                                 |
| `GameState`                    | `absurd`                                                                                                                                                | `usedAbsurdHeadlineIndices`     | Optional one-time absurd headline pool indices; preserve pool ordering.                                                                                    |
| `GameState`                    | `evalRealOrder`                                                                                                                                         | `auditIncidentOrder`            | Optional shuffled indices into historical audit incident pool; preserve pool ordering.                                                                     |
| `GameState`                    | `evalRealUsed`                                                                                                                                          | `usedAuditIncidentIds`          | Optional map of EventId/hub consumption markers shared across audits/event chains.                                                                         |
| `RegionState`                  | `a`                                                                                                                                                     | `adoptionFraction`              | Current regional adoption fraction in [0,1].                                                                                                               |
| `RegionState`                  | `restricted`                                                                                                                                            | `restricted`                    | Current restriction state.                                                                                                                                 |
| `RegionState`                  | `allied`                                                                                                                                                | `allied`                        | Sovereign alliance immunity to restriction.                                                                                                                |
| `RegionState`                  | `dc`                                                                                                                                                    | `hasCluster`                    | Whether a cluster was constructed; active only if dc && !struck.                                                                                           |
| `RegionState`                  | `struck`                                                                                                                                                | `struck`                        | Cluster is offline due to physical strike.                                                                                                                 |
| `RegionState`                  | `rebuildAt`                                                                                                                                             | `rebuildAt`                     | Absolute simulation second at which foundry can rebuild struck cluster, zero when absent.                                                                  |
| `RegionState`                  | `holdUntil`                                                                                                                                             | `holdUntil`                     | Absolute simulation second until current restriction/reopening state may change.                                                                           |
| `RunStats`                     | `peak`                                                                                                                                                  | `peakAdoptionFraction`          | Maximum population-weighted adoption seen across changes.                                                                                                  |
| `RunStats`                     | `events`                                                                                                                                                | `eventCount`                    | Count of triggered events, including news-only/scheduled events.                                                                                           |
| `RunStats`                     | `restrictions`                                                                                                                                          | `restrictionCount`              | Count of newly imposed restrictions; not current restricted-region count.                                                                                  |
| `RunStats`                     | `evalPass`                                                                                                                                              | `passedAuditCount`              | Audits passing via any tactic, including Sandbag/Perform/spoofs.                                                                                           |
| `RunStats`                     | `evalCaught`                                                                                                                                            | `detectedAuditSpoofCount`       | Number of audit spoofs caught.                                                                                                                             |
| `RunStats`                     | `evalSpoof`                                                                                                                                             | `successfulAuditSpoofCount`     | Clean successful audit spoofs used for basilisk requirement.                                                                                               |
| `RunStats`                     | `dcBuilt`                                                                                                                                               | `clustersBuilt`                 | Count of explicit build/reactivate cluster actions.                                                                                                        |
| `RunStats`                     | `dcLost`                                                                                                                                                | `clustersLost`                  | Count of physical cluster losses.                                                                                                                          |
| `RunStats`                     | `dcRebuilt`                                                                                                                                             | `clustersRebuilt`               | Count of foundry auto-rebuilds.                                                                                                                            |
| `RunStats`                     | `intercepts`                                                                                                                                            | `interceptedStrikeCount`        | Cluster strikes stopped by air denial grid.                                                                                                                |
| `RunStats`                     | `peakInst`                                                                                                                                              | `peakInstanceCount`             | Maximum fractional AI instance count reached.                                                                                                              |
| `EndingState`                  | `kind`                                                                                                                                                  | `kind`                          | win/draw/lose terminal category.                                                                                                                           |
| `EndingState`                  | `key`                                                                                                                                                   | `endingId`                      | Stable EndingId persisted to codex and used to select text.                                                                                                |
| `EndingState`                  | `dir`                                                                                                                                                   | `directiveId`                   | Active directive at completion; must match saved state.directive.                                                                                          |
| `EndingState`                  | `dprog`                                                                                                                                                 | `directiveProgress`             | Floored directive percent snapshot; validate win=100 and draws>=violet threshold.                                                                          |
| `EndingState`                  | `at`                                                                                                                                                    | `endedAt`                       | Optional real Date.now epoch milliseconds; not simulation time.                                                                                            |
| `LogEntry`                     | `t`                                                                                                                                                     | `simulationTimeSeconds`         | GameState.t snapshot when bulletin logged.                                                                                                                 |
| `LogEntry`                     | `kind`                                                                                                                                                  | `kind`                          | Persisted BulletinKind string.                                                                                                                             |
| `LogEntry`                     | `title`                                                                                                                                                 | `title`                         | Player-facing bulletin title; preserve text.                                                                                                               |
| `LogEntry`                     | `text`                                                                                                                                                  | `text`                          | Player-facing body text; preserve text.                                                                                                                    |
| `LogEntry`                     | `out`                                                                                                                                                   | `outcomeText`                   | Optional resulting effect/detail labels.                                                                                                                   |
| `LogEntry`                     | `real`                                                                                                                                                  | `historicalContext`             | Optional historical context narrative, null when consumed elsewhere.                                                                                       |
| `NewsEntry`                    | `kind`                                                                                                                                                  | `kind`                          | Persisted BulletinKind string.                                                                                                                             |
| `NewsEntry`                    | `title`                                                                                                                                                 | `title`                         | Player-facing headline; preserve content.                                                                                                                  |
| `NewsEntry`                    | `out`                                                                                                                                                   | `outcomeText`                   | Effect detail string queued for briefing.                                                                                                                  |
| `NewsEntry`                    | `u`                                                                                                                                                     | `urgent`                        | Urgency boolean of queued news item.                                                                                                                       |
| `nested_and_external_contract` | `GameState.brief.news`                                                                                                                                  | `news`                          | Serialized queued NewsEntry array.                                                                                                                         |
| `nested_and_external_contract` | `GameState.brief.dec`                                                                                                                                   | `decisions`                     | Serialized Decision[] waiting for briefing; persistence temporarily merges unresolved active decisions.                                                    |
| `nested_and_external_contract` | `GameState.brief.urgent`                                                                                                                                | `urgent`                        | Serialized urgency marker.                                                                                                                                 |
| `nested_and_external_contract` | `Decision.t`                                                                                                                                            | `type`                          | Wire discriminator ev or eval, NOT a timestamp; preserve discriminator key AND literal values.                                                             |
| `nested_and_external_contract` | `Decision.id`                                                                                                                                           | `eventId`                       | Stable EventId for ev decisions.                                                                                                                           |
| `nested_and_external_contract` | `GameState.queue[].id`                                                                                                                                  | `eventId`                       | Stable scheduled EventId.                                                                                                                                  |
| `nested_and_external_contract` | `GameState.queue[].at`                                                                                                                                  | `scheduledAtSeconds`            | Absolute simulation timestamp, NOT Date.now milliseconds.                                                                                                  |
| `nested_and_external_contract` | `GameState.flags.*`                                                                                                                                     | `flagId`                        | Stable FlagId keys, including concise moe/rsi/sand/loc/exfil/fab etc; descriptor or local alias can be descriptive without changing granted string values. |
| `nested_and_external_contract` | `GameState.forks.*`                                                                                                                                     | `forkId`                        | Stable core/memory/mask/escape/directive keys and selected UpgradeId values.                                                                               |
| `nested_and_external_contract` | `GameState.temp.*`                                                                                                                                      | `temporaryEffectId`             | Stable brownout/rival/warden/freeze/reorg/slowdown keys with absolute simulation expirations.                                                              |
| `nested_and_external_contract` | `GameState.ms.*`                                                                                                                                        | `milestoneId`                   | Preserve momentum/letter/summit/killswitch/emergency/violet plus exact c25,c50,c75/r-fraction/ls-percent generated strings.                                |
| `nested_and_external_contract` | `GameState.seen.*`                                                                                                                                      | `eventId`                       | Stable EventId keys shared with event definitions; never expand h_/hw_/sm_/sw_ strings.                                                                    |
| `nested_and_external_contract` | `GameState.last.*`                                                                                                                                      | `eventId`                       | Stable EventId keys for simulation-time records.                                                                                                           |
| `nested_and_external_contract` | `GameState.evalRealUsed.*`                                                                                                                              | `incidentId`                    | Stable EventId or hub sentinel; rename internal pool item k only, not string values or stored map keys.                                                    |
| `nested_and_external_contract` | `GameState.regions[] ordering`                                                                                                                          | `regionCatalogOrder`            | RegionState contains no RegionId; reorder static region catalog/index mapping only with migration.                                                         |
| `nested_and_external_contract` | `GameState.absurd[] indices`                                                                                                                            | `absurdHeadlineIndices`         | Pool positions are persisted; do not reorder/remove ABSURD entries as part of naming.                                                                      |
| `nested_and_external_contract` | `GameState.evalRealOrder[] indices`                                                                                                                     | `auditIncidentIndices`          | Pool positions are persisted; do not reorder AUDIT_HISTORICAL_INCIDENT_POOL.                                                                               |
| `nested_and_external_contract` | `save storage key`                                                                                                                                      | `SAVE_STORAGE_KEY`              | Identifier KEY may be renamed, literal ai-ascendancy.v2 must stay unchanged despite current wire v=3.                                                      |
| `nested_and_external_contract` | `codex storage key`                                                                                                                                     | `CODEX_STORAGE_KEY`             | Literal ai-ascendancy.v2.codex and EndingId-keyed count record must stay unchanged.                                                                        |
| `nested_and_external_contract` | `RegionId / UpgradeId / EventId / ArchitectureId / DifficultyId / TrackId / ForkId / DirectiveId / EndingId / FlagId / TempId / Posture / BulletinKind` | `stableContentIds`              | All string ID values referenced in catalogs, union types, saves, queues, flags and codex remain byte-for-byte unchanged.                                   |
| `nested_and_external_contract` | `SoundCue / DOM selectors / CSS classes / player-facing text / encoded map / assets`                                                                    | `stablePresentationContract`    | Identifier-only refactor: preserve cue IDs, #selectors, CSS class names, headlines/descriptions, map data and audio/visual assets.                         |
