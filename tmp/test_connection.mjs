// Native fetch available in Node 18+

const url = "https://bugycrgmbhiuzagzfkio.supabase.co/rest/v1/";
const anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ1Z3ljcmdtYmhpdXphZ3pma2lvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyOTE1NjUsImV4cCI6MjA4Nzg2NzU2NX0.daGhpPgnIV99cURXHKdRFokQWK18IvJ4GhZPBWseaYY";

async function testConnection() {
    console.log("Testing connection to Supabase...");
    try {
        const response = await fetch(url + "profiles?select=count", {
            headers: {
                'apikey': anonKey,
                'Authorization': `Bearer ${anonKey}`
            }
        });

        console.log("Status Code:", response.status);
        if (response.ok) {
            console.log("Successfully connected to Supabase!");
            const data = await response.json();
            console.log("Response data:", data);
        } else {
            console.log("Failed to connect. Status Text:", response.statusText);
            const body = await response.text();
            console.log("Response body:", body);
        }
    } catch (error) {
        console.error("Connection error:", error.message);
        if (error.cause) {
            console.error("Cause:", error.cause);
        }
    }
}

testConnection();
