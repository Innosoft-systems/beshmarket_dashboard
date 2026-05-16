"use client"

export default function RestaurantError({ error }: { error: Error }) {
  const is429 = error.message?.includes("Too Many") || error.message?.includes("429")
  const isNotFound = error.message?.includes("topilmadi") || error.message?.includes("404")

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <p className="text-5xl font-bold text-muted-foreground/20 mb-4">
        {is429 ? "429" : isNotFound ? "404" : "⚠️"}
      </p>
      <h2 className="text-xl font-semibold">
        {is429 ? "Juda ko'p so'rov" : isNotFound ? "Restoran topilmadi" : "Xatolik yuz berdi"}
      </h2>
      <p className="mt-2 text-sm text-muted-foreground max-w-sm">
        {is429
          ? "Bir zumdan keyin qayta urinib ko'ring."
          : isNotFound
          ? "Akkauntingizga restoran biriktirilmagan. Admin bilan bog'laning."
          : error.message}
      </p>
      {is429 && (
        <button
          onClick={() => window.location.reload()}
          className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Qayta yuklash
        </button>
      )}
    </div>
  )
}
