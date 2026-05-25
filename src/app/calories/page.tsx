import { getCalorieEntries } from "@/app/actions/calories";
import CalorieTracker from "@/components/CalorieTracker";

export const metadata = {
  title: "Calories - Gym Tracker",
};

export default async function CaloriesPage() {
  const entries = await getCalorieEntries();

  return <CalorieTracker initialEntries={entries} />;
}
