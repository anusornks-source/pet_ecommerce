"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default leaflet marker icons broken by webpack
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface Store {
  id: string;
  name: string;
  address: string;
  phone: string;
  openHours: string;
  image: string | null;
  remark: string | null;
  lat: number;
  lng: number;
}

// Helper: fly to selected store on the map
function MapFly({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, 15, { duration: 1 });
  }, [center, map]);
  return null;
}

export default function StoresMap({ stores }: { stores: Store[] }) {
  const [selected, setSelected] = useState<Store | null>(null);
  const [flyTo, setFlyTo] = useState<[number, number] | null>(null);

  const defaultCenter: [number, number] =
    stores.length > 0 ? [stores[0].lat, stores[0].lng] : [13.7563, 100.5018];

  const handleSelect = (store: Store) => {
    setSelected(store);
    setFlyTo([store.lat, store.lng]);
  };

  const isValidUrl = (url: string | null) => {
    if (!url) return false;
    try { new URL(url); return true; } catch { return false; }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6" style={{ height: "100%" }}>
      {/* Store list */}
      <div className="lg:w-80 shrink-0 overflow-y-auto space-y-3 pr-1">
        {stores.map((store) => (
          <button
            key={store.id}
            onClick={() => handleSelect(store)}
            className={`w-full text-left rounded-2xl border-2 p-4 transition-all ${
              selected?.id === store.id
                ? "border-orange-400 bg-orange-50"
                : "border-stone-100 bg-white hover:border-orange-200 hover:bg-orange-50/50"
            }`}
          >
            {isValidUrl(store.image) && (
              <div className="relative w-full h-32 rounded-xl overflow-hidden mb-3">
                <Image src={store.image!} alt={store.name} fill className="object-cover" sizes="320px" />
              </div>
            )}
            <div className="flex items-start gap-2">
              <span className="text-orange-500 mt-0.5 shrink-0">📍</span>
              <div className="min-w-0">
                <p className="font-semibold text-stone-800 text-sm">{store.name}</p>
                <p className="text-xs text-stone-500 mt-0.5 line-clamp-2">{store.address}</p>
                <p className="text-xs text-stone-500 mt-1">📞 {store.phone}</p>
                <p className="text-xs text-stone-400 mt-0.5">🕐 {store.openHours}</p>
                {store.remark && (
                  <p className="text-xs text-orange-500 mt-1 italic">{store.remark}</p>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Map */}
      <div className="flex-1 rounded-2xl overflow-hidden border border-stone-100 min-h-64">
        <MapContainer
          center={defaultCenter}
          zoom={13}
          style={{ width: "100%", height: "100%" }}
          scrollWheelZoom
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {flyTo && <MapFly center={flyTo} />}

          {stores.map((store) => (
            <Marker
              key={store.id}
              position={[store.lat, store.lng]}
              eventHandlers={{ click: () => handleSelect(store) }}
            >
              <Popup>
                <div className="min-w-36">
                  <p className="font-semibold text-stone-800 text-sm">{store.name}</p>
                  <p className="text-xs text-stone-500 mt-1">{store.address}</p>
                  <p className="text-xs text-stone-500 mt-0.5">📞 {store.phone}</p>
                  <p className="text-xs text-stone-400 mt-0.5">🕐 {store.openHours}</p>
                  {store.remark && (
                    <p className="text-xs text-orange-500 mt-0.5 italic">{store.remark}</p>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
