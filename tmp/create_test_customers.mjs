import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://bugycrgmbhiuzagzfkio.supabase.co";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ1Z3ljcmdtYmhpdXphZ3pma2lvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjI5MTU2NSwiZXhwIjoyMDg3ODY3NTY1fQ.YW0_rkEhNEuSW9fMNmLdou6bGK6mqvyQgL7UFarbY4I";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
    console.log("=== Membuat 4 Test Customer Bookings ===\n");

    // 1. Ambil daftar branches
    const { data: branches, error: brErr } = await supabase
        .from("branches")
        .select("id, name")
        .limit(5);

    if (brErr) {
        console.error("Error fetch branches:", brErr.message);
        return;
    }
    console.log("Branches yang tersedia:");
    branches.forEach(b => console.log(`  - ${b.name} (${b.id})`));

    if (branches.length === 0) {
        console.error("Tidak ada branch! Buat branch dulu.");
        return;
    }

    const defaultBranch = branches[0];
    console.log(`\nMenggunakan branch: ${defaultBranch.name}\n`);

    // 2. Ambil daftar mitra
    const { data: mitras, error: mitraErr } = await supabase
        .from("profiles")
        .select("id, full_name, referral_code")
        .eq("role", "mitra")
        .limit(5);

    if (mitraErr) {
        console.error("Error fetch mitra:", mitraErr.message);
        return;
    }
    console.log("Mitra yang tersedia:");
    mitras.forEach(m => console.log(`  - ${m.full_name} (${m.id}) | Referral: ${m.referral_code || '-'}`));

    if (mitras.length === 0) {
        console.error("Tidak ada mitra! Buat user mitra dulu.");
        return;
    }

    const mitra = mitras[0];
    console.log(`\nMenggunakan mitra: ${mitra.full_name}\n`);

    // 3. Generate booking code
    const today = new Date();
    const dateStr = String(today.getMonth() + 1).padStart(2, "0") + String(today.getDate()).padStart(2, "0");
    const branchCode = defaultBranch.name.substring(0, 3).toUpperCase();

    // 4. Buat 2 customer dari MITRA (referral)
    const mitraCustomers = [
        {
            customer_name: "Ahmad Ridwan",
            customer_phone: "081234567001",
            car_model: "Toyota Avanza 2021",
            license_plate: "B 1234 XYZ",
            service_date: today.toISOString().split("T")[0],
            service_time: "09:00",
            status: "pending",
            mitra_id: mitra.id,
            branch_id: defaultBranch.id,
            booking_type: "referral",
            booking_code: `BK-${branchCode}-${dateStr}-T01`,
        },
        {
            customer_name: "Siti Nurhaliza",
            customer_phone: "081234567002",
            car_model: "Honda Jazz 2020",
            license_plate: "B 5678 ABC",
            service_date: today.toISOString().split("T")[0],
            service_time: "10:30",
            status: "pending",
            mitra_id: mitra.id,
            branch_id: defaultBranch.id,
            booking_type: "referral",
            booking_code: `BK-${branchCode}-${dateStr}-T02`,
        },
    ];

    // 5. Buat 2 customer DIRECT (walk-in)
    const directCustomers = [
        {
            customer_name: "Budi Prasetyo",
            customer_phone: "081234567003",
            car_model: "Mitsubishi Xpander 2022",
            license_plate: "D 9012 DEF",
            service_date: today.toISOString().split("T")[0],
            service_time: "11:00",
            status: "pending",
            mitra_id: null,
            branch_id: defaultBranch.id,
            booking_type: "direct",
            booking_code: `BK-${branchCode}-${dateStr}-T03`,
        },
        {
            customer_name: "Dewi Kartika",
            customer_phone: "081234567004",
            car_model: "Suzuki Ertiga 2023",
            license_plate: "D 3456 GHI",
            service_date: today.toISOString().split("T")[0],
            service_time: "13:00",
            status: "pending",
            mitra_id: null,
            branch_id: defaultBranch.id,
            booking_type: "direct",
            booking_code: `BK-${branchCode}-${dateStr}-T04`,
        },
    ];

    const allCustomers = [...mitraCustomers, ...directCustomers];

    // 6. Insert ke database
    const { data: inserted, error: insertErr } = await supabase
        .from("bookings")
        .insert(allCustomers)
        .select();

    if (insertErr) {
        console.error("Error insert bookings:", insertErr.message);
        return;
    }

    console.log("✅ Berhasil membuat 4 customer booking!\n");
    console.log("─── CUSTOMER DARI MITRA (Referral) ───");
    inserted.filter(b => b.booking_type === "referral").forEach(b => {
        console.log(`  📋 ${b.customer_name}`);
        console.log(`     📞 ${b.customer_phone}`);
        console.log(`     🚗 ${b.car_model} | ${b.license_plate}`);
        console.log(`     📅 ${b.service_date} ${b.service_time}`);
        console.log(`     🏷️  Kode: ${b.booking_code}`);
        console.log(`     👤 Mitra: ${mitra.full_name}`);
        console.log();
    });

    console.log("─── CUSTOMER DIRECT (Walk-in) ───");
    inserted.filter(b => b.booking_type === "direct").forEach(b => {
        console.log(`  📋 ${b.customer_name}`);
        console.log(`     📞 ${b.customer_phone}`);
        console.log(`     🚗 ${b.car_model} | ${b.license_plate}`);
        console.log(`     📅 ${b.service_date} ${b.service_time}`);
        console.log(`     🏷️  Kode: ${b.booking_code}`);
        console.log();
    });

    console.log(`Branch: ${defaultBranch.name}`);
    console.log("Semua status: pending");
}

main();
