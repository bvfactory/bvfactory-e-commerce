import { NextRequest, NextResponse } from "next/server";
import { validateAdminRequest } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { purgeThread } from "@/lib/contact-trash";

export async function POST(request: NextRequest) {
    if (!(await validateAdminRequest(request))) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createAdminClient();
    const { data: trashed } = await supabase
        .from("contact_threads")
        .select("id")
        .not("deleted_at", "is", null)
        .limit(1000);

    let purged = 0;
    for (const t of trashed ?? []) {
        try {
            await purgeThread(supabase, t.id);
            purged++;
        } catch {
            // purgeThread already logs; continue with the rest.
        }
    }
    return NextResponse.json({ ok: true, purged });
}
