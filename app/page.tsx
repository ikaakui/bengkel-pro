import DashboardLayout from "@/components/layout/DashboardLayout";
import ClientDashboardWrapper from "@/components/dashboard/ClientDashboardWrapper";

export default function DashboardPage() {
    return (
        <DashboardLayout>
            <ClientDashboardWrapper />
        </DashboardLayout>
    );
}
