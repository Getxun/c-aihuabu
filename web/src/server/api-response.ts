import { NextResponse } from "next/server";

export function ok<T>(data: T) {
    return NextResponse.json({ code: 0, data, msg: "ok" });
}

export function fail(msg: string, status = 400) {
    return NextResponse.json({ code: status, data: null, msg }, { status });
}

