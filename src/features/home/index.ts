// Public entry of the feature: what `app/` routes render. Other features import the module they
// need directly (`@/features/<feature>/hooks/useX`), never this file, to avoid require cycles.

export { AppTabBar } from './components/AppTabBar';
export { HomeScreen } from './screens/HomeScreen';
