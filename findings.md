# Findings

- Current task has five reported issues:
  - Mobile feedback attachments are not visible in web admin detail.
  - Feedback status should only expose two terminal choices.
  - Purchase/sale entry should allow creating suppliers/customers first.
  - First sale entry sometimes shows no customers until re-entering.
  - Entry home auxiliary actions collapse into a line after entering and exiting scanner.
- Feedback upload/detail fields are aligned: mobile submits `imageUrls`, web detail reads `detailItem.imageUrls`, backend TOs and entity persist `imageUrls`.
- Backend feedback statuses are currently five enum values (`NEW`, `CONFIRMED`, `IN_PROGRESS`, `RESOLVED`, `CLOSED`). The available command actions include `resolve` and `close`, so the web UI can expose only two decisions without a schema/database change.
- Partner selector currently only searches/selects existing partners. There is no create entry from purchase/sale screens.
- Purchase/sale selection data is loaded only once on mount. Refetching on focus will refresh after creating a partner and should also address the "first sale entry has no customers until re-entering" symptom.
- Entry home secondary actions put `flex-1` on the inner Card through `AnimatedCard`, while the row child is the outer `MotiView`; this can collapse row width after scanner navigation/reanimation.
