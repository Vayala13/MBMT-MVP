import DemoBanner from "@/components/DemoBanner";
import { IncomingCallProvider } from "@/components/IncomingCall";
import { LogCallProvider } from "@/components/LogCallDialog";
import { NewTaskProvider } from "@/components/NewTaskDialog";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { MyWorkProvider } from "@/lib/myWork";
import { SessionProvider, useSession } from "@/lib/session";
import Acknowledge from "@/pages/Acknowledge";
import Calendar from "@/pages/Calendar";
import CaseDetail from "@/pages/CaseDetail";
import Cases from "@/pages/Cases";
import Dashboard from "@/pages/Dashboard";
import NotFound from "@/pages/NotFound";
import PickUser from "@/pages/PickUser";
import Styleguide from "@/pages/Styleguide";
import TeamAccess from "@/pages/TeamAccess";
import Templates from "@/pages/Templates";
import Today from "@/pages/Today";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/today" component={Today} />
      <Route path="/calendar" component={Calendar} />
      <Route path="/team" component={TeamAccess} />
      <Route path="/templates" component={Templates} />
      <Route path="/cases" component={Cases} />
      <Route path="/cases/:id">
        {params => <CaseDetail key={params.id} id={Number(params.id)} />}
      </Route>
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
    <MyWorkProvider key={user.id}>
      <LogCallProvider>
        <NewTaskProvider>
          <IncomingCallProvider>
            <Router />
          </IncomingCallProvider>
        </NewTaskProvider>
      </LogCallProvider>
    </MyWorkProvider>
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
