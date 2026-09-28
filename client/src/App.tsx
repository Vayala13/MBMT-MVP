import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import Placeholder from "@/pages/Placeholder";
import Styleguide from "@/pages/Styleguide";
import { NAV_ITEMS } from "@/lib/nav";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";

function Router() {
  return (
    <Switch>
      {NAV_ITEMS.map(item => (
        <Route key={item.href} path={item.href}>
          <Placeholder href={item.href} />
        </Route>
      ))}
      <Route path="/styleguide" component={Styleguide} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </ErrorBoundary>
  );
}

export default App;
