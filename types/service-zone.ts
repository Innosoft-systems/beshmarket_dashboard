export type ZoneType = "polygon" | "circle"

export interface ServiceZone {
  _id: string
  name: string
  type: ZoneType
  coordinates: number[][]
  radius?: number
  is_active: boolean
  createdAt?: string
}
