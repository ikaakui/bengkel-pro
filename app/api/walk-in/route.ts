import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const {
            customer_name,
            customer_phone,
            car_model,
            license_plate,
            service_date,
            service_time,
            branch_id,
            member_id,
            booking_type,
            status,
            isConfirmed
        } = body;

        // 1. Verify Authentication using standard SSR client
        const cookieStore = cookies();
        const supabaseAuth = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    get(name: string) {
                        return cookieStore.get(name)?.value;
                    },
                },
            }
        );

        const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Verify role
        const role = user.user_metadata?.role;
        if (!['admin', 'admin_depok', 'admin_bsd', 'owner', 'spv'].includes(role)) {
            return NextResponse.json({ error: "Forbidden: Insufficient permissions" }, { status: 403 });
        }

        // 2. Perform Database Operations bypassing RLS using Service Role Key
        // This is necessary because RLS policies might not be fully configured for all branch admin roles
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            { auth: { persistSession: false } }
        );

        // Check for duplicates if not explicitly confirmed
        if (!isConfirmed) {
            const { data: existing, error: checkError } = await supabaseAdmin
                .from("bookings")
                .select("id, customer_name, car_model")
                .eq("license_plate", license_plate)
                .eq("service_date", service_date)
                .in("status", ["pending", "processing"])
                .maybeSingle();

            if (checkError) {
                console.error("Duplicate check error:", checkError);
                throw checkError;
            }

            if (existing) {
                return NextResponse.json({ duplicate: true, existing }, { status: 200 });
            }
        }

        // Insert booking
        const { data: booking, error: bookingError } = await supabaseAdmin
            .from("bookings")
            .insert({
                customer_name,
                customer_phone,
                car_model,
                license_plate,
                service_date,
                service_time,
                branch_id,
                member_id,
                booking_type,
                status,
            })
            .select()
            .single();

        if (bookingError) {
            console.error("Booking insert error:", bookingError);
            return NextResponse.json({ error: "Gagal membuat booking: " + bookingError.message }, { status: 500 });
        }

        // Insert draft transaction
        const { error: txnError } = await supabaseAdmin
            .from("transactions")
            .insert({
                customer_name,
                total_amount: 0,
                branch_id,
                payment_method: "Cash",
                status: "Draft",
                booking_id: booking.id
            });

        if (txnError) {
            console.error("Transaction insert error:", txnError);
            // Even if transaction fails, booking was created. We should still inform the user.
            return NextResponse.json({ error: "Booking berhasil tapi gagal membuat draft transaksi: " + txnError.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, bookingId: booking.id }, { status: 200 });

    } catch (error: any) {
        console.error("Walk-in API error:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
