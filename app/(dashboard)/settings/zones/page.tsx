"use client"

import { useEffect, useRef, useState } from "react"
import { MapPin, Trash2, Pencil, Circle, Pentagon } from "lucide-react"
import { toast } from "sonner"
import {
  getServiceZonesAction,
  createServiceZoneAction,
  updateServiceZoneAction,
  deleteServiceZoneAction,
} from "@/lib/actions/service-zones"
import type { ServiceZone, ZoneType } from "@/types/service-zone"

const YANDEX_API_KEY = process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY || ""

type DrawMode = "idle" | "polygon" | "circle"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type YmapsInstance = any

export default function ZonesPage() {
  const [zones, setZones] = useState<ServiceZone[]>([])
  const [loading, setLoading] = useState(true)
  const [drawMode, setDrawMode] = useState<DrawMode>("idle")
  const [editingZone, setEditingZone] = useState<ServiceZone | null>(null)
  const [nameInput, setNameInput] = useState("")
  const [saving, setSaving] = useState(false)

  const mapRef = useRef<HTMLDivElement | null>(null)
  const mapInstanceRef = useRef<YmapsInstance>(null)
  const drawnObjectRef = useRef<YmapsInstance>(null)
  const zoneObjectsRef = useRef<Map<string, YmapsInstance>>(new Map())
  const zonesRef = useRef<ServiceZone[]>([])

  useEffect(() => {
    zonesRef.current = zones
  }, [zones])

  useEffect(() => {
    getServiceZonesAction().then(res => {
      if (res.success) setZones(res.data)
      setLoading(false)
    })
  }, [])

  const renderZonesOnMap = (map: YmapsInstance, zonesList: ServiceZone[]) => {
    zoneObjectsRef.current.forEach(obj => map.geoObjects.remove(obj))
    zoneObjectsRef.current.clear()

    zonesList.forEach(zone => {
      let geoObj: YmapsInstance
      const ymaps = (window as Window & { ymaps: YmapsInstance }).ymaps
      if (zone.type === "polygon") {
        const coords = zone.coordinates.map(c => [c[0], c[1]])
        geoObj = new ymaps.Polygon(
          [coords],
          { hintContent: zone.name },
          {
            fillColor: zone.is_active ? "#10b98133" : "#ef444433",
            strokeColor: zone.is_active ? "#10b981" : "#ef4444",
            strokeWidth: 2,
            opacity: 0.7,
          }
        )
      } else {
        const center = zone.coordinates[0]
        geoObj = new ymaps.Circle(
          [[center[0], center[1]], zone.radius || 5000],
          { hintContent: zone.name },
          {
            fillColor: zone.is_active ? "#10b98133" : "#ef444433",
            strokeColor: zone.is_active ? "#10b981" : "#ef4444",
            strokeWidth: 2,
            opacity: 0.7,
          }
        )
      }
      map.geoObjects.add(geoObj)
      zoneObjectsRef.current.set(zone._id, geoObj)
    })
  }

  // Re-render zones when they change
  useEffect(() => {
    if (mapInstanceRef.current) renderZonesOnMap(mapInstanceRef.current, zones)
  }, [zones])

  const initMap = (el: HTMLDivElement | null) => {
    mapRef.current = el
    if (!el || mapInstanceRef.current) return

    const doInit = () => {
      if (mapInstanceRef.current || !mapRef.current) return
      const ymaps = (window as Window & { ymaps: YmapsInstance }).ymaps
      const map = new ymaps.Map(mapRef.current, {
        center: [41.311, 69.279],
        zoom: 11,
        controls: ["zoomControl"],
      })
      mapInstanceRef.current = map
      renderZonesOnMap(map, zonesRef.current)
    }

    const win = window as Window & { ymaps?: YmapsInstance }
    if (win.ymaps?.ready) {
      win.ymaps.ready(doInit)
    } else if (!document.getElementById("yandex-maps-script")) {
      const script = document.createElement("script")
      script.id = "yandex-maps-script"
      script.src = `https://api-maps.yandex.ru/2.1/?apikey=${YANDEX_API_KEY}&lang=uz_UZ`
      script.onload = () => (window as Window & { ymaps: YmapsInstance }).ymaps.ready(doInit)
      document.head.appendChild(script)
    } else {
      const t = setInterval(() => {
        if ((window as Window & { ymaps?: YmapsInstance }).ymaps?.ready) {
          clearInterval(t)
          ;(window as Window & { ymaps: YmapsInstance }).ymaps.ready(doInit)
        }
      }, 100)
    }
  }

  const startDraw = (mode: DrawMode) => {
    const map = mapInstanceRef.current
    if (!map) return
    const ymaps = (window as Window & { ymaps: YmapsInstance }).ymaps

    if (drawnObjectRef.current) {
      map.geoObjects.remove(drawnObjectRef.current)
      drawnObjectRef.current = null
    }

    setDrawMode(mode)
    setNameInput(editingZone?.name || "")

    if (mode === "polygon") {
      const polygon = new ymaps.Polygon(
        [[]],
        {},
        {
          editorDrawingCursor: "crosshair",
          fillColor: "#3b82f633",
          strokeColor: "#3b82f6",
          strokeWidth: 3,
        }
      )
      map.geoObjects.add(polygon)
      polygon.editor.startDrawing()
      drawnObjectRef.current = polygon
    } else if (mode === "circle") {
      const circle = new ymaps.Circle(
        [map.getCenter(), 3000],
        {},
        {
          draggable: true,
          fillColor: "#3b82f633",
          strokeColor: "#3b82f6",
          strokeWidth: 3,
        }
      )
      map.geoObjects.add(circle)
      circle.editor.startEditing()
      drawnObjectRef.current = circle
    }
  }

  const cancelDraw = () => {
    const map = mapInstanceRef.current
    if (drawnObjectRef.current && map) {
      if (drawnObjectRef.current.editor) drawnObjectRef.current.editor.stopEditing()
      map.geoObjects.remove(drawnObjectRef.current)
      drawnObjectRef.current = null
    }
    setDrawMode("idle")
    setEditingZone(null)
    setNameInput("")
  }

  const fetchZones = async () => {
    const res = await getServiceZonesAction()
    if (res.success) setZones(res.data)
  }

  const saveZone = async () => {
    if (!nameInput.trim()) {
      toast.error("Zona nomini kiriting")
      return
    }

    const obj = drawnObjectRef.current
    if (!obj) return

    setSaving(true)

    try {
      let data: { name: string; type: ZoneType; coordinates: number[][]; radius?: number; is_active: boolean }

      if (drawMode === "polygon") {
        obj.editor.stopDrawing()
        const coords = obj.geometry.getCoordinates()[0] as number[][]
        if (!coords || coords.length < 3) {
          toast.error("Kamida 3 ta nuqta belgilang")
          setSaving(false)
          return
        }
        data = {
          name: nameInput.trim(),
          type: "polygon",
          coordinates: coords.map((c: number[]) => [c[0], c[1]]),
          is_active: true,
        }
      } else {
        obj.editor.stopEditing()
        const center = obj.geometry.getCoordinates() as number[]
        const radius = obj.geometry.getRadius() as number
        data = {
          name: nameInput.trim(),
          type: "circle",
          coordinates: [[center[0], center[1]]],
          radius: Math.round(radius),
          is_active: true,
        }
      }

      const res = editingZone
        ? await updateServiceZoneAction(editingZone._id, data)
        : await createServiceZoneAction(data)

      if (res.success) {
        toast.success(editingZone ? "Zona yangilandi" : "Zona yaratildi")
        cancelDraw()
        fetchZones()
      } else {
        toast.error(res.error || "Xatolik yuz berdi")
      }
    } finally {
      setSaving(false)
    }
  }

  const deleteZone = async (id: string) => {
    if (!confirm("Zonani o\u2018chirishni tasdiqlaysizmi?")) return
    const res = await deleteServiceZoneAction(id)
    if (res.success) {
      toast.success("Zona o\u2018chirildi")
      fetchZones()
    } else {
      toast.error(res.error || "Xatolik yuz berdi")
    }
  }

  const toggleZone = async (zone: ServiceZone) => {
    const res = await updateServiceZoneAction(zone._id, { is_active: !zone.is_active })
    if (res.success) {
      toast.success(zone.is_active ? "Zona o\u2018chirildi" : "Zona faollashtirildi")
      fetchZones()
    }
  }

  const editZone = (zone: ServiceZone) => {
    setEditingZone(zone)
    setNameInput(zone.name)

    const map = mapInstanceRef.current
    if (!map) return
    const ymaps = (window as Window & { ymaps: YmapsInstance }).ymaps

    if (drawnObjectRef.current) {
      map.geoObjects.remove(drawnObjectRef.current)
      drawnObjectRef.current = null
    }

    const existing = zoneObjectsRef.current.get(zone._id)
    if (existing) map.geoObjects.remove(existing)

    if (zone.type === "polygon") {
      const coords = zone.coordinates.map(c => [c[0], c[1]])
      const polygon = new ymaps.Polygon(
        [coords],
        {},
        {
          editorDrawingCursor: "crosshair",
          fillColor: "#3b82f633",
          strokeColor: "#3b82f6",
          strokeWidth: 3,
        }
      )
      map.geoObjects.add(polygon)
      polygon.editor.startEditing()
      drawnObjectRef.current = polygon
      setDrawMode("polygon")
    } else {
      const center = zone.coordinates[0]
      const circle = new ymaps.Circle(
        [[center[0], center[1]], zone.radius || 5000],
        {},
        {
          draggable: true,
          fillColor: "#3b82f633",
          strokeColor: "#3b82f6",
          strokeWidth: 3,
        }
      )
      map.geoObjects.add(circle)
      circle.editor.startEditing()
      drawnObjectRef.current = circle
      setDrawMode("circle")
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <MapPin className="h-6 w-6" />
          Xizmat zonalari
        </h1>
        {drawMode === "idle" && (
          <div className="flex gap-2">
            <button
              onClick={() => startDraw("polygon")}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Pentagon className="h-4 w-4" />
              Polygon chizish
            </button>
            <button
              onClick={() => startDraw("circle")}
              className="inline-flex items-center gap-2 rounded-lg bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary/80"
            >
              <Circle className="h-4 w-4" />
              Doira qo&#39;shish
            </button>
          </div>
        )}
      </div>

      {/* Drawing toolbar */}
      {drawMode !== "idle" && (
        <div className="flex items-center gap-3 rounded-lg border bg-blue-50 p-4">
          <input
            type="text"
            placeholder="Zona nomi (masalan: Toshkent shahri)"
            value={nameInput}
            onChange={e => setNameInput(e.target.value)}
            className="flex-1 rounded-md border px-3 py-2 text-sm"
          />
          <button
            onClick={saveZone}
            disabled={saving}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? "Saqlanmoqda..." : editingZone ? "Yangilash" : "Saqlash"}
          </button>
          <button
            onClick={cancelDraw}
            className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            Bekor qilish
          </button>
        </div>
      )}

      {/* Map */}
      <div ref={initMap} className="h-125 w-full rounded-xl border overflow-hidden" />

      {/* Zones list */}
      <div className="rounded-xl border bg-background">
        <div className="border-b px-5 py-4">
          <h3 className="font-semibold">Zonalar ro&#39;yxati</h3>
        </div>
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Yuklanmoqda...</div>
        ) : zones.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            Hali zona qo&#39;shilmagan. Yuqoridagi tugmalar orqali yangi zona chizing.
          </div>
        ) : (
          <div className="divide-y">
            {zones.map(zone => (
              <div key={zone._id} className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-3">
                  <div className={`h-3 w-3 rounded-full ${zone.is_active ? "bg-green-500" : "bg-red-400"}`} />
                  <div>
                    <p className="font-medium">{zone.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {zone.type === "polygon"
                        ? `Polygon (${zone.coordinates.length} nuqta)`
                        : `Doira (${((zone.radius || 0) / 1000).toFixed(1)} km radius)`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleZone(zone)}
                    className={`rounded-md px-3 py-1 text-xs font-medium ${
                      zone.is_active
                        ? "bg-green-100 text-green-700 hover:bg-green-200"
                        : "bg-red-100 text-red-700 hover:bg-red-200"
                    }`}
                  >
                    {zone.is_active ? "Faol" : "Nofaol"}
                  </button>
                  <button
                    onClick={() => editZone(zone)}
                    className="rounded-md p-2 hover:bg-muted"
                    title="Tahrirlash"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => deleteZone(zone._id)}
                    className="rounded-md p-2 text-red-500 hover:bg-red-50"
                    title="O&#39;chirish"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
