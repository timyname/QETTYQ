export async function GET() {
  return Response.json(
    { key: process.env.GOOGLE_MAPS_BROWSER_KEY ?? "" },
    { headers: { "cache-control": "public, max-age=300" } },
  );
}
