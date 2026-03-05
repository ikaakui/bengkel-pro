import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// Models to try, in order of preference (different models have separate quotas)
const MODELS = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-2.5-pro"];

export async function POST(req: Request) {
    try {
        const supabase = createServerSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { carType, carYear, mileage, issues, description, roadCondition, customerPhone, licensePlate } = await req.json();

        if (!customerPhone || !licensePlate) {
            return NextResponse.json({ error: "Nomor HP dan Plat Nomor wajib diisi." }, { status: 400 });
        }

        // Normalize inputs
        const normalizedPhone = customerPhone.replace(/\D/g, ""); // Remove non-digits
        const normalizedPlate = licensePlate.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();

        // Check for existing analysis in the last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { data: existingUsage, error: checkError } = await supabase
            .from("montir_ai_usage")
            .select("id")
            .eq("partner_id", user.id)
            .eq("customer_phone", normalizedPhone)
            .eq("license_plate", normalizedPlate)
            .gte("created_at", thirtyDaysAgo.toISOString())
            .single();

        if (existingUsage) {
            return NextResponse.json({ error: "Kendaraan pelanggan ini sudah dianalisa dalam 30 hari terakhir." }, { status: 400 });
        }

        if (!process.env.GEMINI_API_KEY) {
            return NextResponse.json({ error: "API Key tidak dikonfigurasi" }, { status: 500 });
        }

        const prompt = `
            Anda adalah montir ahli spesialis kaki-kaki mobil (suspensi & sasis) di Indonesia.
            Analisa masalah mobil berdasarkan data berikut:
            
            - Mobil: ${carType} (${carYear})
            - Kilometer: ${mileage} km
            - Keluhan: ${issues.join(", ")}
            - Detail: ${description || "-"}
            - Kondisi Jalan: ${roadCondition}

            PENTING: Jawab SINGKAT dan PADAT. Jangan bertele-tele.

            Berikan hasil dalam format JSON murni (tanpa markdown, tanpa pembuka/penutup):
            {
                "diagnosis": "Maksimal 2 kalimat pendek. Langsung sebut komponen yang bermasalah dan penyebabnya.",
                "saran": "Maksimal 4 poin saran, pisahkan dengan tanda • (bullet). Contoh: • Ganti ball joint • Cek tie rod. Langsung to the point.",
                "urgensi": "Segera" | "Dalam Waktu Dekat" | "Bisa Ditunda",
                "penjelasan_urgensi": "Maksimal 1 kalimat singkat saja."
            }

            Gunakan bahasa sederhana, langsung ke inti masalah. JANGAN panjang lebar.
        `;

        // Try each model until one works
        let lastError: any = null;
        for (const modelName of MODELS) {
            try {
                console.log(`Trying model: ${modelName}`);
                const model = genAI.getGenerativeModel({ model: modelName });
                const result = await model.generateContent(prompt);
                const response = await result.response;
                const text = response.text();

                // Clean potential markdown from Gemini response
                const cleanJson = text.replace(/```json|```/g, "").trim();
                const parsedResult = JSON.parse(cleanJson);

                // Insert into usage history
                const { error: insertError } = await supabase
                    .from("montir_ai_usage")
                    .insert({
                        partner_id: user.id,
                        customer_phone: normalizedPhone,
                        license_plate: normalizedPlate,
                    });

                if (insertError) {
                    console.error("Failed to log montir ai usage:", insertError);
                    // Decide if you want to fail the whole request or just proceed with warning
                    // Let's proceed because the AI generated something
                }


                return NextResponse.json(parsedResult);
            } catch (modelError: any) {
                console.warn(`Model ${modelName} failed:`, modelError?.message?.substring(0, 100));
                lastError = modelError;
                // If it's a quota error, try the next model
                const msg = modelError?.message || "";
                if (msg.includes("429") || msg.includes("quota") || msg.includes("404") || msg.includes("not found")) {
                    continue;
                }
                // For non-recoverable errors, throw immediately
                throw modelError;
            }
        }

        // All models failed (likely all quota exceeded)
        throw lastError;
    } catch (error: any) {
        console.error("Montir AI Error:", error);
        const message = error?.message || "";
        if (message.includes("429") || message.includes("quota")) {
            return NextResponse.json({ error: "Kuota API Gemini habis untuk semua model. Silakan tunggu beberapa menit lalu coba lagi." }, { status: 429 });
        }
        if (message.includes("401") || message.includes("403") || message.includes("API key")) {
            return NextResponse.json({ error: "API Key tidak valid. Pastikan API Key sudah benar." }, { status: 401 });
        }
        if (message.includes("404")) {
            return NextResponse.json({ error: "Model AI tidak ditemukan. Hubungi admin." }, { status: 404 });
        }
        return NextResponse.json({ error: "Gagal memproses analisa AI" }, { status: 500 });
    }
}
