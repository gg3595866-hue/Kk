import { Route, Switch, Router as WouterRouter } from 'wouter';
import { AppLayout } from '@/components/layout/AppLayout';
import { Home } from '@/pages/Home';
import { Games } from '@/pages/Games';
import { Casino } from '@/pages/Casino';
import { Slots } from '@/pages/Slots';
import { Live } from '@/pages/Live';
import { TVGames } from '@/pages/TVGames';
import { Line } from '@/pages/Line';
import { Login } from '@/pages/Login';
import { Register } from '@/pages/Register';
import { GamePlay } from '@/pages/GamePlay';

function Router() {
  return (
    <Switch>
      {/* Game play page: full-screen, no shared layout */}
      <Route path="/game/:slug" component={GamePlay} />

      {/* All other pages share the app shell */}
      <Route>
        <AppLayout>
          <Switch>
            <Route path="/" component={Home} />
            <Route path="/games" component={Games} />
            <Route path="/casino" component={Casino} />
            <Route path="/slots" component={Slots} />
            <Route path="/live" component={Live} />
            <Route path="/tvgames" component={TVGames} />
            <Route path="/line" component={Line} />
            <Route path="/login" component={Login} />
            <Route path="/register" component={Register} />
            <Route>
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm uppercase font-bold">
                Page not found
              </div>
            </Route>
          </Switch>
        </AppLayout>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
      <Router />
    </WouterRouter>
  );
}

export default App;
