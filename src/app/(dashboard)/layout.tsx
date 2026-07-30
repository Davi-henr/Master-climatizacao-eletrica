import BottomNav from '@/components/BottomNav';
import TopHeader from '@/components/TopHeader';
import PageTransition from '@/components/PageTransition';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50 pb-20 pt-16">
      <TopHeader />
      <main className="min-h-screen">
        <div className="p-4 sm:p-6 md:p-8 max-w-3xl mx-auto w-full overflow-x-hidden">
          <PageTransition>
            {children}
          </PageTransition>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
