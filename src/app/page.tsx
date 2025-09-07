import { AppSidebar } from "~/components/app-sidebar";
import { ChartAreaInteractive } from "~/components/chart-area-interactive";
import { DataTable } from "~/components/data-table";
import { SectionCards } from "~/components/section-cards";
import { SiteHeader } from "~/components/site-header";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "~/components/ui/resizable";

export default function Home() {
  return (
    <div className="h-full rounded-xl bg-background m-4">
      <ResizablePanelGroup direction="horizontal" className="h-full">
        <ResizablePanel defaultSize={20}>
          <AppSidebar />
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel defaultSize={80} className="h-full">
          <div className="flex h-full flex-col">
            <SiteHeader />
            <div className="flex flex-1 flex-col">
              <div className="flex flex-col gap-4 p-4 py-4 md:gap-6 md:py-6">
                <SectionCards />
                <div className="px-4 lg:px-6">
                  <ChartAreaInteractive />
                </div>
                <DataTable />
              </div>
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
