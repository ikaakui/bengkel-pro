import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://bugycrgmbhiuzagzfkio.supabase.co";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ1Z3ljcmdtYmhpdXphZ3pma2lvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjI5MTU2NSwiZXhwIjoyMDg3ODY3NTY1fQ.YW0_rkEhNEuSW9fMNmLdou6bGK6mqvyQgL7UFarbY4I";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
});

async function createOwner() {
    console.log("Membuat akun Owner...\n");

    const { data, error } = await supabase.auth.admin.createUser({
        email: "abidin1190@gmail.com",
        password: "123456",
        email_confirm: true,
        user_metadata: {
            full_name: "Bos bidin",
            role: "owner",
            phone: null,
            referral_code: null,
        },
    });

    if (error) {
        console.error("Gagal membuat akun:", error.message);
        return;
    }

    console.log("Akun Owner berhasil dibuat!");
    console.log("   Email    : abidin1190@gmail.com");
    console.log("   Password : 123456");
    console.log("   Nama     : Bos bidin");
    console.log("   Role     : owner");
    console.log("   User ID  :", data.user.id);
}

createOwner();
