export interface WorkingHours {
  _id?: string
  restaurant_id?: string
  day_of_week: number
  open_time: string
  close_time: string
  is_closed: boolean
}
