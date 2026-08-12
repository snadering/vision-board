import { BoardSkeleton } from "@/components/BoardSkeleton";

export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-7xl grow px-4 pt-4 pb-24 sm:px-8">
      <div className="flex flex-wrap items-center gap-3 pt-4 pb-8 sm:pt-6">
        <div className="h-8 w-44 rounded-lg bg-white/[0.05]" />
        <div className="h-10 w-52 rounded-full bg-white/[0.04] sm:ml-3" />
      </div>
      <BoardSkeleton />
    </div>
  );
}
