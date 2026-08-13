export default function TabletOrdersLoading() {
  return (
    <div className="grid h-[calc(100dvh-7rem)] min-h-160 animate-pulse overflow-hidden rounded-3xl bg-white lg:grid-cols-[minmax(19rem,35%)_1fr]">
      <div className="space-y-4 bg-[#f5f6f4] p-5">
        <div className="h-9 w-44 rounded-lg bg-black/8" />
        <div className="h-13 rounded-xl bg-black/6" />
        {[1, 2, 3, 4].map((item) => (
          <div key={item} className="h-24 rounded-2xl bg-white" />
        ))}
      </div>
      <div className="space-y-6 p-7">
        <div className="h-20 rounded-2xl bg-black/5" />
        <div className="h-40 rounded-2xl bg-black/5" />
        <div className="h-64 rounded-2xl bg-black/5" />
      </div>
    </div>
  )
}
