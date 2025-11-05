import { Redirect } from "expo-router";

const StartPage = () => {
  // Redirect directly to MainTabs (the main application)
  return <Redirect href="/MainTabs" />;
};

export default StartPage;
