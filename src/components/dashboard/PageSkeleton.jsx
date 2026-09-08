import { Panel } from "../ui/Panel.jsx";
import { Skeleton, SkeletonText } from "../ui/Skeleton.jsx";

/**
 * The placeholder shown while the dashboard's initial six-query load is in
 * flight, before any page has data.
 *
 * One shape stands in for every data tab rather than a bespoke skeleton per
 * page: the goal is only to hold the layout — a stat row over a wide panel —
 * so the shell doesn't flash an empty state ("No members ranked yet") and then
 * snap to real content a moment later. `SkeletonRegion` in the caller owns the
 * aria-busy / live-region announcement; this is the purely visual fallback.
 */
export function PageSkeleton() {
  return (
    <div className="space-y-5" data-testid="page-skeleton">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="nx-card px-4 py-3.5">
            <div className="flex items-start justify-between gap-3">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-7 w-7" rounded="card" />
            </div>
            <Skeleton className="mt-2.5 h-8 w-20" />
            <Skeleton className="mt-2 h-3 w-24" />
          </div>
        ))}
      </div>

      <Panel pad="md">
        <div className="space-y-4">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-9 w-9 shrink-0" rounded="full" />
              <div className="min-w-0 flex-1">
                <Skeleton className="h-3.5 w-2/5" />
                <Skeleton className="mt-2 h-2.5 w-full" />
              </div>
              <Skeleton className="h-4 w-10 shrink-0" />
            </div>
          ))}
        </div>
      </Panel>

      <Panel pad="md">
        <SkeletonText lines={3} />
      </Panel>
    </div>
  );
}

export default PageSkeleton;
