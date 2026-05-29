import { Redirect } from 'expo-router';

// The root index just redirects to the landing page.
// The auth-aware redirect logic lives inside each screen.
export default function Index() {
  return <Redirect href="/landing" />;
}
