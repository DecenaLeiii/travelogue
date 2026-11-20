type DestinationViews = {
  slug: string;
  name: string;
  views: number;
};

export function buildEngagementChart(destinations: DestinationViews[]) {
  const viewed = destinations.filter((destination) => destination.views > 0).sort((a, b) => b.views - a.views);
  const total = viewed.reduce((sum, destination) => sum + destination.views, 0);
  let cumulative = 0;
  const segments = viewed.map((destination, index) => {
    const start = cumulative / total * 100;
    cumulative += destination.views;
    const end = cumulative / total * 100;
    return {
      ...destination,
      color: `hsl(${Math.round((index * 137.508) % 360)} 68% 45%)`,
      percentage: destination.views / total * 100,
      start,
      end,
    };
  });
  return { segments, total };
}
