"use client"

import { useEffect, useRef } from "react"
import { io } from "socket.io-client"
import { MapPin } from "lucide-react"

const YANDEX_API_KEY = process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY || ""
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"

interface Courier {
  _id: string
  user_id?: { full_name?: string; phone?: string }
  current_lat?: number
  current_lng?: number
  status: string
  vehicle_type?: string
}

interface Props {
  couriers: Courier[]
  accessToken?: string
}

const STATUS_COLORS: Record<string, string> = {
  online: "#22c55e",
  busy: "#f59e0b",
}

export function CouriersMapWidget({ couriers, accessToken }: Props) {
  const mapRef = useRef<HTMLDivElement | null>(null)
  const mapInstanceRef = useRef<any>(null)
  // courier user_id → placemark
  const markersRef = useRef<Map<string, any>>(new Map())

  const withLocation = couriers.filter(c => c.current_lat && c.current_lng)

  const addMarker = (map: any, courier: Courier, userId: string) => {
    if (!courier.current_lat || !courier.current_lng) return
    const name = courier.user_id?.full_name || courier.user_id?.phone || "Kuryer"
    const shortName = name.split(" ")[0]
    const color = STATUS_COLORS[courier.status] || "#9ca3af"

    const LabelLayout = (window as any).ymaps.templateLayoutFactory.createClass(
      `<div style="
        position:relative;
        display:inline-flex;
        flex-direction:column;
        align-items:center;
        transform:translate(-50%, -100%);
        margin-top:-8px;
      ">
        <div style="
          background:#fff;
          border:2px solid ${color};
          border-radius:6px;
          padding:2px 8px;
          font-size:12px;
          font-weight:600;
          color:#111;
          white-space:nowrap;
          box-shadow:0 2px 6px rgba(0,0,0,0.15);
          margin-bottom:4px;
        ">${shortName}</div>
        <div style="
          width:12px;height:12px;
          background:${color};
          border:2px solid #fff;
          border-radius:50%;
          box-shadow:0 2px 4px rgba(0,0,0,0.3);
        "></div>
      </div>`
    )

    const pm = new (window as any).ymaps.Placemark(
      [courier.current_lat, courier.current_lng],
      { balloonContent: `<b>${name}</b><br/>${courier.vehicle_type || ""}` },
      {
        iconLayout: LabelLayout,
        iconShape: { type: "Rectangle", coordinates: [[-40, -44], [40, 0]] },
      },
    )
    map.geoObjects.add(pm)
    markersRef.current.set(userId, pm)
  }

  const setMapRef = (el: HTMLDivElement | null) => {
    mapRef.current = el
    if (!el || mapInstanceRef.current) return

    const doInit = () => {
      if (mapInstanceRef.current || !mapRef.current) return
      const center = withLocation.length > 0
        ? [withLocation[0].current_lat!, withLocation[0].current_lng!]
        : [41.311, 69.279]

      const map = new (window as any).ymaps.Map(mapRef.current, {
        center, zoom: 12, controls: ["zoomControl"],
      })
      mapInstanceRef.current = map

      withLocation.forEach(courier => {
        const uid = typeof courier.user_id === "object"
          ? (courier.user_id as any)?._id || courier._id
          : courier._id
        addMarker(map, courier, uid)
      })

      if (withLocation.length > 1) {
        map.setBounds(map.geoObjects.getBounds(), { checkZoomRange: true, zoomMargin: 40 })
      }
    }

    if ((window as any).ymaps?.ready) {
      ;(window as any).ymaps.ready(doInit)
    } else if (!document.getElementById("yandex-maps-script")) {
      const script = document.createElement("script")
      script.id = "yandex-maps-script"
      script.src = `https://api-maps.yandex.ru/2.1/?apikey=${YANDEX_API_KEY}&lang=uz_UZ`
      script.onload = () => (window as any).ymaps.ready(doInit)
      document.head.appendChild(script)
    } else {
      const t = setInterval(() => {
        if ((window as any).ymaps?.ready) { clearInterval(t); ;(window as any).ymaps.ready(doInit) }
      }, 100)
    }
  }

  // Real-time socket — location:updated eventi
  useEffect(() => {
    if (!accessToken) return
    const socket = io(`${API_URL}/courier-location`, {
      auth: { token: accessToken },
      transports: ["websocket"],
    })

    // Barcha kuryerlarni track qilamiz
    couriers.forEach(c => {
      const uid = typeof c.user_id === "object" ? (c.user_id as any)?._id || c._id : c._id
      socket.emit("location:subscribe", { courierId: uid })
    })

    socket.on("location:updated", (data: { courierId: string; lat: number; lng: number }) => {
      const marker = markersRef.current.get(data.courierId)
      if (marker) {
        marker.geometry.setCoordinates([data.lat, data.lng])
      } else if (mapInstanceRef.current) {
        // Yangi kuryer — marker qo'shish
        const courier = couriers.find(c => {
          const uid = typeof c.user_id === "object" ? (c.user_id as any)?._id || c._id : c._id
          return uid === data.courierId
        })
        if (courier) addMarker(mapInstanceRef.current, { ...courier, current_lat: data.lat, current_lng: data.lng }, data.courierId)
      }
    })

    return () => { socket.disconnect() }
  }, [accessToken]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => {
    mapInstanceRef.current?.destroy()
    mapInstanceRef.current = null
    markersRef.current.clear()
  }, [])

  return (
    <div className="rounded-xl border bg-background overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b">
        <h3 className="font-semibold flex items-center gap-2">
          <MapPin className="h-4 w-4 text-green-500" />
          Online kuryerlar
        </h3>
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-green-500 inline-block" />
            Onlayn: {couriers.filter(c => c.status === "online").length}
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-amber-500 inline-block" />
            Band: {couriers.filter(c => c.status === "busy").length}
          </span>
        </div>
      </div>

      {withLocation.length === 0 ? (
        <div style={{ height: 500 }} className="flex items-center justify-center text-sm text-muted-foreground">
          Online kuryerlar joylashuvi ma'lum emas
        </div>
      ) : (
        <div ref={setMapRef} style={{ height: 500 }} />
      )}
    </div>
  )
}
