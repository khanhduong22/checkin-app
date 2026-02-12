import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import RequestListClient from "@/components/requests/RequestListClient";
import RequestsTour from "@/components/requests/RequestsTour";
import TourHelpButton from "@/components/TourHelpButton";

export const dynamic = 'force-dynamic';

export default async function RequestsPage() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) redirect('/login');

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) redirect('/login');

    const requests = await prisma.request.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' }
    });

    // Serialize
    const serializedRequests = requests.map((r: any) => ({
        ...r,
        date: r.date.toISOString(),
        createdAt: r.createdAt.toISOString()
    }));

    return (
        <main className="min-h-screen bg-gray-50/50 p-4 flex justify-center">
            <div className="w-full max-w-3xl">
                 <RequestsTour />
                 <TourHelpButton />
                 <RequestListClient requests={serializedRequests} />
            </div>
        </main>
    );
}
