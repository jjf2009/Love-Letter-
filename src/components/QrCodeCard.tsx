"use client";

import { QRCodeSVG } from "qrcode.react";

export function QrCodeCard(props: { value: string }) {
  return (
    <div className="rounded-3xl bg-white/70 p-6 shadow-sm ring-1 ring-black/5">
      <div className="text-sm font-semibold text-slate-900">QR code</div>
      <div className="mt-4 flex items-center justify-center rounded-2xl bg-white p-4 ring-1 ring-black/5">
        <QRCodeSVG value={props.value} size={220} includeMargin />
      </div>
      <p className="mt-4 text-xs leading-5 text-slate-600">
        Anyone who scans this code can open the letter.
      </p>
    </div>
  );
}
