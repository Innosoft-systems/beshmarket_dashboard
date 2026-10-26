import { kitchenStateOf } from "./order-wording"

describe("kitchenStateOf", () => {
  it("keeps an unconfirmed order out of the kitchen", () => {
    expect(kitchenStateOf({ status: "pending", kitchen_status: "pending" })).toBe("pending")
    expect(kitchenStateOf({ status: "pending" })).toBe("pending")
  })

  it("treats an accepted order with a stale pending kitchen as preparing", () => {
    expect(kitchenStateOf({ status: "on_the_way_to_restaurant", kitchen_status: "pending" })).toBe("preparing")
    expect(kitchenStateOf({ status: "accepted" })).toBe("preparing")
  })

  it("trusts an explicit kitchen status", () => {
    expect(kitchenStateOf({ status: "accepted", kitchen_status: "preparing" })).toBe("preparing")
    expect(kitchenStateOf({ status: "arrived_at_restaurant", kitchen_status: "ready" })).toBe("ready")
  })
})
