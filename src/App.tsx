import React from 'react';
import './App.scss';
import logo from './logo.svg';
import { createBrowserHistory } from 'history';
import Axios from 'axios';
import { Router, Switch, Route } from 'react-router';
import { RecentMatchesPage } from './pages/RecentMatches/RecentMatchesPage';
import { HeroesPage } from 'pages/Heroes/HeroesPage';
import { PeersPage } from 'pages/Peers/PeersPage';

let hist = createBrowserHistory({ basename: '/' });
Axios.defaults.baseURL = "https://api.opendota.com/api/";

function App() {
  return (
    <Router history={hist}>
      <Switch>
        <Route path={process.env.PUBLIC_URL + "/"} component={RecentMatchesPage}/>
        <Route path={process.env.PUBLIC_URL + "/heroes"} component={HeroesPage}/>
        <Route path={process.env.PUBLIC_URL + "/peers"} component={PeersPage}/>
      </Switch>
    </Router>
  );
}

export default App;
