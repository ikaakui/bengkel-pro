import { createServerSupabaseClient } from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
    try {
        const supabase = createServerSupabaseClient();
        const {
            data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { data, error } = await supabase
            .from("branches")
            .select("*")
            .order("created_at", { ascending: true });

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        return NextResponse.json({ branches: data });
    } catch (error) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const supabase = createServerSupabaseClient();
        const {
            data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Check if user is owner
        const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", session.user.id)
            .single();

        if (!profile || profile.role !== "owner") {
            return NextResponse.json({ error: "Hanya Owner yang bisa menambah cabang." }, { status: 403 });
        }

        const body = await request.json();
        const { name, address, phone } = body;

        if (!name) {
            return NextResponse.json({ error: "Nama cabang wajib diisi." }, { status: 400 });
        }

        const { data, error } = await supabase
            .from("branches")
            .insert({ name, address, phone })
            .select()
            .single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        return NextResponse.json({
            success: true,
            message: `Cabang "${name}" berhasil ditambahkan!`,
            branch: data,
        });
    } catch (error) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const supabase = createServerSupabaseClient();
        const {
            data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", session.user.id)
            .single();

        if (!profile || profile.role !== "owner") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const body = await request.json();
        const { id, name, address, phone } = body;

        if (!id || !name) {
            return NextResponse.json({ error: "Data tidak lengkap." }, { status: 400 });
        }

        const { data, error } = await supabase
            .from("branches")
            .update({ name, address, phone, updated_at: new Date().toISOString() })
            .eq("id", id)
            .select()
            .single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        return NextResponse.json({
            success: true,
            message: `Cabang "${name}" berhasil diperbarui!`,
            branch: data,
        });
    } catch (error) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const supabase = createServerSupabaseClient();
        const {
            data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", session.user.id)
            .single();

        if (!profile || profile.role !== "owner") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const branchId = searchParams.get("id");

        if (!branchId) {
            return NextResponse.json({ error: "Branch ID wajib diisi." }, { status: 400 });
        }

        // Check if any users are still assigned to this branch
        const { data: assignedUsers } = await supabase
            .from("profiles")
            .select("id")
            .eq("branch_id", branchId);

        if (assignedUsers && assignedUsers.length > 0) {
            return NextResponse.json({
                error: `Cabang masih memiliki ${assignedUsers.length} user. Pindahkan user terlebih dahulu.`,
            }, { status: 400 });
        }

        const { error } = await supabase
            .from("branches")
            .delete()
            .eq("id", branchId);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        return NextResponse.json({
            success: true,
            message: "Cabang berhasil dihapus.",
        });
    } catch (error) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
