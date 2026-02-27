"use client";

import dynamic from "next/dynamic";

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

const StoresMap = dynamic(() => import("./StoresMap"), { ssr: false });

export default function StoresMapClient({ stores }: { stores: Store[] }) {
  return <StoresMap stores={stores} />;
}
