/**
 * A shop picks goods off a shelf; a kitchen cooks. The order lifecycle is
 * identical, only the words change — keep them in one place so the table and the
 * detail page cannot drift apart.
 */
export type VenueType = "restaurant" | "market" | undefined

export const venueTypeOf = (restaurant: unknown): VenueType => {
  if (!restaurant || typeof restaurant !== "object") return undefined
  return (restaurant as { type?: VenueType }).type
}

export const isMarket = (venueType: VenueType) => venueType === "market"

export type KitchenState = "pending" | "preparing" | "ready"

/**
 * Where the food is, for display. Accepting an order is what puts it in the
 * kitchen, so once the order has left "pending" a kitchen_status that is still
 * "pending" (or missing) reads as preparing — otherwise the list said
 * "Tayyorlanmoqda" while the detail page said "Oshxonaga tushmagan".
 */
export const kitchenStateOf = (order: { status: string; kitchen_status?: string }): KitchenState => {
  if (order.kitchen_status === "ready") return "ready"
  if (order.kitchen_status === "preparing") return "preparing"
  return order.status === "pending" ? "pending" : "preparing"
}

export const kitchenWording = (venueType: VenueType) =>
  isMarket(venueType)
    ? {
        readyAction: "Yig'ildi",
        readyToast: "Mahsulotlar yig'ildi deb belgilandi",
        preparingBadge: "Yig'ilmoqda",
        readyBadge: "Mahsulotlar yig'ildi",
        idleBadge: "Yig'ishga tushmagan",
      }
    : {
        readyAction: "Tayyor",
        readyToast: "Ovqat tayyor deb belgilandi",
        preparingBadge: "Tayyorlanmoqda",
        readyBadge: "Ovqat tayyor",
        idleBadge: "Oshxonaga tushmagan",
      }
