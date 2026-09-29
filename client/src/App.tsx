import DemoBanner from "@/components/DemoBanner";
import { LogCallProvider } from "@/components/LogCallDialog";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { NAV_ITEMS } from "@/lib/nav";
import { SessionProvider, useSession } from "@/lib/session";
import Acknowledge from "@/pages/Acknowledge";
import CaseDetail from "@/pages/CaseDetail";
import Cases from "@/pages/Cases";
import Dashboard from "@/pages/Dashboard";
import NotFound from "@/pages/NotFound";
import PickUser from "@/pages/PickUser";
import Placeholder from "@/pages/Placeholder";
import Styleguide from "@/pages/Styleguide";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";

const BUILT = ["/", "/cases"];

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/cases" component={Cases} />
      <Route path="/cases/:id">
        {params => <CaseDetail key={params.id} id={Number(params.id)} />}
      </Route>
      {/* Screens not built yet */}
      {NAV_ITEMS.filter(item => !BUILT.includes(item.href)).map(item => (
        <Route key={item.href} path={item.href}>
          <Placeholder href={item.href} />
        </Route>
      ))}
      <Route path="/styleguide" component={Styleguide} />
      <Route component={NotFound} />
    </Switch>
  );
}

/** Access gate: acknowledgment first, then the user picker, then the app. */
function Gate() {
  const { acknowledged, user } = useSession();
  if (!acknowledged) return <Acknowledge />;
  if (!user) return <PickUser />;
  return (
    <LogCallProvider>
      <Router />
    </LogCallProvider>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <SessionProvider>
        <TooltipProvider>
          <Toaster />
          <Gate />
          <DemoBanner />
        </TooltipProvider>
      </SessionProvider>
    </ErrorBoundary>
  );
}

export default App;
