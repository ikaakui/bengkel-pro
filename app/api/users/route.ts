import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
    try {
        // 1. Verify the requesting user is authenticated and has correct role
        const serverSupabase = createServerSupabaseClient();
        const {
            data: { session },
        } = await serverSupabase.auth.getSession();

        if (!session) {
            return NextResponse.json(
                { error: "Unauthorized. Silakan login terlebih dahulu." },
                { status: 401 }
            );
        }

        // Get current user's profile to check role
        const { data: currentProfile } = await serverSupabase
            .from("profiles")
            .select("role")
            .eq("id", session.user.id)
            .single();

        if (!currentProfile || !["owner", "admin"].includes(currentProfile.role)) {
            return NextResponse.json(
                { error: "Forbidden. Hanya Owner dan Admin yang bisa menambah user." },
                { status: 403 }
            );
        }

        // 2. Parse the request body
        const body = await request.json();
        const { email, password, full_name, phone, role, branch_id } = body;

        // Validate required fields
        if (!email || !password || !full_name || !role) {
            return NextResponse.json(
                { error: "Data tidak lengkap. Email, password, nama, dan role wajib diisi." },
                { status: 400 }
            );
        }

        // Owner can create admin, spv, and staff
        if (currentProfile.role === "owner" && !["admin", "spv", "mitra"].includes(role)) {
            return NextResponse.json(
                { error: "Role tidak valid. Pilih role yang tersedia." },
                { status: 400 }
            );
        }

        // Admin can only create staff/spv
        if (currentProfile.role === "admin" && !["spv", "mitra"].includes(role)) {
            return NextResponse.json(
                { error: "Admin hanya bisa menambahkan Staff/Supervisor." },
                { status: 403 }
            );
        }

        // Admin (the role created) must have a branch
        if (role === "admin" && !branch_id) {
            return NextResponse.json(
                { error: "Admin harus memiliki cabang. Pilih cabang terlebih dahulu." },
                { status: 400 }
            );
        }

        // 3. Create user using Supabase Admin API (service role)
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false,
                },
            }
        );

        // Generate referral code for staff
        const referralCode =
            role === "mitra"
                ? (() => {
                    const prefix = full_name
                        .split(" ")
                        .map((n: string) => n[0])
                        .join("")
                        .toUpperCase()
                        .slice(0, 3);
                    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
                    return `${prefix}-${random}`;
                })()
                : null;

        const { data: newUser, error: createError } =
            await supabaseAdmin.auth.admin.createUser({
                email,
                password,
                email_confirm: true, // Auto-confirm so they can login immediately
                user_metadata: {
                    full_name,
                    role,
                    phone: phone || null,
                    referral_code: referralCode,
                    branch_id: branch_id || null,
                },
            });

        if (createError) {
            // Handle duplicate email
            if (createError.message.includes("already been registered") || createError.message.includes("already exists")) {
                return NextResponse.json(
                    { error: "Email sudah terdaftar. Gunakan email lain." },
                    { status: 409 }
                );
            }
            return NextResponse.json(
                { error: createError.message },
                { status: 400 }
            );
        }

        return NextResponse.json({
            success: true,
            message: `User "${full_name}" berhasil ditambahkan sebagai ${role}!`,
            user: {
                id: newUser.user.id,
                email: newUser.user.email,
                full_name,
                role,
                referral_code: referralCode,
            },
        });
    } catch (error: any) {
        console.error("Error creating user:", error);
        return NextResponse.json(
            { error: "Terjadi kesalahan server. Silakan coba lagi." },
            { status: 500 }
        );
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const serverSupabase = createServerSupabaseClient();
        const {
            data: { session },
        } = await serverSupabase.auth.getSession();

        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { data: currentProfile } = await serverSupabase
            .from("profiles")
            .select("role")
            .eq("id", session.user.id)
            .single();

        if (!currentProfile || !["owner", "admin"].includes(currentProfile.role)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const body = await request.json();
        const { userId, newPassword } = body;

        if (!userId || !newPassword) {
            return NextResponse.json({ error: "Data tidak lengkap" }, { status: 400 });
        }

        // Get target user profile to check role
        const { data: targetProfile } = await serverSupabase
            .from("profiles")
            .select("role, full_name")
            .eq("id", userId)
            .single();

        if (!targetProfile) {
            return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });
        }

        // Admin can only change password for staff
        if (currentProfile.role === "admin" && targetProfile.role !== "mitra") {
            return NextResponse.json({ error: "Admin hanya bisa merubah password Staff" }, { status: 403 });
        }

        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            { auth: { autoRefreshToken: false, persistSession: false } }
        );

        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
            userId,
            { password: newPassword }
        );

        if (updateError) {
            return NextResponse.json({ error: updateError.message }, { status: 400 });
        }

        return NextResponse.json({
            success: true,
            message: `Password untuk "${targetProfile.full_name}" berhasil diperbarui.`,
        });
    } catch (error: any) {
        console.error("Error updating password:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const serverSupabase = createServerSupabaseClient();
        const {
            data: { session },
        } = await serverSupabase.auth.getSession();

        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { data: currentProfile } = await serverSupabase
            .from("profiles")
            .select("role")
            .eq("id", session.user.id)
            .single();

        if (!currentProfile || !["owner", "admin"].includes(currentProfile.role)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const userId = searchParams.get("userId");

        if (!userId) {
            return NextResponse.json({ error: "User ID wajib diisi" }, { status: 400 });
        }

        // Get target user profile to check role
        const { data: targetProfile } = await serverSupabase
            .from("profiles")
            .select("role, full_name")
            .eq("id", userId)
            .single();

        if (!targetProfile) {
            return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });
        }

        // Admin can only delete staff
        if (currentProfile.role === "admin" && targetProfile.role !== "mitra") {
            return NextResponse.json({ error: "Admin hanya bisa menghapus data Staff" }, { status: 403 });
        }

        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            { auth: { autoRefreshToken: false, persistSession: false } }
        );

        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

        if (deleteError) {
            return NextResponse.json({ error: deleteError.message }, { status: 400 });
        }

        return NextResponse.json({
            success: true,
            message: `Data Staff "${targetProfile.full_name}" berhasil dihapus.`,
        });
    } catch (error: any) {
        console.error("Error deleting user:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
