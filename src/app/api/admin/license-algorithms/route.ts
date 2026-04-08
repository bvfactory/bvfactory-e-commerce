import { NextRequest, NextResponse } from "next/server";
import { validateAdminRequest } from "@/lib/admin-auth";
import { listAlgorithms } from "@/lib/license";

export async function GET(request: NextRequest) {
    if (!(await validateAdminRequest(request))) {
        return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    return NextResponse.json({ algorithms: listAlgorithms() });
}
